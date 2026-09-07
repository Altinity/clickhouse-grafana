import { isComplexType, defaultModeForType, resolveFieldModes, renderFieldByMode, expandFieldDeep, typeHasNesting, pathStyleForType } from './logsFieldModes';

describe('typeHasNesting', () => {
  it('returns false for flat Map types', () => {
    expect(typeHasNesting('Map(String, String)')).toBe(false);
    expect(typeHasNesting('Map(String, Float64)')).toBe(false);
  });
  it('returns true for Map whose value is complex', () => {
    expect(typeHasNesting('Map(String, Map(String, String))')).toBe(true);
    expect(typeHasNesting('Map(String, Map(String, Map(String, String)))')).toBe(true);
  });
  it('returns false for Tuple of primitives', () => {
    expect(typeHasNesting('Tuple(lat Float64, lon Float64)')).toBe(false);
  });
  it('returns true for Tuple with a complex element', () => {
    expect(typeHasNesting('Tuple(String, Map(String, String))')).toBe(true);
  });
  it('returns true for Object/JSON types', () => {
    expect(typeHasNesting("Object('json')")).toBe(true);
    expect(typeHasNesting('JSON')).toBe(true);
  });
  it('handles Nullable wrapping', () => {
    expect(typeHasNesting('Nullable(Map(String, Map(String, String)))')).toBe(true);
    expect(typeHasNesting('Nullable(Map(String, String))')).toBe(false);
  });
  it('returns false for primitives and Array', () => {
    expect(typeHasNesting('String')).toBe(false);
    expect(typeHasNesting('Array(String)')).toBe(false);
  });
  it('returns false for Dynamic and Variant (no static nesting)', () => {
    expect(typeHasNesting('Dynamic')).toBe(false);
    expect(typeHasNesting('Variant(UInt64, String)')).toBe(false);
    expect(typeHasNesting('Nullable(Dynamic)')).toBe(false);
    expect(typeHasNesting('Nullable(Variant(String, UInt64))')).toBe(false);
  });
});

describe('isComplexType', () => {
  it('detects complex ClickHouse types', () => {
    expect(isComplexType('Map(String, String)')).toBe(true);
    expect(isComplexType('Array(String)')).toBe(true);
    expect(isComplexType('Object(\'json\')')).toBe(true);
    expect(isComplexType('JSON')).toBe(true);
    expect(isComplexType('Nullable(Map(String, UInt8))')).toBe(true);
  });
  it('returns false for primitives', () => {
    expect(isComplexType('String')).toBe(false);
    expect(isComplexType('UInt64')).toBe(false);
    expect(isComplexType('DateTime64(3)')).toBe(false);
  });
  it('detects Dynamic and Variant as complex types', () => {
    expect(isComplexType('Dynamic')).toBe(true);
    expect(isComplexType('Variant(UInt64, String)')).toBe(true);
    expect(isComplexType('Nullable(Dynamic)')).toBe(true);
    expect(isComplexType('Nullable(Variant(UInt64, String))')).toBe(true);
  });
  // Regression: existing classifications unchanged
  it('keeps Map/Array/JSON/Tuple/Nested/primitives classified correctly (regression)', () => {
    expect(isComplexType('Map(String,String)')).toBe(true);
    expect(isComplexType('Array(String)')).toBe(true);
    expect(isComplexType('JSON')).toBe(true);
    expect(isComplexType('Tuple(lat Float64, lon Float64)')).toBe(true);
    expect(isComplexType('Nested(id UInt32, name String)')).toBe(true);
    expect(isComplexType('String')).toBe(false);
    expect(isComplexType('UInt64')).toBe(false);
  });
});

describe('defaultModeForType', () => {
  it('maps Array to single and Map/Object/JSON to expand', () => {
    expect(defaultModeForType('Array(String)')).toBe('single');
    expect(defaultModeForType('Map(String, String)')).toBe('expand');
    expect(defaultModeForType('JSON')).toBe('expand');
  });
  it('returns undefined for primitives', () => {
    expect(defaultModeForType('String')).toBeUndefined();
  });
  it('maps Dynamic and Variant to single', () => {
    expect(defaultModeForType('Dynamic')).toBe('single');
    expect(defaultModeForType('Variant(String, UInt64)')).toBe('single');
    expect(defaultModeForType('Nullable(Dynamic)')).toBe('single');
    expect(defaultModeForType('Nullable(Variant(UInt64, String))')).toBe('single');
  });
  // Regression: existing type→mode mapping unchanged
  it('keeps existing type→mode mapping unchanged (regression)', () => {
    expect(defaultModeForType('Array(String)')).toBe('single');
    expect(defaultModeForType('Map(String, String)')).toBe('expand');
    expect(defaultModeForType('JSON')).toBe('expand');
    expect(defaultModeForType('Tuple(lat Float64, lon Float64)')).toBe('expand');
    expect(defaultModeForType('Nested(id UInt32, name String)')).toBe('expand');
    expect(defaultModeForType('String')).toBeUndefined();
    expect(defaultModeForType('UInt64')).toBeUndefined();
  });
});

