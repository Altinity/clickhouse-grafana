import { toAnnotation } from './toAnnotation';
import { toZonedTime } from 'date-fns-tz';

describe('transformAnnotationData', () => {
  it('should correctly transform annotation data with mixed time formats', () => {
    const inputData = [
      {
        time: '2024-12-04 21:19:32',
        time_end: '1733347322000',
        title: '[annotation] title',
        text: '[annotation] description',
        tags: 'test1,test2,postgresql',
      },
      {
        time: '2024-12-04 21:19:42',
        time_end: '1733347632000',
        title: '[annotation] title',
        text: '[annotation] description',
        tags: 'test1,test2,postgresql',
      },
      {
        time: '2024-12-04 21:20:12',
        time_end: '1733347662000',
        title: '[annotation] title',
        text: '[annotation] description',
        tags: 'test1,test2,postgresql',
      },
      {
        time: '2024-12-04 21:27:42',
        time_end: '1733347712000',
        title: '[annotation] title',
        text: '[annotation] description',
        tags: 'test1,test2,mysql',
      },
      {
        time: '2024-12-04 21:27:52',
        time_end: '1733347873000',
        title: '[alert] title',
        text: '[alert] description',
        tags: 'test1,test2,mysql',
      },
      {
        time: '2024-12-04 21:34:12',
        time_end: '1733348253000',
        title: '[alert] title',
        text: '[alert] description',
        tags: 'test1,test2,mysql',
      },
    ];

    const meta = [
      { name: 'time', type: 'DateTime' },
      { name: 'time_end', type: 'number' },
      { name: 'title', type: 'String' },
      { name: 'text', type: 'String' },
      { name: 'tags', type: 'String' },
    ];

    const result = toAnnotation(inputData, meta);

    expect(result).toEqual([
      {
        fields: [
          {
            name: 'time',
            type: 'number',
            values: expect.arrayContaining([
              new Date('2024-12-04T21:19:32').getTime(),
              new Date('2024-12-04T21:19:42').getTime(),
              new Date('2024-12-04T21:20:12').getTime(),
              new Date('2024-12-04T21:27:42').getTime(),
              new Date('2024-12-04T21:27:52').getTime(),
              new Date('2024-12-04T21:34:12').getTime(),
            ]),
            config: {},
          },
          {
            name: 'timeEnd',
            type: 'number',
            values: expect.arrayContaining([
              1733347322000, 1733347632000, 1733347662000, 1733347712000, 1733347873000, 1733348253000,
            ]),
            config: {},
          },
          {
            name: 'title',
            type: 'string',
            values: expect.arrayContaining(['[annotation] title', '[alert] title']),
            config: {},
          },
          {
            name: 'text',
            type: 'string',
            values: expect.arrayContaining(['[annotation] description', '[alert] description']),
            config: {},
          },
          {
            name: 'tags',
            type: 'array',
            values: expect.arrayContaining([
              ['test1', 'test2', 'postgresql'],
              ['test1', 'test2', 'mysql'],
            ]),
            config: {},
          },
        ],
        length: 6,
      },
    ]);
  });

  it('should correctly transform annotation data with time including milliseconds', () => {
    const inputData = [
      {
        time: '2024-12-04 21:19:32.123',
        time_end: '1733347322000',
        title: '[annotation] title',
        text: '[annotation] description',
        tags: 'test1,test2,postgresql',
      },
      {
        time: '2024-12-04 21:19:42.456',
        time_end: '1733347632000',
        title: '[annotation] title',
        text: '[annotation] description',
        tags: 'test1,test2,postgresql',
      },
    ];

    const meta = [
      { name: 'time', type: 'DateTime' },
      { name: 'time_end', type: 'UInt64' },
      { name: 'title', type: 'String' },
      { name: 'text', type: 'String' },
      { name: 'tags', type: 'String' },
    ];

    const result = toAnnotation(inputData, meta);

    expect(result).toEqual([
      {
        fields: [
          {
            name: 'time',
            type: 'number',
            values: expect.arrayContaining([
              new Date('2024-12-04T21:19:32.123').getTime(),
              new Date('2024-12-04T21:19:42.456').getTime(),
            ]),
            config: {},
          },
          {
            name: 'timeEnd',
            type: 'number',
            values: expect.arrayContaining([1733347322000, 1733347632000]),
            config: {},
          },
          {
            name: 'title',
            type: 'string',
            values: expect.arrayContaining(['[annotation] title']),
            config: {},
          },
          {
            name: 'text',
            type: 'string',
            values: expect.arrayContaining(['[annotation] description']),
            config: {},
          },
          {
            name: 'tags',
            type: 'array',
            values: expect.arrayContaining([['test1', 'test2', 'postgresql']]),
            config: {},
          },
        ],
        length: 2,
      },
    ]);
  });

  it('should correctly transform annotation data with DateTime64 and timezone', () => {
    const inputData = [
      {
        time: '2024-12-04 21:19:32.123',
        time_end: '2024-12-04 21:20:32.123',
        title: '[annotation] title',
        text: '[annotation] description',
        tags: 'test1,test2,postgresql',
      },
      {
        time: '2024-12-04T21:19:42.456',
        time_end: '2024-12-04T21:20:42.456',
        title: '[annotation] title',
        text: '[annotation] description',
        tags: 'test1,test2,postgresql',
      },
    ];

    const meta = [
      { name: 'time', type: "DateTime64(3, 'Asia/Yekaterinburg')" },
      { name: 'time_end', type: "DateTime64(3, 'Asia/Yekaterinburg')" },
      { name: 'title', type: 'String' },
      { name: 'text', type: 'String' },
      { name: 'tags', type: 'String' },
    ];

    const result = toAnnotation(inputData, meta);

    expect(result).toEqual([
      {
        fields: [
          {
            name: 'time',
            type: 'number',
            values: expect.arrayContaining([
              toZonedTime(new Date('2024-12-04T21:19:32.123Z'), 'Asia/Yekaterinburg').getTime(),
              toZonedTime(new Date('2024-12-04T21:19:42.456Z'), 'Asia/Yekaterinburg').getTime(),
            ]),
            config: {},
          },
          {
            name: 'timeEnd',
            type: 'number',
            values: expect.arrayContaining([
              toZonedTime(new Date('2024-12-04T21:20:32.123Z'), 'Asia/Yekaterinburg').getTime(),
              toZonedTime(new Date('2024-12-04T21:20:42.456Z'), 'Asia/Yekaterinburg').getTime(),
            ]),
            config: {},
          },
          {
            name: 'title',
            type: 'string',
            values: expect.arrayContaining(['[annotation] title']),
            config: {},
          },
          {
            name: 'text',
            type: 'string',
            values: expect.arrayContaining(['[annotation] description']),
            config: {},
          },
          {
            name: 'tags',
            type: 'array',
            values: expect.arrayContaining([['test1', 'test2', 'postgresql']]),
            config: {},
          },
        ],
        length: 2,
      },
    ]);
  });
});

