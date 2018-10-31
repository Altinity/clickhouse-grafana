import {describe, it, expect} from './lib/common';
import Scanner from '../src/scanner';
import SqlQuery from '../src/sql_query';
import _ from "lodash";

class Case {
    name: string;
    got: string;
    expected: string;

    constructor(name: string, query: string, expected: string, fn: any) {
        this.name = name;
        this.expected = expected;
        let scanner = new Scanner(query);
        this.got = fn(query, scanner.toAST())
    }
}

describe("macros builder:", () => {
    let testCases = [
        new Case(
            "$rate",
            "$rate(countIf(Type = 200) AS good, countIf(Type != 200) AS bad) FROM requests",
            'SELECT t,' +
            ' good/runningDifference(t/1000) goodRate,' +
            ' bad/runningDifference(t/1000) badRate' +
            ' FROM (' +
            ' SELECT $timeSeries AS t,' +
            ' countIf(Type = 200) AS good,' +
            ' countIf(Type != 200) AS bad' +
            ' FROM requests' +
            ' WHERE $timeFilter' +
            ' GROUP BY t' +
            ' ORDER BY t)',
            SqlQuery.rate
        ),
        new Case(
            "$rate negative",
            "$rated(countIf(Type = 200) AS good, countIf(Type != 200) AS bad) FROM requests",
            '$rated(countIf(Type = 200) AS good, countIf(Type != 200) AS bad) FROM requests',
            SqlQuery.rate
        ),
        new Case(
            "$rateColumns",
            "$rateColumns((AppType = '' ? 'undefined' : AppType) type, sum(Hits) hits) " +
            " FROM table_all WHERE Event = 'request' AND (-1 IN ($template) OR col IN ($template)) HAVING hits > $interval",
            'SELECT t,' +
            ' arrayMap(a -> (a.1, a.2/runningDifference( t/1000 )), groupArr)' +
            ' FROM' +
            ' (SELECT t,' +
            ' groupArray((type, hits)) AS groupArr' +
            ' FROM (' +
            ' SELECT $timeSeries AS t,' +
            " (AppType = '' ? 'undefined' : AppType) type," +
            ' sum(Hits) hits' +
            ' FROM table_all' +
            ' WHERE $timeFilter' +
            " AND Event = 'request' AND (-1 IN ($template) OR col IN ($template))" +
            ' GROUP BY t, type' +
            ' HAVING hits > $interval' +
            ' ORDER BY t, type)' +
            ' GROUP BY t' +
            ' ORDER BY t)',
            SqlQuery.rateColumns
        ),
        new Case(
            "$columns",
            "$columns(OSName, count(*) c) FROM requests ANY INNER JOIN oses USING OS",
            'SELECT t,' +
            ' groupArray((OSName, c)) AS groupArr' +
            ' FROM (' +
            ' SELECT $timeSeries AS t,' +
            ' OSName,' +
            ' count(*) c' +
            ' FROM requests' +
            ' ANY INNER JOIN oses USING OS' +
            ' WHERE $timeFilter' +
            ' GROUP BY t,' +
            ' OSName' +
            ' ORDER BY t,' +
            ' OSName)' +
            ' GROUP BY t' +
            ' ORDER BY t',
            SqlQuery.columns
        ),
        new Case(
            "$perSecond",
            "$perSecond(total, amount) FROM requests",
            'SELECT t,' +
            ' if(runningDifference(max_0) < 0, nan, runningDifference(max_0) / runningDifference(t/1000)) AS max_0_Rate,' +
            ' if(runningDifference(max_1) < 0, nan, runningDifference(max_1) / runningDifference(t/1000)) AS max_1_Rate' +
            ' FROM (' +
            ' SELECT $timeSeries AS t,' +
            ' max(total) AS max_0,' +
            ' max(amount) AS max_1' +
            ' FROM requests' +
            ' WHERE $timeFilter' +
            ' GROUP BY t' +
            ' ORDER BY t)',
            SqlQuery.perSecond
        ),
        new Case(
            "$perSecondColumns",
            "$perSecondColumns(type, total) FROM requests where type in ('udp', 'tcp')",
            'SELECT t,' +
            ' groupArray((type, max_0_Rate)) AS groupArr' +
            ' FROM (' +
            ' SELECT t,' +
            ' type,' +
            ' if(runningDifference(max_0) < 0, nan, runningDifference(max_0) / runningDifference(t/1000)) AS max_0_Rate' +
            ' FROM (' +
            ' SELECT $timeSeries AS t,' +
            ' type,' +
            ' max(total) AS max_0' +
            ' FROM requests' +
            ' WHERE $timeFilter' +
            ' AND type in (\'udp\', \'tcp\')' +
            ' GROUP BY t, type' +
            ' ORDER BY type, t' +
            ')' +
            ')' +
            ' GROUP BY t' +
            ' ORDER BY t',
            SqlQuery.perSecondColumns
        )
    ];

    _.each(testCases, (tc) => {
        if (tc.got !== tc.expected) {
            console.log(tc.got);
            console.log(tc.expected)
        }
        describe(tc.name, () => {
            it("expects equality", () => {
                expect(tc.got).to.eql(tc.expected);
            });
        })
    });
});