describe('resolveFieldModes', () => {
  const meta = [
    { name: 'ts', type: 'DateTime64(3)' },
    { name: '_map', type: 'Map(String, String)' },
    { name: '_arr', type: 'Array(String)' },
  ];
  it('applies type defaults for complex columns and omits primitives', () => {
    expect(resolveFieldModes(meta)).toEqual({ _map: 'expand', _arr: 'single' });
  });
  it('lets config override the default', () => {
    const cfg = { _map: { mode: 'hide' as const }, _arr: { mode: 'raw' as const } };
    expect(resolveFieldModes(meta, cfg)).toEqual({ _map: 'hide', _arr: 'raw' });
  });
});

describe('expandFieldDeep', () => {
  it('recursively flattens nested maps into chained-subscript keys', () => {
    expect(expandFieldDeep('na', { http: { method: 'GET', path: '/api/v1' } }, 3)).toEqual({
      "na['http']['method']": 'GET',
      "na['http']['path']": '/api/v1',
    });
  });

  it('flat map is unchanged at depth 1', () => {
    expect(expandFieldDeep('_map', { host: 'web1', env: 'prod' })).toEqual({
      "_map['host']": 'web1',
      "_map['env']": 'prod',
    });
  });

  it('array stays as a single stringified value', () => {
    expect(expandFieldDeep('tags', ['a', 'b'])).toEqual({ tags: '["a","b"]' });
  });

  it('depth cap: objects beyond maxDepth are stringified', () => {
    expect(expandFieldDeep('m', { a: { b: { c: { d: 1 } } } }, 3)).toEqual({
      "m['a']['b']['c']": '{"d":1}',
    });
  });
});

describe('renderFieldByMode', () => {
  it('expand on an object splits into per-key labels', () => {
    const result = renderFieldByMode('_map', { host: 'web1', env: 'prod' }, 'expand');
    expect(result.labels).toEqual({ "_map['host']": 'web1', "_map['env']": 'prod' });
    expect(result.bodyAppend).toBeUndefined();
    expect(result.hidden).toBeUndefined();
  });

  it('expand deep-flattens nested objects into labels when depth allows', () => {
    const result = renderFieldByMode('na', { http: { method: 'GET' } }, 'expand', 3);
    expect(result.labels).toEqual({ "na['http']['method']": 'GET' });
    expect(result.bodyAppend).toBeUndefined();
    expect(result.hidden).toBeUndefined();
  });

  it('single on an array produces a stringified label', () => {
    const result = renderFieldByMode('tags', ['a', 'b'], 'single');
    expect(result.labels).toEqual({ tags: '["a","b"]' });
    expect(result.bodyAppend).toBeUndefined();
    expect(result.hidden).toBeUndefined();
  });

  it('hide returns empty labels and hidden:true', () => {
    const result = renderFieldByMode('_map', { host: 'web1' }, 'hide');
    expect(result.labels).toEqual({});
    expect(result.hidden).toBe(true);
    expect(result.bodyAppend).toBeUndefined();
  });

  it('raw returns empty labels and bodyAppend with stringified object', () => {
    const result = renderFieldByMode('x', { a: 1 }, 'raw');
    expect(result.labels).toEqual({});
    expect(result.bodyAppend).toBe('x={"a":1}');
    expect(result.hidden).toBeUndefined();
  });

  // --- per-field depth tests ---
  it('expand with depth=1 flattens only one level (deeper objects stringified)', () => {
    const result = renderFieldByMode('m', { a: { b: { c: 1 } } }, 'expand', 1);
    expect(result.labels).toEqual({ "m['a']": '{"b":{"c":1}}' });
  });

  it('expand with depth=2 flattens two levels (third level stringified)', () => {
    const result = renderFieldByMode('m', { a: { b: { c: 1 } } }, 'expand', 2);
    expect(result.labels).toEqual({ "m['a']['b']": '{"c":1}' });
  });

  it('expand with no depth argument uses DEFAULT_EXPAND_DEPTH (1, legacy-compatible)', () => {
    const result = renderFieldByMode('m', { a: { b: { c: 1 } } }, 'expand');
    expect(result.labels).toEqual({ "m['a']": '{"b":{"c":1}}' });
  });

  it('expand with Number.POSITIVE_INFINITY fully flattens all levels', () => {
    const result = renderFieldByMode('m', { a: { b: { c: { d: 1 } } } }, 'expand', Number.POSITIVE_INFINITY);
    expect(result.labels).toEqual({ "m['a']['b']['c']['d']": 1 });
  });

  it('depth param is ignored for non-expand modes (single)', () => {
    const result = renderFieldByMode('tags', ['a', 'b'], 'single', 99);
    expect(result.labels).toEqual({ tags: '["a","b"]' });
    expect(result.bodyAppend).toBeUndefined();
  });

  it('expand with dot pathStyle uses dot-separated keys', () => {
    const result = renderFieldByMode('j', { a: { b: 'GET' } }, 'expand', 3, 'dot');
    expect(result.labels).toEqual({ 'j.a.b': 'GET' });
  });

  it('expand with bracket pathStyle (default) uses bracket-subscript keys', () => {
    const result = renderFieldByMode('_map', { host: 'web1' }, 'expand', undefined, 'bracket');
    expect(result.labels).toEqual({ "_map['host']": 'web1' });
  });

  it('expand without pathStyle argument defaults to bracket (backward-compat)', () => {
    const result = renderFieldByMode('_map', { host: 'web1' }, 'expand');
    expect(result.labels).toEqual({ "_map['host']": 'web1' });
  });

  it('hide ignores pathStyle', () => {
    const result = renderFieldByMode('j', { a: 1 }, 'hide', undefined, 'dot');
    expect(result.labels).toEqual({});
    expect(result.hidden).toBe(true);
  });

  it('raw ignores pathStyle', () => {
    const result = renderFieldByMode('j', { a: 1 }, 'raw', undefined, 'dot');
    expect(result.labels).toEqual({});
    expect(result.bodyAppend).toBe('j={"a":1}');
  });
});

