///<reference path="../../../headers/common.d.ts" />
System.register(["lodash", "./sql_series", "./sql_query", "./response_parser"], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    /** @ngInject */
    function ClickHouseDatasource(instanceSettings, $q, backendSrv, templateSrv) {
        this.type = 'clickhouse';
        this.name = instanceSettings.name;
        this.supportMetrics = true;
        this.responseParser = new response_parser_1.default();
        this.url = instanceSettings.url;
        this.addCorsHeader = instanceSettings.jsonData.addCorsHeader;
        this.usePOST = instanceSettings.jsonData.usePOST;
        this._request = function (query) {
            var options = {
                url: this.url
            };
            if (this.usePOST) {
                options.method = 'POST';
                options.data = query;
            }
            else {
                options.method = 'GET';
                options.url += '/?query=' + encodeURIComponent(query);
            }
            if (this.basicAuth || this.withCredentials) {
                options.withCredentials = true;
            }
            if (this.basicAuth) {
                options.headers = {
                    "Authorization": this.basicAuth
                };
            }
            return backendSrv.datasourceRequest(options).then(function (result) {
                return result.data;
            });
        };
        this.query = function (options) {
            var _this = this;
            var queries = [], q;
            lodash_1.default.map(options.targets, function (target) {
                if (!target.hide && target.query) {
                    var queryModel = new sql_query_1.default(target, templateSrv, options);
                    q = queryModel.replace(options);
                    queries.push(q);
                }
            });
            // No valid targets, return the empty result to save a round trip.
            if (lodash_1.default.isEmpty(queries)) {
                var d = $q.defer();
                d.resolve({ data: [] });
                return d.promise;
            }
            var allQueryPromise = lodash_1.default.map(queries, function (query) {
                return _this._seriesQuery(query);
            });
            return $q.all(allQueryPromise).then(function (responses) {
                var result = [];
                lodash_1.default.each(responses, function (response) {
                    if (!response || !response.rows) {
                        return;
                    }
                    var sqlSeries = new sql_series_1.default({
                        series: response.data,
                        meta: response.meta,
                        tillNow: options.rangeRaw.to === 'now',
                        from: sql_query_1.default.convertTimestamp(options.range.from),
                        to: sql_query_1.default.convertTimestamp(options.range.to)
                    });
                    lodash_1.default.each(sqlSeries.getTimeSeries(), function (data) {
                        result.push(data);
                    });
                });
                return { data: result };
            });
        };
        this.metricFindQuery = function (query) {
            var interpolated;
            try {
                interpolated = templateSrv.replace(query, {}, sql_query_1.default.interpolateQueryExpr);
            }
            catch (err) {
                return $q.reject(err);
            }
            return this._seriesQuery(interpolated)
                .then(lodash_1.default.curry(this.responseParser.parse)(query));
        };
        this.testDatasource = function () {
            return this.metricFindQuery('SELECT 1').then(function () {
                return { status: "success", message: "Data source is working", title: "Success" };
            });
        };
        this._seriesQuery = function (query) {
            query = query.replace(/(?:\r\n|\r|\n)/g, ' ');
            query += ' FORMAT JSON';
            if (this.addCorsHeader) {
                query += "&add_http_cors_header=1";
            }
            return this._request(query);
        };
        this.targetContainsTemplate = function (target) {
            return templateSrv.variableExists(target.expr);
        };
    }
    exports_1("ClickHouseDatasource", ClickHouseDatasource);
    var lodash_1, sql_series_1, sql_query_1, response_parser_1;
    return {
        setters: [
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (sql_series_1_1) {
                sql_series_1 = sql_series_1_1;
            },
            function (sql_query_1_1) {
                sql_query_1 = sql_query_1_1;
            },
            function (response_parser_1_1) {
                response_parser_1 = response_parser_1_1;
            }
        ],
        execute: function () {///<reference path="../../../headers/common.d.ts" />
        }
    };
});
//# sourceMappingURL=datasource.js.map