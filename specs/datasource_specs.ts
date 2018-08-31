import { describe, it, expect } from './lib/common';
import _ from 'lodash';
import SqlSeries from '../src/sql_series';
import AdhocCtrl from "../src/adhoc";
import ResponseParser from "../src/response_parser";

describe("clickhouse sql series:", () => {
    describe("SELECT $timeseries response WHERE $adhoc = 1", () => {
        var response = {
            "meta":
            [
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
            "data":
            [
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

        var sqlSeries = new SqlSeries({
            series: response.data,
            meta: response.meta,
            table: '',
        });
        var timeSeries = sqlSeries.toTimeSeries();
        it("expects two results", () => {
            expect(_.size(timeSeries)).to.be(2);
        });

        it("should get three datapoints", () => {
            expect(_.size(timeSeries[0].datapoints)).to.be(3);
            expect(_.size(timeSeries[1].datapoints)).to.be(3);
        });
    });

    describe("SELECT $columns response", () => {
        var response = {
            "meta":
                [
                    {
                        "name": "t",
                        "type": "UInt64"
                    },
                    {
                        "name": "requests",
                        "type": "Array(Tuple(String, Float64))"
                    }
                ],

            "data":
                [
                    {
                        "t": "1485445140000",
                        "requests": [["Chrome",null],["Edge",null],["Firefox",null]]
                    },
                    {
                        "t": "1485445200000",
                        "requests": [["Chrome",1],["Edge",4],["Firefox",7]]
                    },
                    {
                        "t": "1485445260000",
                        "requests": [["Chrome",2],["Chromium",5],["Edge",8],["Firefox",11]]
                    },
                    {
                        "t": "1485445320000",
                        "requests": [["Chrome",3],["Chromium",6],["Edge",9],["Firefox",12]]
                    }
                ]
        };

        var sqlSeries = new SqlSeries({
            series: response.data,
            meta: response.meta,
            table: '',
        });
        var timeSeries = sqlSeries.toTimeSeries();

        it("expects four results", () => {
            expect(_.size(timeSeries)).to.be(4);
        });

        it("should get three datapoints", () => {
            expect(_.size(timeSeries[0].datapoints)).to.be(4);
            expect(_.size(timeSeries[1].datapoints)).to.be(4);
            expect(_.size(timeSeries[2].datapoints)).to.be(4);
            expect(_.size(timeSeries[3].datapoints)).to.be(4);
        });
    });

    describe("When performing ad-hoc query", () => {
        var response = {
            "meta":
                [
                    {
                        "name": "database",
                        "type": "String"
                    },
                    {
                        "name": "table",
                        "type": "String"
                    },
                    {
                        "name": "name",
                        "type": "String"
                    },
                    {
                        "name": "type",
                        "type": "String"
                    }
                ],
            "data":
                [
                    {
                        "database": "default",
                        "table": "requests",
                        "name": "Event",
                        "type": "Enum8('VIEWS' = 1, 'CLICKS' = 2)"
                    },
                    {
                        "database": "default",
                        "table": "requests",
                        "name": "UserID",
                        "type": "UInt32"
                    },
                    {
                        "database": "default",
                        "table": "requests",
                        "name": "URL",
                        "type": "String"
                    }
                ],

            "rows": 3
        };

        let rp = new ResponseParser(this.$q);
        let adhocCtrl = new AdhocCtrl({defaultDatabase: "default"});
        it('should be inited', function () {
            expect(adhocCtrl.query).to.be('SELECT database, table, name, type FROM system.columns WHERE database = \'default\' AND database != \'system\' ORDER BY database, table');
            expect(adhocCtrl.datasource.defaultDatabase).to.be('default');
        });

        let data = rp.parse("", response);
        adhocCtrl.processResponse(data);
        it('should return adhoc filter list', function() {
            let results = adhocCtrl.tagKeys;
            expect(results.length).to.be(6);
            expect(results[0].text).to.be('requests.Event');
            expect(results[0].value).to.be('Event');

            expect(results[1].text).to.be('requests.UserID');
            expect(results[1].value).to.be('UserID');

            expect(results[2].text).to.be('requests.URL');
            expect(results[2].value).to.be('URL');

            expect(results[3].text).to.be('Event');
            expect(results[3].value).to.be('Event');

            expect(results[4].text).to.be('UserID');
            expect(results[4].value).to.be('UserID');

            expect(results[5].text).to.be('URL');
            expect(results[5].value).to.be('URL');
        });
    });


});
