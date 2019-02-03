///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
System.register(['lodash', './sql_series', './sql_query', './response_parser', './adhoc', './scanner'], function(exports_1) {
    var lodash_1, sql_series_1, sql_query_1, response_parser_1, adhoc_1, scanner_1;
    var adhocFilterVariable, ClickHouseDatasource;
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
            },
            function (adhoc_1_1) {
                adhoc_1 = adhoc_1_1;
            },
            function (scanner_1_1) {
                scanner_1 = scanner_1_1;
            }],
        execute: function() {
            adhocFilterVariable = 'adhoc_query_filter';
            ClickHouseDatasource = (function () {
                /** @ngInject */
                function ClickHouseDatasource(instanceSettings, $q, backendSrv, templateSrv) {
                    this.$q = $q;
                    this.backendSrv = backendSrv;
                    this.templateSrv = templateSrv;
                    this.type = 'clickhouse';
                    this.name = instanceSettings.name;
                    this.supportMetrics = true;
                    this.responseParser = new response_parser_1.default(this.$q);
                    this.url = instanceSettings.url;
                    this.directUrl = instanceSettings.directUrl;
                    this.basicAuth = instanceSettings.basicAuth;
                    this.withCredentials = instanceSettings.withCredentials;
                    this.addCorsHeader = instanceSettings.jsonData.addCorsHeader;
                    this.usePOST = instanceSettings.jsonData.usePOST;
                    this.defaultDatabase = instanceSettings.jsonData.defaultDatabase || '';
                    this.adhocCtrl = new adhoc_1.default(this);
                }
                ClickHouseDatasource.prototype._request = function (query, requestId) {
                    var options = {
                        url: this.url,
                        requestId: requestId,
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
                    var queries = lodash_1.default(options.targets)
                        .filter(function (target) { return !target.hide && target.query; })
                        .map(function (target) { return _this.createQuery(options, target); })
                        .value();
                    // No valid targets, return the empty result to save a round trip.
                    if (lodash_1.default.isEmpty(queries)) {
                        var d = this.$q.defer();
                        d.resolve({ data: [] });
                        return d.promise;
                    }
                    var allQueryPromise = lodash_1.default.map(queries, function (query) {
                        return _this._seriesQuery(query.stmt, query.requestId);
                    });
                    return this.$q.all(allQueryPromise).then(function (responses) {
                        var result = [], i = 0;
                        lodash_1.default.each(responses, function (response) {
                            var target = options.targets[i];
                            var keys = queries[i].keys;
                            i++;
                            if (!response || !response.rows) {
                                return;
                            }
                            var sqlSeries = new sql_series_1.default({
                                series: response.data,
                                meta: response.meta,
                                keys: keys,
                                tillNow: options.rangeRaw.to === 'now',
                                from: sql_query_1.default.convertTimestamp(options.range.from),
                                to: sql_query_1.default.convertTimestamp(options.range.to)
                            });
                            if (target.format === 'table') {
                                lodash_1.default.each(sqlSeries.toTable(), function (data) {
                                    result.push(data);
                                });
                            }
                            else {
                                lodash_1.default.each(sqlSeries.toTimeSeries(), function (data) {
                                    result.push(data);
                                });
                            }
                        });
                        return { data: result };
                    });
                };
                ;
                ClickHouseDatasource.prototype.createQuery = function (options, target) {
                    var queryModel = new sql_query_1.default(target, this.templateSrv, options);
                    var adhocFilters = this.templateSrv.getAdhocFilters(this.name);
                    var stmt = queryModel.replace(options, adhocFilters);
                    var keys = [];
                    try {
                        var queryAST = new scanner_1.default(stmt).toAST();
                        keys = queryAST['group by'] || [];
                    }
                    catch (err) {
                        console.log('AST parser error: ', err);
                    }
                    return {
                        keys: keys,
                        requestId: options.panelId + target.refId,
                        stmt: stmt,
                    };
                };
                ClickHouseDatasource.prototype.annotationQuery = function (options) {
                    var _this = this;
                    if (!options.annotation.query) {
                        return this.$q.reject({
                            message: 'Query missing in annotation definition',
                        });
                    }
                    var params = Object.assign({
                        annotation: {
                            dateTimeColDataType: 'time'
                        },
                        interval: '30s'
                    }, options);
                    var queryModel;
                    var query;
                    queryModel = new sql_query_1.default(params.annotation, this.templateSrv, params);
                    queryModel = queryModel.replace(params, []);
                    query = queryModel.replace(/(?:\r\n|\r|\n)/g, ' ');
                    query += ' FORMAT JSON';
                    return this.backendSrv
                        .datasourceRequest({
                        url: this.url,
                        method: 'POST',
                        data: query
                    })
                        .then(function (result) { return _this.responseParser.transformAnnotationResponse(params, result.data); });
                };
                ClickHouseDatasource.prototype.metricFindQuery = function (query, options) {
                    var interpolatedQuery;
                    try {
                        interpolatedQuery = this.templateSrv.replace(query, {}, sql_query_1.default.interpolateQueryExpr);
                    }
                    catch (err) {
                        return this.$q.reject(err);
                    }
                    if (options && options.range) {
                        interpolatedQuery = sql_query_1.default.replaceTimeFilters(interpolatedQuery, options.range);
                    }
                    // todo(nv): fix request id
                    return this._seriesQuery(interpolatedQuery)
                        .then(lodash_1.default.curry(this.responseParser.parse)(query));
                };
                ;
                ClickHouseDatasource.prototype.testDatasource = function () {
                    return this.metricFindQuery('SELECT 1').then(function () {
                        return { status: "success", message: "Data source is working", title: "Success" };
                    });
                };
                ;
                ClickHouseDatasource.prototype._seriesQuery = function (query, requestId) {
                    query = query.replace(/(?:\r\n|\r|\n)/g, ' ');
                    query += ' FORMAT JSON';
                    return this._request(query, requestId);
                };
                ;
                ClickHouseDatasource.prototype.targetContainsTemplate = function (target) {
                    return this.templateSrv.variableExists(target.expr);
                };
                ;
                ClickHouseDatasource.prototype.getTagKeys = function () {
                    // check whether variable `adhoc_query_filter` exists to apply additional filtering
                    // @see https://github.com/Vertamedia/clickhouse-grafana/issues/75
                    // @see https://github.com/grafana/grafana/issues/13109
                    var queryFilter = '';
                    lodash_1.default.each(this.templateSrv.variables, function (v) {
                        if (v.name === adhocFilterVariable) {
                            queryFilter = v.query;
                        }
                    });
                    return this.adhocCtrl.GetTagKeys(queryFilter);
                };
                ClickHouseDatasource.prototype.getTagValues = function (options) {
                    return this.adhocCtrl.GetTagValues(options);
                };
                return ClickHouseDatasource;
            })();
            exports_1("ClickHouseDatasource", ClickHouseDatasource);
        }
    }
});
//# sourceMappingURL=datasource.js.map