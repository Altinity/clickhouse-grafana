import { toFlamegraph } from '../datasource/sql-series/toFlamegraph';
import { toLogs } from '../datasource/sql-series/toLogs';
import { toTable } from '../datasource/sql-series/toTable';
import { toTimeSeries } from '../datasource/sql-series/toTimeSeries';
import { toTraces } from '../datasource/sql-series/toTraces';

describe('sql-series. toFlamegraph unit tests', () => {
  it('should transform input series into flamegraph data correctly', () => {
    const inputSeries = [
      { label: 'A', level: 1, value: '10', self: 5 },
      { label: 'B', level: 2, value: '20', self: 15 },
      { label: 'C', level: 1, value: '30', self: 10 },
      { label: 'D', level: 0, value: '40', self: 20 }, // Should be filtered out
    ];

    const expectedOutput = [
      {
        fields: [
          { name: 'label', type: 'string', values: ['all', 'A', 'B', 'C'], config: {} },
          { name: 'level', type: 'number', values: [0, 1, 2, 1], config: {} },
          { name: 'value', type: 'number', values: [40, 10, 20, 30], config: {} },
          { name: 'self', type: 'number', values: [0, 5, 15, 10], config: {} },
        ],
        length: 4,
      },
    ];

    const result = toFlamegraph(inputSeries);
    expect(result).toEqual(expectedOutput);
  });

  it('should handle empty input series', () => {
    const inputSeries: any[] = [];
    const expectedOutput = [
      {
        fields: [
          { name: 'label', type: 'string', values: ['all'], config: {} },
          { name: 'level', type: 'number', values: [0], config: {} },
          { name: 'value', type: 'number', values: [0], config: {} },
          { name: 'self', type: 'number', values: [0], config: {} },
        ],
        length: 0,
      },
    ];

    const result = toFlamegraph(inputSeries);
    expect(result).toEqual(expectedOutput);
  });

  it('should transform invalid level', () => {
    const inputSeries = [
      { label: 'A', level: 'invalid', value: '10', self: 5 }, // Invalid level
    ];

    const expectedOutput = [
      {
        fields: [
          {
            name: 'label',
            type: 'string',
            values: ['all', 'A'],
            config: {},
          },
          {
            name: 'level',
            type: 'number',
            values: [0, NaN],
            config: {},
          },
          {
            name: 'value',
            type: 'number',
            values: [0, 10],
            config: {},
          },
          {
            name: 'self',
            type: 'number',
            values: [0, 5],
            config: {},
          },
        ],
        length: 1,
      },
    ];

    const result = toFlamegraph(inputSeries);
    expect(result).toEqual(expectedOutput);
  });
});

describe('sql-series. toLogs unit tests', () => {
  it('should return an empty array when series is empty', () => {
    const input = { series: [], meta: [] };
    const result = toLogs(input);
    expect(result).toEqual([]);
  });

  it('should correctly identify the message field', () => {
    const input = {
      series: [{ id: 1, content: 'Log message' }],
      meta: [
        { name: 'content', type: 'String' },
        { name: 'level', type: 'String' },
      ],
    };
    const result = toLogs(input);
    expect(result[0].fields.length).toBe(2);
    expect(result[0].fields[0].name).toBe('body');
  });

  it('should handle Nullable types correctly', () => {
    const input = {
      series: [{ id: 1, timestamp: '2023-01-01T00:00:00Z', level: 'info' }],
      meta: [
        { name: 'timestamp', type: 'Nullable(DateTime)' },
        { name: 'level', type: 'String' },
      ],
    };
    const result = toLogs(input);
    expect(result.length).toBe(1);
    expect(result[0].fields.length).toBe(4);
    expect(result[0].fields[0].name).toBe('timestamp');
    expect(result[0].fields[1].name).toBe('severity');
  });

  it('should add label fields correctly', () => {
    const input = {
      series: [{ message: 'test', level: 'info', user: 'user1', timestamp: '2024-17-10 14:15:00' }],
      meta: [
        { name: 'message', type: 'String' },
        { name: 'level', type: 'String' },
        { name: 'user', type: 'String' },
        { name: 'timestamp', type: 'DateTime' },
      ],
    };
    const result = toLogs(input);
    expect(result.length).toBe(1);
    expect(result[0].fields.length).toBe(4); // [message + labels], level, timestamp
    const message = result[0].fields.find((field) => {
      return field.name === 'labels';
    });
    expect(message?.values[0].user).toBe('user1'); // user
  });

  it('should convert time with time zone to UTC', () => {
    const input = {
      series: [{ id: 1, timestamp: '2024-01-01T05:00:00', level: 'info' }],
      meta: [
        { name: 'timestamp', type: "DateTime('Asia/Yekaterinburg'')" },
        { name: 'level', type: 'String' },
      ],
    };
    const result = toLogs(input);
    expect(result.length).toBe(1);
  });
});

