import ResponseParser from './response_parser';

const parser = new ResponseParser();

describe('ResponseParser.parse', () => {
  it('returns [] for null or empty results', () => {
    expect(parser.parse('q', null)).toEqual([]);
    expect(parser.parse('q', undefined)).toEqual([]);
    expect(parser.parse('q', { data: [] })).toEqual([]);
  });

  it('reads meta and data from nested results.data', () => {
    const results = { data: { meta: [{ name: 'x' }], data: [{ x: 'v' }] } };
    expect(parser.parse('q', results)).toEqual([{ text: 'v' }]);
  });

  it('wraps non-object rows as text', () => {
    const results = { meta: [{ name: 'x' }], data: ['a', 42] };
    expect(parser.parse('q', results)).toEqual([{ text: 'a' }, { text: 42 }]);
  });

  it('maps single-key rows to text', () => {
    const results = { meta: [{ name: 'x' }], data: [{ x: 'v1' }, { x: 'v2' }] };
    expect(parser.parse('q', results)).toEqual([{ text: 'v1' }, { text: 'v2' }]);
  });

  it('maps __text/__value pairs to text and value', () => {
    const results = {
      meta: [{ name: '__text' }, { name: '__value' }],
      data: [{ __text: 'Label', __value: 'id-1' }],
    };
    expect(parser.parse('q', results)).toEqual([{ text: 'Label', value: 'id-1' }]);
  });

  it('passes multi-key rows through when no __text/__value pair exists', () => {
    const results = {
      meta: [{ name: 'a' }, { name: 'b' }],
      data: [{ a: 1, b: 2 }],
    };
    expect(parser.parse('q', results)).toEqual([{ a: 1, b: 2 }]);
  });
});

describe('ResponseParser.findColIndex', () => {
  it('finds a column or returns -1', () => {
    expect(ResponseParser.findColIndex(['a', 'b'], 'b')).toBe(1);
    expect(ResponseParser.findColIndex(['a'], 'z')).toBe(-1);
  });
});

describe('transformAnnotationResponse', () => {
  const options = { annotation: { name: 'anno' } };

  it('throws without a time column', () => {
    const data = { meta: [{ name: 'text' }], data: [] };
    expect(() => parser.transformAnnotationResponse(options, data)).toThrow(
      'Missing mandatory time column in annotation query.'
    );
  });

  it('builds region events with split tags and custom type', () => {
    const data = {
      meta: [{ name: 'time' }, { name: 'time_end' }, { name: 'type' }],
      data: [{ time: 1000.7, time_end: 2000, type: 'deploy', title: 'T', text: 'txt', tags: ' a , b ' }],
    };
    expect(parser.transformAnnotationResponse(options, data)).toEqual([
      {
        annotation: options.annotation,
        time: 1000,
        timeEnd: 2000,
        isRegion: true,
        title: 'T',
        type: 'deploy',
        text: 'txt',
        tags: ['a', 'b'],
      },
    ]);
  });

  it('defaults type and tags for plain events', () => {
    const data = {
      meta: [{ name: 'time' }],
      data: [{ time: 1000, title: 'T', text: 'txt' }],
    };
    expect(parser.transformAnnotationResponse(options, data)).toEqual([
      expect.objectContaining({ time: 1000, timeEnd: 0, isRegion: false, type: 'annotation', tags: [] }),
    ]);
  });
});
