import { toLogs, transformObject } from './toLogs';
import {DataFrameType } from '@grafana/data';

describe('transformObject', () => {
  it('should flatten first-level nested objects with quoted key notation', () => {
    const input = {
      _map: { test: 123, foo: 'bar' },
      regular: 'value',
      array: [1, 2, 3]
    };

    const result = transformObject(input);

    expect(result).toEqual({
      "_map['test']": 123,
      "_map['foo']": 'bar',
      regular: 'value',
      array: '[1,2,3]'
    });
  });

  it('should handle deeper nested objects by stringifying them', () => {
    const input = {
      _metadata: { 
        user: { 
          id: 1, 
          name: 'John' 
        },
        settings: {
          theme: 'dark'
        }
      }
    };

    const result = transformObject(input);

    expect(result).toEqual({
      "_metadata['user']": '{"id":1,"name":"John"}',
      "_metadata['settings']": '{"theme":"dark"}'
    });
  });

  it('should handle arrays as values by stringifying them', () => {
    const input = {
      tags: ['error', 'critical', 'production'],
      simple: 'value'
    };

    const result = transformObject(input);

    expect(result).toEqual({
      tags: '["error","critical","production"]',
      simple: 'value'
    });
  });

  it('should handle null values correctly', () => {
    const input = {
      nullValue: null,
      undefinedValue: undefined,
      validValue: 'test'
    };

    const result = transformObject(input);

    expect(result).toEqual({
      nullValue: null,
      undefinedValue: undefined,
      validValue: 'test'
    });
  });

  it('should handle primitive input by returning it unchanged', () => {
    expect(transformObject('string')).toBe('string');
    expect(transformObject(123)).toBe(123);
    expect(transformObject(null)).toBe(null);
    expect(transformObject(undefined)).toBe(undefined);
  });
});

describe('toLogs', () => {
  it('should return empty array when series is empty', () => {
    const input = {
      series: [],
      meta: []
    };

    const result = toLogs(input);
    expect(result).toEqual([]);
  });

  it('should transform data into logs format with flattened nested objects', () => {
    const input = {
      series: [
        {
          timestamp: '2023-01-01 10:00:00',
          content: 'Log message 1',
          level: 'error',
          metadata: { source: 'server1', context: { requestId: 'abc123' } }
        },
        {
          timestamp: '2023-01-01 10:01:00',
          content: 'Log message 2',
          level: 'warning',
          metadata: { source: 'server2', context: { requestId: 'def456' } }
        }
      ],
      meta: [
        { name: 'timestamp', type: 'DateTime' },
        { name: 'content', type: 'String' },
        { name: 'level', type: 'String' },
        { name: 'metadata', type: 'Object' }
      ],
      refId: 'A'
    };

    const result = toLogs(input);

    // Check that we get a dataframe array with one item
    expect(result.length).toBe(1);
    
    // Check meta information
    expect(result[0].meta).toEqual({
      type: DataFrameType.LogLines,
      preferredVisualisationType: 'logs'
    });

    // Check that we have proper field structure
    const fields = result[0].fields;
    expect(fields.filter(f => f.name === 'timestamp').length).toBe(1);
    expect(fields.filter(f => f.name === 'body').length).toBe(1);
    expect(fields.filter(f => f.name === 'severity').length).toBe(1);
    expect(fields.filter(f => f.name === 'labels').length).toBe(1);
    
    // Verify that labels contain our flattened objects
    const labelsField = fields.find(f => f.name === 'labels');
    expect(labelsField).toBeDefined();
    if (labelsField && labelsField.values) {
      expect(labelsField.values.length).toBe(2);
      // Default depth is 1 (legacy-compatible): first level flattened, deeper
      // objects stringified. Object type uses dot-access notation.
      const firstRowLabels = labelsField.values[0];
      expect(Object.keys(firstRowLabels)).toContain("metadata.source");
      expect(Object.keys(firstRowLabels)).toContain("metadata.context");
      expect(firstRowLabels["metadata.source"]).toBe('server1');
      expect(firstRowLabels["metadata.context"]).toBe('{"requestId":"abc123"}');
    }
  });

  it('should handle complex nested objects in label fields', () => {
    const input = {
      series: [
        {
          timestamp: '2023-01-01 10:00:00',
          message: 'Error occurred',
          complex_data: {
            error: { code: 500, message: 'Internal error' },
            performance: { cpu: 80, memory: "1.2GB" }
          }
        }
      ],
      meta: [
        { name: 'timestamp', type: 'DateTime' },
        { name: 'message', type: 'String' },
        { name: 'complex_data', type: 'Object' }
      ],
      refId: 'B'
    };

    const result = toLogs(input);

    // Verify results
    expect(result.length).toBe(1);

    // Check the labels field contains our flattened objects
    const labelsField = result[0].fields.find(f => f.name === 'labels');
    expect(labelsField).toBeDefined();

    if (labelsField && labelsField.values && labelsField.values.length > 0) {
      const labels = labelsField.values[0];

      // Default depth is 1 (legacy-compatible): first level flattened via dot
      // access, deeper objects stringified. Deeper expansion is opt-in (depth).
      expect(Object.keys(labels)).toContain("complex_data.error");
      expect(Object.keys(labels)).toContain("complex_data.performance");

      // Level-2 objects are stringified at the default depth
      expect(labels["complex_data.error"]).toBe('{"code":500,"message":"Internal error"}');
      expect(labels["complex_data.performance"]).toBe('{"cpu":80,"memory":"1.2GB"}');
    }
  });
});