describe('sql-series. toTable unit tests', () => {
  it('should return an empty array for empty series', () => {
    const input = { series: [], meta: [] };
    expect(toTable(input)).toEqual([]);
  });

  it('should construct a table with columns and rows from valid input', () => {
    const input = {
      series: [{ col1: 'value1', col2: 2 }],
      meta: [
        { name: 'col1', type: 'String' },
        { name: 'col2', type: 'UInt32' },
      ],
    };

    const expectedOutput = [
      {
        columns: [
          { text: 'col1', type: 'string' },
          { text: 'col2', type: 'number' },
        ],
        rows: [['value1', 2]],
        type: 'table',
      },
    ];

    expect(toTable(input)).toEqual(expectedOutput);
  });

  it('should handle multiple rows correctly', () => {
    const input = {
      series: [
        { col1: 'value1', col2: 2 },
        { col1: 'value2', col2: 3 },
      ],
      meta: [
        { name: 'col1', type: 'String' },
        { name: 'col2', type: 'UInt32' },
      ],
    };

    const expectedOutput = [
      {
        columns: [
          { text: 'col1', type: 'string' },
          { text: 'col2', type: 'number' },
        ],
        rows: [
          ['value1', 2],
          ['value2', 3],
        ],
        type: 'table',
      },
    ];

    expect(toTable(input)).toEqual(expectedOutput);
  });

  it('should handle null values correctly', () => {
    const input = {
      series: [{ col1: null, col2: 2 }],
      meta: [
        { name: 'col1', type: 'String' },
        { name: 'col2', type: 'UInt32' },
      ],
    };

    const expectedOutput = [
      {
        columns: [
          { text: 'col1', type: 'string' },
          { text: 'col2', type: 'number' },
        ],
        rows: [[null, 2]],
        type: 'table',
      },
    ];

    expect(toTable(input)).toEqual(expectedOutput);
  });

  it('should handle objects by converting them to JSON strings', () => {
    const input = {
      series: [{ col1: { key: 'value' }, col2: 2 }],
      meta: [
        { name: 'col1', type: 'String' },
        { name: 'col2', type: 'UInt32' },
      ],
    };

    const expectedOutput = [
      {
        columns: [
          { text: 'col1', type: 'string' },
          { text: 'col2', type: 'number' },
        ],
        rows: [[JSON.stringify({ key: 'value' }), 2]],
        type: 'table',
      },
    ];

    expect(toTable(input)).toEqual(expectedOutput);
  });

  it('should handle mixed types correctly', () => {
    const input = {
      series: [
        { col1: 'text', col2: 10 },
        { col1: 123, col2: '456' },
      ],
      meta: [
        { name: 'col1', type: 'String' },
        { name: 'col2', type: 'UInt32' },
      ],
    };

    const expectedOutput = [
      {
        columns: [
          { text: 'col1', type: 'string' },
          { text: 'col2', type: 'number' },
        ],
        rows: [
          ['text', 10],
          [123, 456], // '456' should be converted to number
        ],
        type: 'table',
      },
    ];

    expect(toTable(input)).toEqual(expectedOutput);
  });

  // Issue #832: UInt64 precision tests
  // Note: Go backend now sends UInt64/Int64 as strings to preserve precision
  it('should preserve UInt64 values as strings', () => {
    const input = {
      series: [{ id: '1234567890', value: '9007199254740991' }],
      meta: [
        { name: 'id', type: 'UInt64' },
        { name: 'value', type: 'UInt64' },
      ],
    };

    const result = toTable(input);
    // UInt64 values are kept as strings to preserve precision
    expect(result[0].rows[0][0]).toBe('1234567890');
    expect(result[0].rows[0][1]).toBe('9007199254740991');
  });

  it('should preserve precision for large UInt64 values as strings', () => {
    const input = {
      series: [{ id: '11189782786942380395' }],
      meta: [{ name: 'id', type: 'UInt64' }],
    };

    const result = toTable(input);
    // Value exceeds MAX_SAFE_INTEGER, should remain as string
    expect(result[0].rows[0][0]).toBe('11189782786942380395');
  });

  it('should preserve precision for Nullable(UInt64) values', () => {
    const input = {
      series: [
        { id: '11189782786942380395' },
        { id: null },
        { id: '123' },
      ],
      meta: [{ name: 'id', type: 'Nullable(UInt64)' }],
    };

    const result = toTable(input);
    expect(result[0].rows[0][0]).toBe('11189782786942380395'); // String preserved
    expect(result[0].rows[1][0]).toBeNull(); // Null preserved
    expect(result[0].rows[2][0]).toBe('123'); // String preserved
  });

  it('should preserve precision for Int64 values', () => {
    const input = {
      series: [
        { value: '-9223372036854775808' }, // Min Int64
        { value: '-123' },
      ],
      meta: [{ name: 'value', type: 'Int64' }],
    };

    const result = toTable(input);
    expect(result[0].rows[0][0]).toBe('-9223372036854775808'); // String preserved
    expect(result[0].rows[1][0]).toBe('-123'); // String preserved
  });
});

