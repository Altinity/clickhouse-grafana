///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import _ from 'lodash';

import SqlSeries from './sql_series';
import SqlQuery from './sql_query';
import ResponseParser from './response_parser';
import AdhocCtrl from './adhoc';
import Scanner from './scanner';

const adhocFilterVariable = 'adhoc_query_filter';

export class ClickHouseDatasource {
    type: string;
    name: string;
    supportMetrics: boolean;
    url: string;
    directUrl: string;
    basicAuth: any;
    withCredentials: any;
    usePOST: boolean;
    defaultDatabase: string;
    addCorsHeader: boolean;
    responseParser: any;
    adhocCtrl: AdhocCtrl;

    /** @ngInject */
    constructor(instanceSettings,
                private $q,
                private backendSrv,
                private templateSrv) {
        this.type = 'clickhouse';
        this.name = instanceSettings.name;
        this.supportMetrics = true;
        this.responseParser = new ResponseParser(this.$q);
        this.url = instanceSettings.url;
        this.directUrl = instanceSettings.directUrl;
        this.basicAuth = instanceSettings.basicAuth;
        this.withCredentials = instanceSettings.withCredentials;
        this.addCorsHeader = instanceSettings.jsonData.addCorsHeader;
        this.usePOST = instanceSettings.jsonData.usePOST;
        this.defaultDatabase = instanceSettings.jsonData.defaultDatabase || '';
        this.adhocCtrl = new AdhocCtrl(this);
    }

    _request(query: string, requestId?: string) {
        let options: any = {
            url: this.url,
            requestId: requestId,
        };

        if (this.usePOST) {
            options.method = 'POST';
            options.data = query;
        } else {
            options.method = 'GET';
            options.url += '/?query=' + encodeURIComponent(query);
        }

        if (this.basicAuth || this.withCredentials) {
            options.withCredentials = true;
        }

        options.headers = options.headers || {};
        if (this.basicAuth) {
            options.headers.Authorization = this.basicAuth;
        }

        if (this.addCorsHeader) {
            if (this.usePOST) {
                options.url += "?add_http_cors_header=1";
            } else {
                options.url += "&add_http_cors_header=1";
            }
        }

        return this.backendSrv.datasourceRequest(options).then(result => {
            return result.data;
        });
    };

    query(options) {
        const queries = _(options.targets)
            .filter(target => !target.hide && target.query)
            .map(target => this.createQuery(options, target))
            .value();

        // No valid targets, return the empty result to save a round trip.
        if (_.isEmpty(queries)) {
            var d = this.$q.defer();
            d.resolve({data: []});
            return d.promise;
        }

        const allQueryPromise = _.map(queries, query => {
            return this._seriesQuery(query.stmt, query.requestId);
        });

        return this.$q.all(allQueryPromise).then((responses): any => {
            var result = [], i = 0;
            _.each(responses, (response) => {
                const target = options.targets[i];
                const keys = queries[i].keys;

                i++;
                if (!response || !response.rows) {
                    return;
                }

                var sqlSeries = new SqlSeries({
                    series: response.data,
                    meta: response.meta,
                    keys: keys,
                    tillNow: options.rangeRaw.to === 'now',
                    from: SqlQuery.convertTimestamp(options.range.from),
                    to: SqlQuery.convertTimestamp(options.range.to)
                });
                if (target.format === 'table') {
                    _.each(sqlSeries.toTable(), (data) => {
                        result.push(data);
                    });
                } else {
                    _.each(sqlSeries.toTimeSeries(), (data) => {
                        result.push(data);
                    });
                }
            });
            return {data: result};
        });
    };

    createQuery(options, target) {
        const queryModel = new SqlQuery(target, this.templateSrv, options);
        const adhocFilters = this.templateSrv.getAdhocFilters(this.name);
        const stmt = queryModel.replace(options, adhocFilters);

        let keys = [];

        try {
            let queryAST = new Scanner(stmt).toAST();
            keys = queryAST['group by'] || [];
        } catch (err) {
            console.log('AST parser error: ', err)
        }

        return {
            keys: keys,
            requestId: options.panelId + target.refId,
            stmt: stmt,
        };
    }

    annotationQuery(options) {
        if (!options.annotation.query) {
            return this.$q.reject({
                message: 'Query missing in annotation definition',
            });
        }

        const params = Object.assign({
            annotation: {
                dateTimeColDataType: 'time'
            },
            interval: '30s'
        }, options);
        let queryModel;
        let query;

        queryModel = new SqlQuery(params.annotation, this.templateSrv, params);
        queryModel = queryModel.replace(params, []);
        query = queryModel.replace(/(?:\r\n|\r|\n)/g, ' ');
        query += ' FORMAT JSON';

        return this.backendSrv
            .datasourceRequest({
                url: this.url,
                method: 'POST',
                data: query
            })
            .then(result => this.responseParser.transformAnnotationResponse(params, result.data));
    }

    metricFindQuery(query: string, options?: any) {
        let interpolatedQuery;

        try {
            interpolatedQuery = this.templateSrv.replace(query, {}, SqlQuery.interpolateQueryExpr);
        } catch (err) {
            return this.$q.reject(err);
        }

        if (options && options.range) {
            interpolatedQuery = SqlQuery.replaceTimeFilters(interpolatedQuery, options.range);
        }

        // todo(nv): fix request id
        return this._seriesQuery(interpolatedQuery)
            .then(_.curry(this.responseParser.parse)(query));
    };

    testDatasource() {
        return this.metricFindQuery('SELECT 1').then(
            () => {
                return {status: "success", message: "Data source is working", title: "Success"};
            });
    };

    _seriesQuery(query: string, requestId?: string) {
        query = query.replace(/(?:\r\n|\r|\n)/g, ' ');
        query += ' FORMAT JSON';
        return this._request(query, requestId);
    };

    targetContainsTemplate(target) {
        return this.templateSrv.variableExists(target.expr);
    };

    getTagKeys() {
        // check whether variable `adhoc_query_filter` exists to apply additional filtering
        // @see https://github.com/Vertamedia/clickhouse-grafana/issues/75
        // @see https://github.com/grafana/grafana/issues/13109
        let queryFilter = '';
        _.each(this.templateSrv.variables, (v) => {
            if (v.name === adhocFilterVariable) {
                queryFilter = v.query
            }
        });
        return this.adhocCtrl.GetTagKeys(queryFilter);
    }

    getTagValues(options) {
        return this.adhocCtrl.GetTagValues(options);
    }
}
