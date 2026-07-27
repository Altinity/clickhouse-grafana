import { parseJsonResponseLossless, tryParseJson } from './losslessJson';
import SqlSeries from './sql-series/sql_series';

describe('parseJsonResponseLossless', () => {
  it('preserves an unsafe UInt64 value as a string (issue #832 reproduction)', () => {
    expect(parseJsonResponseLossless('{"v":11189782786942380395}')).toEqual({ v: '11189782786942380395' });
  });

  it('keeps safe integers as numbers', () => {
    expect(parseJsonResponseLossless('{"v":123}')).toEqual({ v: 123 });
    // MAX_SAFE_INTEGER is 16 digits but still safe
    expect(parseJsonResponseLossless('{"v":9007199254740991}')).toEqual({ v: 9007199254740991 });
  });

  it('preserves a 16-digit integer just above the safe range as a string', () => {
    expect(parseJsonResponseLossless('{"v":9007199254740993}')).toEqual({ v: '9007199254740993' });
  });

  it('preserves unsafe negative Int64 values as strings', () => {
    expect(parseJsonResponseLossless('{"v":-9223372036854775808}')).toEqual({ v: '-9223372036854775808' });
  });

  it('keeps safe negative integers as numbers', () => {
    expect(parseJsonResponseLossless('{"v":-42}')).toEqual({ v: -42 });
  });

  it('parses floats as numbers, including long mantissas and exponents', () => {
    expect(parseJsonResponseLossless('{"a":1.5,"b":1.2345678901234567e20,"c":1e5,"d":-0.003147184}')).toEqual({
      a: 1.5,
      b: 1.2345678901234567e20,
      c: 1e5,
      d: -0.003147184,
    });
  });

  it('does not touch digit runs inside string values', () => {
    expect(parseJsonResponseLossless('{"msg":"id: 12345678901234567890 ok"}')).toEqual({
      msg: 'id: 12345678901234567890 ok',
    });
  });

  it('handles escaped quotes inside strings next to unsafe integers', () => {
    expect(
      parseJsonResponseLossless('{"msg":"he said \\" 99999999999999999999 \\" done","v":11189782786942380395}')
    ).toEqual({ msg: 'he said " 99999999999999999999 " done', v: '11189782786942380395' });
  });

  it('handles an escaped backslash right before a closing quote', () => {
    expect(parseJsonResponseLossless('{"path":"C:\\\\","v":11189782786942380395}')).toEqual({
      path: 'C:\\',
      v: '11189782786942380395',
    });
  });

  it('preserves unsafe integers inside arrays', () => {
    expect(parseJsonResponseLossless('[11189782786942380395,1,2]')).toEqual(['11189782786942380395', 1, 2]);
  });

  it('handles pretty-printed JSON with whitespace and newlines', () => {
    expect(parseJsonResponseLossless('{\n\t"v": 11189782786942380395\n}')).toEqual({ v: '11189782786942380395' });
  });

  it('passes through already-quoted 64-bit values (output_format_json_quote_64bit_integers=1)', () => {
    expect(parseJsonResponseLossless('{"v":"11189782786942380395"}')).toEqual({ v: '11189782786942380395' });
  });

  it('parses a full ClickHouse FORMAT JSON response shape', () => {
    const text = `{
      "meta": [{"name": "v", "type": "UInt64"}],
      "data": [{"v": 11189782786942380395}],
      "rows": 1,
      "statistics": {"elapsed": 0.003147184, "rows_read": 1, "bytes_read": 1}
    }`;
    expect(parseJsonResponseLossless(text)).toEqual({
      meta: [{ name: 'v', type: 'UInt64' }],
      data: [{ v: '11189782786942380395' }],
      rows: 1,
      statistics: { elapsed: 0.003147184, rows_read: 1, bytes_read: 1 },
    });
  });

  it('takes the native JSON.parse fast path for responses without long digit runs', () => {
    const parseSpy = jest.spyOn(JSON, 'parse');
    parseJsonResponseLossless('{"v":123}');
    expect(parseSpy).toHaveBeenCalledWith('{"v":123}');
    parseSpy.mockRestore();
  });

  it('returns non-string input unchanged (defensive passthrough)', () => {
    const alreadyParsed = { data: [{ v: 1 }] };
    expect(parseJsonResponseLossless(alreadyParsed)).toBe(alreadyParsed);
    expect(parseJsonResponseLossless(null)).toBeNull();
  });
});

describe('tryParseJson', () => {
  it('restores a JSON error body to an object so isPermissionError can classify it', () => {
    const body = '{"meta":[],"data":[],"exception":"Code: 497. DB::Exception: Not enough privileges."}';
    expect(tryParseJson(body)).toEqual({
      meta: [],
      data: [],
      exception: 'Code: 497. DB::Exception: Not enough privileges.',
    });
  });

  it('returns a non-JSON (text/plain) error body unchanged', () => {
    const body = 'Code: 497. DB::Exception: Not enough privileges.';
    expect(tryParseJson(body)).toBe(body);
  });

  it('returns non-string input unchanged', () => {
    const alreadyParsed = { exception: 'x' };
    expect(tryParseJson(alreadyParsed)).toBe(alreadyParsed);
    expect(tryParseJson(undefined)).toBeUndefined();
  });

  it("unwraps Grafana's processRequestError wrapper around a JSON error body", () => {
    // backend_srv wraps string error bodies as {message, error, response}
    // before the plugin's error handler runs
    const body = '{"meta":[],"data":[],"exception":"Code: 497. DB::Exception: Not enough privileges."}';
    const wrapped = { message: body, error: 'Internal Server Error', response: body };
    expect(tryParseJson(wrapped)).toEqual({
      meta: [],
      data: [],
      exception: 'Code: 497. DB::Exception: Not enough privileges.',
    });
  });

  it("keeps Grafana's wrapper when the wrapped body is not JSON", () => {
    const wrapped = {
      message: 'Code: 497. DB::Exception: Not enough privileges.',
      error: 'Internal Server Error',
      response: 'Code: 497. DB::Exception: Not enough privileges.',
    };
    expect(tryParseJson(wrapped)).toBe(wrapped);
  });
});

describe('end-to-end: raw ClickHouse text to table frame (issue #832)', () => {
  it('delivers an unsafe UInt64 to the table untouched', () => {
    const text =
      '{"meta":[{"name":"v","type":"UInt64"}],"data":[{"v":11189782786942380395}],"rows":1,' +
      '"statistics":{"elapsed":0.003,"rows_read":1,"bytes_read":1}}';
    const response = parseJsonResponseLossless(text);
    const sqlSeries = new SqlSeries({ refId: 'A', series: response.data, meta: response.meta, keys: [] });
    const [table] = sqlSeries.toTable();
    expect(table.columns).toEqual([{ text: 'v', type: 'string' }]);
    expect(table.rows).toEqual([['11189782786942380395']]);
  });
});
