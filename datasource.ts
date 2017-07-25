///<reference path="../../../headers/common.d.ts" />

import angular from 'angular';
import _ from 'lodash';

import SqlSeries from './sql_series';
import SqlQuery from './sql_query';
import ResponseParser from './response_parser';

/** @ngInject */
export function ClickHouseDatasource(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = 'clickhouse';
    this.name = instanceSettings.name;
    this.supportMetrics = true;
    this.responseParser = new ResponseParser();
    this.url = instanceSettings.url;
    this.addCorsHeader = instanceSettings.jsonData.addCorsHeader;
    this.usePOST = instanceSettings.jsonData.usePOST;

    this._request = function (query) {
        var options: any = {
            url: this.url
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

        return backendSrv.datasourceRequest(options).then(result => {
            return result.data;
        });
    };

    this.query = function (options) {
        let self = this;
        var queries = [], q;

        _.map(options.targets, (target) => {
            if (!target.hide && target.query) {
                var queryModel = new SqlQuery(target, templateSrv, options);
                q = queryModel.replace(options);
                queries.push(q);
            }
        });

        // No valid targets, return the empty result to save a round trip.
        if (_.isEmpty(queries)) {
            var d = $q.defer();
            d.resolve({data: []});
            return d.promise;
        }

        var allQueryPromise = _.map(queries, query => {
            return this._seriesQuery(query);
        });

        return $q.all(allQueryPromise).then((responses): any => {
            var result = [];
            _.each(responses, (response) => {
                if (!response || !response.rows) {
                    return;
                }

                var sqlSeries = new SqlSeries({
                    series: response.data,
                    meta: response.meta,
                    tillNow: options.rangeRaw.to === 'now',
                    from: SqlQuery.convertTimestamp(options.range.from),
                    to: SqlQuery.convertTimestamp(options.range.to)
                });
                _.each(sqlSeries.getTimeSeries(), (data) => {
                    result.push(data);
                });
            });
            return {data: result};
        });
    };

    this.metricFindQuery = function (query) {
        var interpolated;
        try {
            interpolated = templateSrv.replace(query, {}, SqlQuery.interpolateQueryExpr);
        } catch (err) {
            return $q.reject(err);
        }

        return this._seriesQuery(interpolated)
            .then(_.curry(this.responseParser.parse)(query));
    };

    this.testDatasource = function () {
        return this.metricFindQuery('SELECT 1').then(
            () => {
                return {status: "success", message: "Data source is working", title: "Success"};
            });
    };

    this._seriesQuery = function (query) {
        query = query.replace(/(?:\r\n|\r|\n)/g, ' ');
        query += ' FORMAT JSON';
        return this._request(query);
    };

    this.targetContainsTemplate = function(target) {
        return templateSrv.variableExists(target.expr);
    };
}
