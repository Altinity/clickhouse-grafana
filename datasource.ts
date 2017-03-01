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

    this._request = function (query) {
        var options: any = {
            method: 'GET',
            url: this.url + query,
        };

        if (this.basicAuth || this.withCredentials) {
            options.withCredentials = true;
        }
        if (this.basicAuth) {
            options.headers = {
                "Authorization": this.basicAuth
            };
        }

        return backendSrv.datasourceRequest(options).then(result => {
            return result.data;
        });
    };

    this.query = function (options) {
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
            _.each(responses, (response, index) => {
                if (!response || !response.rows) {
                    return;
                }
                var target = options.targets[index];
                var sqlSeries = new SqlSeries({
                    series: response.data,
                    meta: response.meta,
                    table: target.table,
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
        query = query.replace(/(?:\r\n|\r|\n|  )/g, ' ');
        query = encodeURIComponent(query) + '%20FORMAT%20JSON';
        if (this.addCorsHeader) {
            query += "&add_http_cors_header=1";
        }
        return this._request('/?query=' + query);
    };

    this.targetContainsTemplate = function(target) {
        return templateSrv.variableExists(target.expr);
    };
}
