System.register(["lodash", "test/lib/common", "./../sql_series"], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var lodash_1, common_1, sql_series_1;
    return {
        setters: [
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (common_1_1) {
                common_1 = common_1_1;
            },
            function (sql_series_1_1) {
                sql_series_1 = sql_series_1_1;
            }
        ],
        execute: function () {
            common_1.describe("clickhouse sql series:", function () {
                common_1.describe("SELECT $timeseries response", function () {
                    var response = {
                        "meta": [
                            {
                                "name": "t"
                            },
                            {
                                "name": "good"
                            },
                            {
                                "name": "bad"
                            }
                        ],
                        "data": [
                            {
                                "t": "1485443760000",
                                "good": 26070,
                                "bad": 17
                            },
                            {
                                "t": "1485443820000",
                                "good": 24824,
                                "bad": 12
                            },
                            {
                                "t": "1485443880000",
                                "good": 25268,
                                "bad": 17
                            }
                        ],
                    };
                    var sqlSeries = new sql_series_1.default({
                        series: response.data,
                        meta: response.meta,
                        table: '',
                    });
                    var timeSeries = sqlSeries.getTimeSeries();
                    common_1.it("expects two results", function () {
                        common_1.expect(lodash_1.default.size(timeSeries)).to.be(2);
                    });
                    common_1.it("should get three datapoints", function () {
                        common_1.expect(lodash_1.default.size(timeSeries[0].datapoints)).to.be(3);
                        common_1.expect(lodash_1.default.size(timeSeries[1].datapoints)).to.be(3);
                    });
                });
                common_1.describe("SELECT $columns response", function () {
                    var response = {
                        "meta": [
                            {
                                "name": "t",
                                "type": "UInt64"
                            },
                            {
                                "name": "requests",
                                "type": "Array(Tuple(String, Float64))"
                            }
                        ],
                        "data": [
                            {
                                "t": "1485445140000",
                                "requests": [["Chrome", null], ["Edge", null], ["Firefox", null]]
                            },
                            {
                                "t": "1485445200000",
                                "requests": [["Chrome", 1], ["Edge", 4], ["Firefox", 7]]
                            },
                            {
                                "t": "1485445260000",
                                "requests": [["Chrome", 2], ["Chromium", 5], ["Edge", 8], ["Firefox", 11]]
                            },
                            {
                                "t": "1485445320000",
                                "requests": [["Chrome", 3], ["Chromium", 6], ["Edge", 9], ["Firefox", 12]]
                            }
                        ]
                    };
                    var sqlSeries = new sql_series_1.default({
                        series: response.data,
                        meta: response.meta,
                        table: '',
                    });
                    var timeSeries = sqlSeries.getTimeSeries();
                    common_1.it("expects four results", function () {
                        common_1.expect(lodash_1.default.size(timeSeries)).to.be(4);
                    });
                    common_1.it("should get three datapoints", function () {
                        common_1.expect(lodash_1.default.size(timeSeries[0].datapoints)).to.be(4);
                        common_1.expect(lodash_1.default.size(timeSeries[1].datapoints)).to.be(4);
                        common_1.expect(lodash_1.default.size(timeSeries[2].datapoints)).to.be(4);
                        common_1.expect(lodash_1.default.size(timeSeries[3].datapoints)).to.be(4);
                    });
                });
            });
        }
    };
});
//# sourceMappingURL=datasource_specs.js.map