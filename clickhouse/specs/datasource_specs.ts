import _ from 'lodash';
import {describe, beforeEach, it, sinon, expect} from 'test/lib/common';
import SqlSeries from './../sql_series';

describe("clickhouse sql series:", () => {
    describe("SELECT $timeseries response", () => {
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
        var timeSeries = sqlSeries.getTimeSeries();
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
        var timeSeries = sqlSeries.getTimeSeries();

        it("expects four results", () => {
            expect(_.size(timeSeries)).to.be(4);
        });

        it("should get three datapoints", () => {
            expect(_.size(timeSeries[0].datapoints)).to.be(3);
            expect(_.size(timeSeries[1].datapoints)).to.be(3);
            expect(_.size(timeSeries[2].datapoints)).to.be(3);
            expect(_.size(timeSeries[3].datapoints)).to.be(3);
        });
    });

});
