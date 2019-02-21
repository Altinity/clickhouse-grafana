import { describe, expect, it } from './lib/common';
import SqlQuery, { TimeRange } from '../src/sql_query';
import moment from "moment";
import { RawTimeRangeStub } from './lib/raw_time_range_stub';

describe("Query SELECT with $timeFilterByColumn and range with from and to:", () => {
  const query = "SELECT * FROM table WHERE $timeFilterByColumn(column_name)";
  const range: TimeRange = {
    from: moment('2018-12-24 01:02:03Z'),
    to: moment('2018-12-31 23:59:59Z'),
    raw: RawTimeRangeStub,
  };

  it("gets replaced with BETWEEN filter", () => {
    expect(SqlQuery.replaceTimeFilters(query, range, 'DATETIME')).to.be('SELECT * FROM table WHERE column_name BETWEEN toDateTime(1545613323) AND toDateTime(1546300799)');
  });
});

describe("Query SELECT with $timeFilterByColumn and range with from", () => {
  const query = "SELECT * FROM table WHERE $timeFilterByColumn(column_name)";
  const range: TimeRange = {
    from: moment('2018-12-24 01:02:03Z'),
    to: moment(),
    raw: {
      from: moment('2018-12-24 01:02:03Z'),
      to: 'now',
    },
  };

  it("gets replaced with >= filter", () => {
    expect(SqlQuery.replaceTimeFilters(query, range, 'DATETIME')).to.be('SELECT * FROM table WHERE column_name >= toDateTime(1545613323)');
  });
});

describe("$unescape", () => {
    const query = "SELECT $unescape('count()'), $unescape('if(runningDifference(max_0) < 0, nan, runningDifference(max_0) / runningDifference(t/1000)) AS max_0_Rate') FROM requests WHERE $unescape('client_ID') = 5";
    it("gets replaced with >= filter", () => {
        expect(SqlQuery.unescape(query)).to.be('SELECT count(), if(runningDifference(max_0) < 0, nan, runningDifference(max_0) / runningDifference(t/1000)) AS max_0_Rate FROM requests WHERE client_ID = 5');
    });
});