describe('sql-series. toTimeSeries unit tests', () => {
  const selfMock = {
    series: [{}],
    meta: [{}],
    keys: [{}],
    from: 0,
    to: 1000,
    tillNow: false,
  };

  it('should return an empty array when there are no series', () => {
    const result = toTimeSeries(true, true, selfMock);
    expect(result).toEqual([]);
  });

  it('should handle a single data point correctly', () => {
    selfMock.series = [{ time: 1000, value: 10 }];
    selfMock.meta = [
      { name: 'time', type: 'UInt32' },
      { name: 'value', type: 'UInt64' },
    ];
    selfMock.keys = [];

    const result = toTimeSeries(true, true, selfMock);
    expect(result).toEqual([{"fields": [{"config": {"links": []}, "name": "time", "type": "time", "values": [1000]}, {"config": {"links": []}, "name": "value", "values": [10]}], "length": 1, "refId": undefined}]);
  });

  it('should handle multiple data points correctly', () => {
    selfMock.series = [
      { time: 1000, value: 10 },
      { time: 2000, value: 20 },
    ];
    selfMock.meta = [
      { name: 'time', type: 'UInt32' },
      { name: 'value', type: 'UInt64' },
    ];
    selfMock.keys = [];

    const result = toTimeSeries(true, true, selfMock);
    expect(result).toEqual([{"fields": [{"config": {"links": []}, "name": "time", "type": "time", "values": [1000, 2000]}, {"config": {"links": []}, "name": "value", "values": [10, 20]}], "length": 2, "refId": undefined}]);
  });

  it('should extrapolate data points when required', () => {
    let selfMock = {"from": 0, "keys": [], "meta": [{"name": "time", "type": "UInt32"}, {"name": "value", "type": "UInt64"}], "series": [{"time": 1736332351828, "value": 32}, {"time": 1736332336828, "value": 34}, {"time": 1736332321828, "value": 36}, {"time": 1736332306828, "value": 38}, {"time": 1736332291828, "value": 40}, {"time": 1736332276828, "value": 42}, {"time": 1736332261828, "value": 44}, {"time": 1736332246828, "value": 46}, {"time": 1736332231828, "value": 48}, {"time": 1736332216828, "value": 50}], "tillNow": true, "to": 1000}
    const result = toTimeSeries(true, true, selfMock);
    expect(result).toEqual([{"fields": [{"config": {"links": []}, "name": "time", "type": "time", "values": [1736332351828, 1736332336828, 1736332321828, 1736332306828, 1736332291828, 1736332276828, 1736332261828, 1736332246828, 1736332231828, 1736332216828]}, {"config": {"links": []}, "name": "value", "values": [32, 34, 36, 38, 40, 42, 44, 46, 48, 48.2]}], "length": 10, "refId": undefined}]);

    selfMock = {"from": 0, "keys": [], "meta": [{"name": "time", "type": "UInt32"}, {"name": "value", "type": "UInt64"}], "series": [{"time": 1736332580592, "value": 52}, {"time": 1736332550592, "value": 54}, {"time": 1736332520592, "value": 56}], "tillNow": true, "to": 1000}
    const resultNonExtrapolated = toTimeSeries(true, true, selfMock);
    expect(resultNonExtrapolated).toEqual([{"fields": [{"config": {"links": []}, "name": "time", "type": "time", "values": [1736332580592, 1736332550592, 1736332520592]}, {"config": {"links": []}, "name": "value", "values": [52, 54, 56]}], "length": 3, "refId": undefined}]);
  });

  it('should handle composite keys correctly with nullifySparse=true', () => {
    selfMock.series = [
      { time: 1000, category: 'A', value: 10 },
      { time: 2000, category: 'B', value: 20 },
    ];
    selfMock.meta = [
      { name: 'time', type: 'UInt32' },
      { name: 'category', type: 'LowCardinality(Nullable(String))' },
      { name: 'value', type: 'Nullable(UInt64)' },
    ];
    selfMock.keys = ['category'];
    selfMock.tillNow = false;

    const result = toTimeSeries(true, true, selfMock);
    expect(result).toEqual([{"fields": [{"config": {"links": []}, "name": "time", "type": "time", "values": [1000]}, {"config": {"links": []}, "name": "A", "values": [10]}], "length": 1, "refId": undefined}, {"fields": [{"config": {"links": []}, "name": "time", "type": "time", "values": [1000, 2000]}, {"config": {"links": []}, "name": "B", "values": [null, 20]}], "length": 2, "refId": undefined}])
  });


  it('should handle null values correctly', () => {
    selfMock.series = [
      { time: 1000, value: null },
      { time: 2000, value: 20 },
    ];
    selfMock.meta = [
      { name: 'time', type: 'UInt32' },
      { name: 'value', type: 'Nullable(Float64))' },
    ];
    selfMock.keys = [];

    const result = toTimeSeries(false, true, selfMock);
    expect(result).toEqual([{"fields": [{"config": {"links": []}, "name": "time", "type": "time", "values": [1000, 2000]}, {"config": {"links": []}, "name": "value", "values": [null, 20]}], "length": 2, "refId": undefined}]);
  });

  // Issue #832: UInt64 precision tests for time series
  it('should preserve precision for safe UInt64 values in time series', () => {
    const input = {
      series: [
        { time: 1000, value: '1234567890' },
        { time: 2000, value: '9007199254740991' }, // MAX_SAFE_INTEGER
      ],
      meta: [
        { name: 'time', type: 'UInt32' },
        { name: 'value', type: 'UInt64' },
      ],
      keys: [],
      from: 0,
      to: 3000,
      tillNow: false,
    };

    const result = toTimeSeries(false, false, input);
    expect(result[0].fields[1].values[0]).toBe(1234567890); // Safe integer -> number
    expect(result[0].fields[1].values[1]).toBe(9007199254740991); // MAX_SAFE_INTEGER -> number
  });

  it('should preserve precision for unsafe UInt64 values as strings in time series', () => {
    const input = {
      series: [
        { time: 1000, value: '11189782786942380395' }, // Issue #832 value
        { time: 2000, value: '18446744073709551615' }, // Max UInt64
      ],
      meta: [
        { name: 'time', type: 'UInt32' },
        { name: 'value', type: 'UInt64' },
      ],
      keys: [],
      from: 0,
      to: 3000,
      tillNow: false,
    };

    const result = toTimeSeries(false, false, input);
    // Unsafe integers should be kept as strings to preserve precision
    expect(result[0].fields[1].values[0]).toBe('11189782786942380395');
    expect(result[0].fields[1].values[1]).toBe('18446744073709551615');
  });

  it('should handle Array(Tuple(String, UInt64)) from $columns macro', () => {
    const input = {
      series: [
        { time: 1000, requests: [['Chrome', '11189782786942380395'], ['Firefox', '123']] },
        { time: 2000, requests: [['Chrome', '9007199254740992'], ['Firefox', '456']] },
      ],
      meta: [
        { name: 'time', type: 'UInt32' },
        { name: 'requests', type: 'Array(Tuple(String, UInt64))' },
      ],
      keys: [],
      from: 0,
      to: 3000,
      tillNow: false,
    };

    const result = toTimeSeries(false, false, input);

    // Should have separate series for Chrome and Firefox
    expect(result.length).toBe(2);

    // Find Chrome series
    const chromeSeries = result.find((s: any) => s.fields[1].name === 'Chrome');
    expect(chromeSeries).toBeDefined();
    // Large UInt64 should be string, small should be number
    expect(chromeSeries.fields[1].values[0]).toBe('11189782786942380395');
    expect(chromeSeries.fields[1].values[1]).toBe('9007199254740992'); // Just above MAX_SAFE_INTEGER

    // Find Firefox series
    const firefoxSeries = result.find((s: any) => s.fields[1].name === 'Firefox');
    expect(firefoxSeries).toBeDefined();
    expect(firefoxSeries.fields[1].values[0]).toBe(123); // Safe integer -> number
    expect(firefoxSeries.fields[1].values[1]).toBe(456); // Safe integer -> number
  });

  it('should handle Nullable(UInt64) in time series', () => {
    const input = {
      series: [
        { time: 1000, value: '11189782786942380395' },
        { time: 2000, value: null },
        { time: 3000, value: '42' },
      ],
      meta: [
        { name: 'time', type: 'UInt32' },
        { name: 'value', type: 'Nullable(UInt64)' },
      ],
      keys: [],
      from: 0,
      to: 4000,
      tillNow: false,
    };

    const result = toTimeSeries(false, false, input);
    expect(result[0].fields[1].values[0]).toBe('11189782786942380395'); // Large -> string
    expect(result[0].fields[1].values[1]).toBe(null); // Null preserved
    expect(result[0].fields[1].values[2]).toBe(42); // Safe -> number
  });

  it('should not leak DateTime time column into data values when keys are present (issue #500 lttb regression)', () => {
    // Reproduces the bug where $lttb queries with 3 fields (DateTime time, String category, numeric value)
    // would leak the time column as a string data value, breaking visualization.
    // The root cause was that the time column was only skipped when keys.length === 0,
    // but when GROUP BY keys existed (e.g. category), the time column was processed as data.
    // Before the issue #832 fix, the string filter accidentally removed these leaked values.
    // After #832 allowed strings through the filter, the leaked DateTime strings broke charts.
    const input = {
      series: [
        { event_time: '2024-01-15 10:00:00', category: 'web', requests: 150 },
        { event_time: '2024-01-15 10:00:00', category: 'api', requests: 300 },
        { event_time: '2024-01-15 11:00:00', category: 'web', requests: 200 },
        { event_time: '2024-01-15 11:00:00', category: 'api', requests: 350 },
      ],
      meta: [
        { name: 'event_time', type: 'DateTime' },
        { name: 'category', type: 'String' },
        { name: 'requests', type: 'Float64' },
      ],
      keys: ['category'],
      refId: 'A',
      tillNow: false,
    };

    const result = toTimeSeries(false, false, input);

    // Should have 2 series: web and api
    expect(result.length).toBe(2);

    // Each series should only contain numeric request values, NOT DateTime strings
    result.forEach((series: any) => {
      const values = series.fields[1].values;
      values.forEach((v: any) => {
        // Values must be numbers or null, never DateTime strings like "2024-01-15 10:00:00"
        expect(v === null || typeof v === 'number').toBe(true);
      });
    });

    // Verify actual data values
    const webSeries = result.find((s: any) => s.fields[1].name === 'web');
    const apiSeries = result.find((s: any) => s.fields[1].name === 'api');
    expect(webSeries).toBeDefined();
    expect(apiSeries).toBeDefined();
    expect(webSeries!.fields[1].values).toEqual([150, 200]);
    expect(apiSeries!.fields[1].values).toEqual([300, 350]);
  });

  it('should not leak UInt32 time column into data values when keys are present', () => {
    // Same issue but with numeric (UInt32) timestamp instead of DateTime string.
    // The time column value should not appear as a data point even when it is numeric.
    const input = {
      series: [
        { t: 1705312800, category: 'web', value: 100 },
        { t: 1705312800, category: 'api', value: 200 },
        { t: 1705316400, category: 'web', value: 150 },
        { t: 1705316400, category: 'api', value: 250 },
      ],
      meta: [
        { name: 't', type: 'UInt32' },
        { name: 'category', type: 'String' },
        { name: 'value', type: 'Float64' },
      ],
      keys: ['category'],
      refId: 'A',
      tillNow: false,
    };

    const result = toTimeSeries(false, false, input);
    expect(result.length).toBe(2);

    const webSeries = result.find((s: any) => s.fields[1].name === 'web');
    const apiSeries = result.find((s: any) => s.fields[1].name === 'api');
    expect(webSeries).toBeDefined();
    expect(apiSeries).toBeDefined();
    // Only 'value' column data, no 't' column leaking
    expect(webSeries!.fields[1].values).toEqual([100, 150]);
    expect(apiSeries!.fields[1].values).toEqual([200, 250]);
    expect(webSeries!.fields[0].values).toEqual([1705312800, 1705316400]);
    expect(apiSeries!.fields[0].values).toEqual([1705312800, 1705316400]);
  });
});