describe('sql-series. toAnnotation unit tests', () => {
  it('should transform valid annotation data correctly', () => {
    const input = [
      {
        time: '1622548800',
        time_end: '1622552400',
        title: 'Annotation 1',
        text: 'This is a test annotation.',
        tags: 'tag1,tag2',
      },
      {
        time: '1622548801',
        time_end: '1622552401',
        title: 'Annotation 2',
        text: 'Another test annotation.',
        tags: 'tag3,tag4',
      },
    ];

    const expectedOutput = [
      {
        fields: [
          { name: 'time', type: 'number', values: [1622548800, 1622548801], config: {} },
          { name: 'timeEnd', type: 'number', values: [1622552400, 1622552401], config: {} },
          { name: 'title', type: 'string', values: ['Annotation 1', 'Annotation 2'], config: {} },
          {
            name: 'text',
            type: 'string',
            values: ['This is a test annotation.', 'Another test annotation.'],
            config: {},
          },
          {
            name: 'tags',
            type: 'array',
            values: [
              ['tag1', 'tag2'],
              ['tag3', 'tag4'],
            ],
            config: {},
          },
        ],
        length: 2,
      },
    ];

    const meta = [
      { name: 'time', type: 'Uint64' },
      { name: 'time_end', type: 'Uint64' },
      { name: 'title', type: 'String' },
      { name: 'text', type: 'String' },
      { name: 'tags', type: 'String' },
    ];

    expect(toAnnotation(input, meta)).toEqual(expectedOutput);
  });

  it('should return an empty array for empty input', () => {
    const input: any[] = [];
    const expectedOutput = [
      {
        fields: [
          { name: 'time', type: 'number', values: [], config: {} },
          { name: 'timeEnd', type: 'number', values: [], config: {} },
          { name: 'title', type: 'string', values: [], config: {} },
          { name: 'text', type: 'string', values: [], config: {} },
          { name: 'tags', type: 'array', values: [], config: {} },
        ],
        length: 0,
      },
    ];

    const meta = [
      { name: 'time', type: 'Uint64' },
      { name: 'time_end', type: 'Uint64' },
      { name: 'title', type: 'String' },
      { name: 'text', type: 'String' },
      { name: 'tags', type: 'String' },
    ];

    expect(toAnnotation(input, meta)).toEqual(expectedOutput);
  });

  it('should handle invalid time format gracefully', () => {
    const input = [
      {
        time: 'invalid_time',
        time_end: '1622552400',
        title: 'Annotation 1',
        text: 'This is a test annotation.',
        tags: 'tag1,tag2',
      },
    ];

    const meta = [
      { name: 'time', type: 'Uint64' },
      { name: 'time_end', type: 'Uint64' },
      { name: 'title', type: 'String' },
      { name: 'text', type: 'String' },
      { name: 'tags', type: 'String' },
    ];

    const expectedOutput = [
      {
        fields: [
          { name: 'time', type: 'number', values: [NaN], config: {} }, // Expect NaN for invalid time
          { name: 'timeEnd', type: 'number', values: [1622552400], config: {} },
          { name: 'title', type: 'string', values: ['Annotation 1'], config: {} },
          { name: 'text', type: 'string', values: ['This is a test annotation.'], config: {} },
          { name: 'tags', type: 'array', values: [['tag1', 'tag2']], config: {} },
        ],
        length: 1,
      },
    ];

    expect(toAnnotation(input, meta)).toEqual(expectedOutput);
  });

  it('should handle missing fields gracefully', () => {
    const input = [
      {
        time: '1622548800',
        title: 'Annotation 1',
        tags: 'tag1,tag2',
      },
      {
        time: '1622548801',
        time_end: '1622552401',
        text: 'Another test annotation.',
      },
    ];

    const meta = [
      { name: 'time', type: 'Uint64' },
      { name: 'time_end', type: 'Uint64' },
      { name: 'title', type: 'String' },
      { name: 'text', type: 'String' },
      { name: 'tags', type: 'String' },
    ];

    const expectedOutput = [
      {
        fields: [
          { name: 'time', type: 'number', values: [1622548800, 1622548801], config: {} },
          { name: 'timeEnd', type: 'number', values: [NaN, 1622552401], config: {} }, // Handle missing time_end
          { name: 'title', type: 'string', values: ['Annotation 1', undefined], config: {} }, // Handle missing title
          { name: 'text', type: 'string', values: [undefined, 'Another test annotation.'], config: {} }, // Handle missing text
          { name: 'tags', type: 'array', values: [['tag1', 'tag2'], []], config: {} }, // Handle missing tags
        ],
        length: 2,
      },
    ];

    expect(toAnnotation(input, meta)).toEqual(expectedOutput);
  });
});