describe('pathStyleForType', () => {
  it('returns bracket for Map types', () => {
    expect(pathStyleForType('Map(String,String)')).toBe('bracket');
    expect(pathStyleForType('Map(String,Map(String,String))')).toBe('bracket');
  });

  it('returns dot for JSON type', () => {
    expect(pathStyleForType('JSON')).toBe('dot');
  });

  it('returns dot for Tuple type', () => {
    expect(pathStyleForType('Tuple(lat Float64, lon Float64)')).toBe('dot');
  });

  it('returns dot for Nested type', () => {
    expect(pathStyleForType('Nested(id UInt32, name String)')).toBe('dot');
  });

  it('returns dot for Object type', () => {
    expect(pathStyleForType("Object('json')")).toBe('dot');
  });

  it('unwraps Nullable before checking', () => {
    expect(pathStyleForType('Nullable(JSON)')).toBe('dot');
    expect(pathStyleForType('Nullable(Map(String,String))')).toBe('bracket');
  });

  it('returns bracket for primitive types (fallback)', () => {
    expect(pathStyleForType('String')).toBe('bracket');
    expect(pathStyleForType('UInt64')).toBe('bracket');
  });

  it('returns bracket for Dynamic and Variant (no meaningful path style)', () => {
    expect(pathStyleForType('Dynamic')).toBe('bracket');
    expect(pathStyleForType('Variant(UInt64, String)')).toBe('bracket');
    expect(pathStyleForType('Nullable(Dynamic)')).toBe('bracket');
    expect(pathStyleForType('Nullable(Variant(UInt64, String))')).toBe('bracket');
  });

  // Regression: dot types still return dot after Dynamic/Variant additions
  it('keeps Map→bracket and JSON/Tuple/Nested/Object→dot unchanged (regression)', () => {
    expect(pathStyleForType('Map(String,String)')).toBe('bracket');
    expect(pathStyleForType('JSON')).toBe('dot');
    expect(pathStyleForType('Tuple(lat Float64, lon Float64)')).toBe('dot');
    expect(pathStyleForType('Nested(id UInt32, name String)')).toBe('dot');
    expect(pathStyleForType("Object('json')")).toBe('dot');
  });
});

describe('expandFieldDeep with pathStyle', () => {
  it('dot style builds dot-separated keys for JSON column', () => {
    expect(expandFieldDeep('j', { a: { b: 'GET' } }, 3, 'dot')).toEqual({ 'j.a.b': 'GET' });
  });

  it('dot style for shallow tuple-like value', () => {
    expect(expandFieldDeep('coords', { lat: 50, lon: 8 }, 3, 'dot')).toEqual({
      'coords.lat': 50,
      'coords.lon': 8,
    });
  });

  it('bracket style (default) remains unchanged', () => {
    expect(expandFieldDeep('_map', { host: 'web1' }, 3)).toEqual({ "_map['host']": 'web1' });
  });

  it('bracket explicit keeps bracket-subscript notation', () => {
    expect(expandFieldDeep('_map', { host: 'web1' }, 3, 'bracket')).toEqual({ "_map['host']": 'web1' });
  });
});