describe('sql-series. toTraces unit tests', () => {
  const meta = [{ name: 'startTime', type: 'UInt32' }];

  it('should group spans by traceID into separate DataFrames', () => {
    const inputData = [
      {
        traceID: '1',
        spanID: '1-1',
        parentSpanID: null,
        serviceName: 'serviceA',
        startTime: 1633072800000,
        duration: 100,
        operationName: 'operationA',
        tags: [{ key1: 'value1' }],
        serviceTags: [{ tag1: 'value1' }],
      },
      {
        traceID: '2',
        spanID: '2-1',
        parentSpanID: '1-1',
        serviceName: 'serviceB',
        startTime: 1633072860000,
        duration: 200,
        operationName: 'operationB',
        tags: [{ key2: 'value2' }],
        serviceTags: [{ tag2: 'value2' }],
      },
    ];

    const result = toTraces(inputData, meta);

    // Two different traceIDs => two DataFrames
    expect(result).toHaveLength(2);
    expect(result[0].fields).toHaveLength(9);
    expect(result[1].fields).toHaveLength(9);

    const traceIDField0 = result[0].fields.find((field) => field.name === 'traceID');
    expect(traceIDField0?.values).toEqual(['1']);

    const traceIDField1 = result[1].fields.find((field) => field.name === 'traceID');
    expect(traceIDField1?.values).toEqual(['2']);

    const startTimeField0 = result[0].fields.find((field) => field.name === 'startTime');
    expect(startTimeField0?.values).toEqual([1633072800000]);

    const startTimeField1 = result[1].fields.find((field) => field.name === 'startTime');
    expect(startTimeField1?.values).toEqual([1633072860000]);
  });

  it('should keep spans with the same traceID in one DataFrame', () => {
    const inputData = [
      {
        traceID: '1',
        spanID: '1-1',
        parentSpanID: null,
        serviceName: 'serviceA',
        startTime: 1633072800000,
        duration: 100,
        operationName: 'operationA',
        tags: [{ key1: 'value1' }],
        serviceTags: [{ tag1: 'value1' }],
      },
      {
        traceID: '1',
        spanID: '1-2',
        parentSpanID: '1-1',
        serviceName: 'serviceA',
        startTime: 1633072810000,
        duration: 50,
        operationName: 'operationB',
        tags: [{ key2: 'value2' }],
        serviceTags: [{ tag2: 'value2' }],
      },
    ];

    const result = toTraces(inputData, meta);

    // Same traceID => one DataFrame with two spans
    expect(result).toHaveLength(1);
    expect(result[0].length).toBe(2);

    const traceIDField = result[0].fields.find((field) => field.name === 'traceID');
    expect(traceIDField?.values).toEqual(['1', '1']);

    const spanIDField = result[0].fields.find((field) => field.name === 'spanID');
    expect(spanIDField?.values).toEqual(['1-1', '1-2']);
  });

  it('should convert spanID and parentSpanID to strings', () => {
    const inputData = [
      {
        traceID: '1',
        spanID: 11083600415587200000, // UInt64 from ClickHouse
        parentSpanID: 0,
        serviceName: 'serviceA',
        startTime: 1633072800000,
        duration: 100,
        operationName: 'operationA',
        tags: [],
        serviceTags: [],
      },
    ];

    const result = toTraces(inputData as any, meta);

    const spanIDField = result[0].fields.find((field) => field.name === 'spanID');
    expect(typeof spanIDField?.values[0]).toBe('string');
    expect(spanIDField?.values[0]).toBe('11083600415587200000');

    // parentSpanID=0 is falsy, should become null
    const parentField = result[0].fields.find((field) => field.name === 'parentSpanID');
    expect(parentField?.values[0]).toBeNull();
  });

  it('should handle optional parentSpanID correctly', () => {
    const inputData = [
      {
        traceID: '3',
        spanID: '3-1',
        parentSpanID: null,
        serviceName: 'serviceC',
        startTime: 1633072920000,
        duration: 150,
        operationName: 'operationC',
        tags: [],
        serviceTags: [],
      },
    ];

    const result = toTraces(inputData, meta);

    const parentSpanIDField = result[0].fields.find((field) => field.name === 'parentSpanID');
    expect(parentSpanIDField?.values).toEqual([null]);
  });

  it('should convert time with timezone correctly', () => {
    const timezoneMeta = [{ name: 'startTime', type: "DateTime64(3,'UTC')" }];

    const inputData = [
      {
        traceID: '4',
        spanID: '4-1',
        parentSpanID: null,
        serviceName: 'serviceD',
        startTime: '2024-10-17 20:28:00.999',
        duration: 250,
        operationName: 'operationD',
        tags: [],
        serviceTags: [],
      },
    ];

    const result = toTraces(inputData, timezoneMeta);

    const startTimeField = result[0].fields.find((field) => field.name === 'startTime');
    expect(startTimeField?.values).toEqual([1729196880999]);
  });
});
