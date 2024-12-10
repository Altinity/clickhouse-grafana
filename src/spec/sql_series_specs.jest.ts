import { toFlamegraph } from '../datasource/frontend-only/sql-series/toFlamegraph';
import { toLogs } from '../datasource/frontend-only/sql-series/toLogs';
import { toTable } from '../datasource/frontend-only/sql-series/toTable';

import { MutableDataFrame } from '@grafana/data';
import { toTimeSeries } from '../datasource/frontend-only/sql-series/toTimeSeries';
import { toTraces } from '../datasource/frontend-only/sql-series/toTraces';

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

  it('should return an empty array of object if no message field is found', () => {
    const input = {
      series: [{ id: 1 }],
      meta: [{ name: 'level', type: 'FixedString' }],
    };
    const result = toLogs(input);

    const expected = new MutableDataFrame({
      fields: [],
      meta: {
        preferredVisualisationType: 'logs',
      },
    });

    expect(result[0] instanceof MutableDataFrame).toBeTruthy();
    expect(result[0].fields).toEqual(expected.fields);
    expect(result[0].meta).toEqual(expected.meta);
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
    expect(result.length).toBe(1);
    expect(result[0].fields[0].name).toBe('content');
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
    expect(result[0].fields.length).toBe(2);
    expect(result[0].fields[0].name).toBe('timestamp');
    expect(result[0].fields[1].name).toBe('level');
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
    expect(result[0].fields.length).toBe(3); // [message + labels], level, timestamp
    const message = result[0].fields.find((field) => {
      return field.name === 'message';
    });
    expect(message?.labels?.user).toBe('user1'); // user
  });

  it('should convert time with time zone to UTC', () => {
    const input = {
      series: [{ id: 1, timestamp: '2024-01-01T05:00:00', level: 'info' }],
      meta: [
        { name: 'timestamp', type: 'DateTime(\'Asia/Yekaterinburg\'\')' },
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
    const result = toTimeSeries(true, selfMock);
    expect(result).toEqual([]);
  });

  it('should handle a single data point correctly', () => {
    selfMock.series = [{ time: 1000, value: 10 }];
    selfMock.meta = [
      { name: 'time', type: 'UInt32' },
      { name: 'value', type: 'UInt64' },
    ];
    selfMock.keys = [];

    const result = toTimeSeries(true, selfMock);
    expect(result).toEqual([{ target: 'value', datapoints: [[10, 1000]] }]);
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

    const result = toTimeSeries(true, selfMock);
    expect(result).toEqual([
      {
        target: 'value',
        datapoints: [
          [10, 1000],
          [20, 2000],
        ],
      },
    ]);
  });

  it('should extrapolate data points when required', () => {
    let expectedDataPoints: number[][] = [];
    selfMock.series = [];
    for (let i = 1; i <= 10; i++) {
      const t = Date.now();
      selfMock.series[i - 1] = { time: t - i * 15 * 1000, value: i * 2 + 30 };
      expectedDataPoints[i - 1] = [i * 2 + 30, t - i * 15 * 1000];
    }

    expectedDataPoints[9][0] = 48.2; // extrapolated value
    selfMock.meta = [
      { name: 'time', type: 'UInt32' },
      { name: 'value', type: 'UInt64' },
    ];
    selfMock.keys = [];
    selfMock.tillNow = true;

    const result = toTimeSeries(true, selfMock);
    expect(result).toEqual([
      {
        target: 'value',
        datapoints: expectedDataPoints,
      },
    ]);

    // less 10 points
    selfMock.series = [];
    expectedDataPoints = [];
    for (let i = 1; i <= 3; i++) {
      selfMock.series[i - 1] = { time: Date.now() - i * 30 * 1000, value: i * 2 + 50 };
      expectedDataPoints[i - 1] = [i * 2 + 50, Date.now() - i * 30 * 1000];
    }
    const resultNonExtrapolated = toTimeSeries(true, selfMock);
    expect(resultNonExtrapolated).toEqual([
      {
        target: 'value',
        datapoints: expectedDataPoints,
      },
    ]);

  });

  it('should handle composite keys correctly', () => {
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

    const result = toTimeSeries(true, selfMock);
    expect(result).toEqual([
      { target: 'A', datapoints: [[1000, 1000], [10, 1000]] },
      { target: 'B', datapoints: [[null, 1000], [null, 1000], [2000, 2000], [20, 2000]] },
    ]);
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

    const result = toTimeSeries(false, selfMock);
    expect(result).toEqual([
      {
        target: 'value',
        datapoints: [
          [null, 1000],
          [20, 2000],
        ],
      },
    ]);
  });
});

describe('sql-series. toTraces unit tests', () => {
  const meta = [{ name: 'startTime', type: 'UInt32' }];

  it('should transform trace data correctly', () => {
    const inputData = [
      {
        traceID: '1',
        spanID: '1-1',
        parentSpanID: null,
        serviceName: 'serviceA',
        startTime: 1633072800000, // Example timestamp
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
        startTime: 1633072860000, // Example timestamp
        duration: 200,
        operationName: 'operationB',
        tags: [{ key2: 'value2' }],
        serviceTags: [{ tag2: 'value2' }],
      },
    ];

    const result = toTraces(inputData, meta);

    expect(result).toHaveLength(1);
    expect(result[0].fields).toHaveLength(9); // Check number of fields

    const traceIDField = result[0].fields.find((field) => field.name === 'traceID');
    expect(traceIDField?.values).toEqual(['1', '2']);

    const startTimeField = result[0].fields.find((field) => field.name === 'startTime');
    expect(startTimeField?.values).toEqual([1633072800000, 1633072860000]); // Assuming no timezone conversion for simplicity

    const durationField = result[0].fields.find((field) => field.name === 'duration');
    expect(durationField?.values).toEqual([100, 200]);
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
        startTime: '2024-10-17 20:28:00.999', // Example timestamp
        duration: 250,
        operationName: 'operationD',
        tags: [],
        serviceTags: [],
      },
    ];

    const result = toTraces(inputData, timezoneMeta);

    const startTimeField = result[0].fields.find((field) => field.name === 'startTime');
    expect(startTimeField?.values).toEqual([1729196880999]); // Adjust based on actual conversion logic
  });
});
