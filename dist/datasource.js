///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
System.register(['lodash', './sql_series', './sql_query', './response_parser'], function(exports_1) {
    var lodash_1, sql_series_1, sql_query_1, response_parser_1;
    var ClickHouseDatasource;
    return {
        setters:[
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
            }],
        execute: function() {
            ClickHouseDatasource = (function () {
                /** @ngInject */
                function ClickHouseDatasource(instanceSettings, $q, backendSrv, templateSrv) {
                    this.$q = $q;
                    this.backendSrv = backendSrv;
                    this.templateSrv = templateSrv;
                    this.type = 'clickhouse';
                    this.name = instanceSettings.name;
                    this.supportMetrics = true;
                    this.responseParser = new response_parser_1.default();
                    this.url = instanceSettings.url;
                    this.directUrl = instanceSettings.directUrl;
                    this.basicAuth = instanceSettings.basicAuth;
                    this.withCredentials = instanceSettings.withCredentials;
                    this.addCorsHeader = instanceSettings.jsonData.addCorsHeader;
                    this.usePOST = instanceSettings.jsonData.usePOST;
                }
                ClickHouseDatasource.prototype._request = function (query) {
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
                    options.headers = options.headers || {};
                    if (this.basicAuth) {
                        options.headers.Authorization = this.basicAuth;
                    }
                    if (this.addCorsHeader) {
                        if (this.usePOST) {
                            options.url += "?add_http_cors_header=1";
                        }
                        else {
                            options.url += "&add_http_cors_header=1";
                        }
                    }
                    return this.backendSrv.datasourceRequest(options).then(function (result) {
                        return result.data;
                    });
                };
                ;
                ClickHouseDatasource.prototype.query = function (options) {
                    var _this = this;
                    var queries = [], q;
                    lodash_1.default.map(options.targets, function (target) {
                        if (!target.hide && target.query) {
                            var queryModel = new sql_query_1.default(target, _this.templateSrv, options);
                            q = queryModel.replace(options);
                            queries.push(q);
                        }
                    });
                    // No valid targets, return the empty result to save a round trip.
                    if (lodash_1.default.isEmpty(queries)) {
                        var d = this.$q.defer();
                        d.resolve({ data: [] });
                        return d.promise;
                    }
                    var allQueryPromise = lodash_1.default.map(queries, function (query) {
                        return _this._seriesQuery(query);
                    });
                    return this.$q.all(allQueryPromise).then(function (responses) {
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
                ;
                ClickHouseDatasource.prototype.metricFindQuery = function (query) {
                    var interpolated;
                    try {
                        interpolated = this.templateSrv.replace(query, {}, sql_query_1.default.interpolateQueryExpr);
                    }
                    catch (err) {
                        return this.$q.reject(err);
                    }
                    return this._seriesQuery(interpolated)
                        .then(lodash_1.default.curry(this.responseParser.parse)(query));
                };
                ;
                ClickHouseDatasource.prototype.testDatasource = function () {
                    return this.metricFindQuery('SELECT 1').then(function () {
                        return { status: "success", message: "Data source is working", title: "Success" };
                    });
                };
                ;
                ClickHouseDatasource.prototype._seriesQuery = function (query) {
                    query = query.replace(/(?:\r\n|\r|\n)/g, ' ');
                    query += ' FORMAT JSON';
                    return this._request(query);
                };
                ;
                ClickHouseDatasource.prototype.targetContainsTemplate = function (target) {
                    return this.templateSrv.variableExists(target.expr);
                };
                ;
                return ClickHouseDatasource;
            })();
            exports_1("ClickHouseDatasource", ClickHouseDatasource);
        }
    }
});
//# sourceMappingURL=datasource.js.map