describe('toLogs with logsFieldConfig modes', () => {
  const baseSelf = (logsFieldConfig?: any) => ({
    refId: 'A',
    meta: [
      { name: 'ts', type: 'DateTime64(3)' },
      { name: 'content', type: 'String' },
      { name: '_map', type: 'Map(String, String)' },
      { name: '_arr', type: 'Array(String)' },
    ],
    series: [
      {
        ts: '2023-01-01 10:00:00',
        content: 'msg',
        _map: { host: 'web1', env: 'prod' },
        _arr: ['a', 'b'],
      },
    ],
    logsFieldConfig,
  });

  const labelsOf = (frames: any[]) =>
    frames[0].fields.find((f: any) => f.name === 'labels')?.values[0] ?? {};
  const bodyOf = (frames: any[]) =>
    frames[0].fields.find((f: any) => f.name === 'body')?.values[0] ?? '';

  it('expand splits a Map into per-key labels (default for Map)', () => {
    const frames = toLogs(baseSelf());
    const labels = labelsOf(frames);
    expect(labels["_map['host']"]).toBe('web1');
    expect(labels["_map['env']"]).toBe('prod');
  });

  it('single keeps a single stringified label (default for Array)', () => {
    const labels = labelsOf(toLogs(baseSelf()));
    expect(labels['_arr']).toBe(JSON.stringify(['a', 'b']));
  });

  it('hide removes the field from labels', () => {
    const labels = labelsOf(toLogs(baseSelf({ _map: { mode: 'hide' } })));
    expect(labels["_map['host']"]).toBeUndefined();
    expect(labels['_map']).toBeUndefined();
  });

  it('raw appends the value to the body and is not a label', () => {
    const frames = toLogs(baseSelf({ _map: { mode: 'raw' } }));
    expect(labelsOf(frames)["_map['host']"]).toBeUndefined();
    expect(bodyOf(frames)).toContain('_map=');
    expect(bodyOf(frames)).toContain('web1');
  });

  it('honors an explicit override over the type default (Map forced to single)', () => {
    const labels = labelsOf(toLogs(baseSelf({ _map: { mode: 'single' } })));
    expect(labels['_map']).toBe(JSON.stringify({ host: 'web1', env: 'prod' }));
    expect(labels["_map['host']"]).toBeUndefined();
  });
});

describe('toLogs with per-field depth in logsFieldConfig', () => {
  // depth-4 nested column: { a: { b: { c: { d: 42 } } } }
  // configured with { mode: 'expand', depth: 2 } — should flatten exactly 2 levels
  const selfWithDepth4Col = (depth: number) => ({
    refId: 'D',
    meta: [
      { name: 'ts', type: 'DateTime64(3)' },
      { name: 'content', type: 'String' },
      { name: 'deep', type: 'Map(String, String)' },
    ],
    series: [
      {
        ts: '2023-01-01 10:00:00',
        content: 'msg',
        deep: { a: { b: { c: { d: 42 } } } },
      },
    ],
    logsFieldConfig: { deep: { mode: 'expand' as const, depth } },
  });

  const labelsOf = (frames: any[]) =>
    frames[0].fields.find((f: any) => f.name === 'labels')?.values[0] ?? {};

  it('depth=2 flattens exactly 2 levels; 3rd-and-beyond stringified', () => {
    const labels = labelsOf(toLogs(selfWithDepth4Col(2)));
    // level-1: deep['a'] → level-2: deep['a']['b'] → stop: deep['a']['b'] = '{"c":{"d":42}}'
    expect(labels["deep['a']['b']"]).toBe('{"c":{"d":42}}');
    // deeper keys must NOT appear
    expect(labels["deep['a']['b']['c']"]).toBeUndefined();
    expect(labels["deep['a']['b']['c']['d']"]).toBeUndefined();
  });
});

describe('toLogs type-aware path accessor (dot vs bracket)', () => {
  const labelsOf = (frames: any[]) =>
    frames[0].fields.find((f: any) => f.name === 'labels')?.values[0] ?? {};

  it('Tuple column uses dot-access keys (coords.lat, coords.lon)', () => {
    const self = {
      refId: 'T',
      meta: [
        { name: 'ts', type: 'DateTime64(3)' },
        { name: 'content', type: 'String' },
        { name: 'coords', type: 'Tuple(lat Float64, lon Float64)' },
      ],
      series: [
        { ts: '2023-01-01 10:00:00', content: 'msg', coords: { lat: 50, lon: 8 } },
      ],
    };
    const labels = labelsOf(toLogs(self));
    expect(labels['coords.lat']).toBe(50);
    expect(labels['coords.lon']).toBe(8);
    // Must NOT use bracket notation
    expect(labels["coords['lat']"]).toBeUndefined();
    expect(labels["coords['lon']"]).toBeUndefined();
  });

  it('JSON column uses dot-access keys', () => {
    const self = {
      refId: 'J',
      meta: [
        { name: 'ts', type: 'DateTime64(3)' },
        { name: 'content', type: 'String' },
        { name: 'j', type: 'JSON' },
      ],
      series: [
        { ts: '2023-01-01 10:00:00', content: 'msg', j: { a: { b: 'GET' } } },
      ],
      // Deep dot-chaining is opt-in: default depth is 1 (legacy-compatible)
      logsFieldConfig: { j: { mode: 'expand', depth: 3 } },
    };
    const labels = labelsOf(toLogs(self));
    expect(labels['j.a.b']).toBe('GET');
    expect(labels["j['a']['b']"]).toBeUndefined();
  });

  it('Map column still uses bracket-subscript keys (unchanged behavior)', () => {
    const self = {
      refId: 'M',
      meta: [
        { name: 'ts', type: 'DateTime64(3)' },
        { name: 'content', type: 'String' },
        { name: 'tags', type: 'Map(String,String)' },
      ],
      series: [
        { ts: '2023-01-01 10:00:00', content: 'msg', tags: { host: 'web1', env: 'prod' } },
      ],
    };
    const labels = labelsOf(toLogs(self));
    expect(labels["tags['host']"]).toBe('web1');
    expect(labels["tags['env']"]).toBe('prod');
    expect(labels['tags.host']).toBeUndefined();
  });
});

describe('toLogs row alignment and time coercion (review fixes)', () => {
  it('keeps labels aligned when an expand-mode value is empty for some rows', () => {
    const self = {
      refId: 'A',
      meta: [
        { name: 'ts', type: 'DateTime64(3)' },
        { name: 'content', type: 'String' },
        { name: 'attrs', type: 'Map(String, String)' },
      ],
      series: [
        { ts: '2023-01-01 10:00:00', content: 'row1', attrs: {} },
        { ts: '2023-01-01 10:00:01', content: 'row2', attrs: { env: 'prod' } },
      ],
    };
    const frames = toLogs(self);
    const labelsField = frames[0].fields.find((f: any) => f.name === 'labels')!;
    const bodyField = frames[0].fields.find((f: any) => f.name === 'body')!;
    // one labels entry per row — no desync
    expect(labelsField.values.length).toBe(2);
    expect(bodyField.values.length).toBe(2);
    expect(labelsField.values[0]).toEqual({});
    expect(labelsField.values[1]["attrs['env']"]).toBe('prod');
  });

  it('coerces all-digit string values of time-typed columns to numbers (quote_64bit)', () => {
    const self = {
      refId: 'A',
      meta: [
        { name: 'ts', type: 'UInt64' }, // index 0 UInt -> FieldType.time special case
        { name: 'content', type: 'String' },
      ],
      series: [
        { ts: '1712345678000', content: 'row1' },
        { ts: '1712345679000', content: 'row2' },
      ],
    };
    const frames = toLogs(self);
    const tsField = frames[0].fields.find((f: any) => f.name === 'timestamp')!;
    expect(tsField.values).toEqual([1712345678000, 1712345679000]);
    expect(typeof tsField.values[0]).toBe('number');
  });
});
