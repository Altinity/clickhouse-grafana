import { toTimeSeries } from './toTimeSeries';

const meta = [
  { name: 't', type: 'UInt64' },
  { name: 'val', type: 'Float64' },
];

const makeSelf = (overrides: any = {}) => ({
  refId: 'A',
  keys: [],
  meta,
  series: [],
  tillNow: false,
  from: 0,
  to: 0,
  ...overrides,
});

// 10 points at 1s spacing, seconds 1..10
const rampSeries = (values: number[]) => values.map((v, i) => ({ t: (i + 1) * 1000, val: v }));

describe('toTimeSeries extrapolation', () => {
  it('returns [] for an empty series', () => {
    expect(toTimeSeries(true, false, makeSelf())).toEqual([]);
  });

  it('extrapolates a zero first value near the left range border', () => {
    const self = makeSelf({
      series: rampSeries([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]),
      tillNow: true,
      from: 0.9,
      to: 12,
    });
    const [frame] = toTimeSeries(true, false, self);
    // dp0 = dp1 * (1 + ((dp1-dp2)/dp1)*0.1) = 10 * 0.9
    expect(frame.fields[1].values[0]).toBeCloseTo(9);
  });

  it('extrapolates the last value near the right range border', () => {
    const self = makeSelf({
      series: rampSeries([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]),
      tillNow: true,
      from: 0,
      to: 10.5,
    });
    const [frame] = toTimeSeries(true, false, self);
    expect(frame.fields[1].values[9]).toBeCloseTo(80 * (1 + ((80 - 70) / 80) * 0.1));
  });

  it('keeps a zero first value when the following value is also zero (NaN guard)', () => {
    const self = makeSelf({
      series: rampSeries([0, 0, 20, 30, 40, 50, 60, 70, 80, 90]),
      tillNow: true,
      from: 0.9,
      to: 12,
    });
    const [frame] = toTimeSeries(true, false, self);
    expect(frame.fields[1].values[0]).toBe(0);
  });

  it('skips extrapolation for fewer than 10 points', () => {
    const self = makeSelf({ series: rampSeries([0, 10, 20]), tillNow: true, from: 0.9, to: 3.1 });
    const [frame] = toTimeSeries(true, false, self);
    expect(frame.fields[1].values[0]).toBe(0);
  });

  it('skips extrapolation when not tillNow and the first value is non-zero', () => {
    const self = makeSelf({
      series: rampSeries([5, 10, 20, 30, 40, 50, 60, 70, 80, 90]),
      tillNow: false,
      from: 0.9,
      to: 10.5,
    });
    const [frame] = toTimeSeries(true, false, self);
    expect(frame.fields[1].values[0]).toBe(5);
    expect(frame.fields[1].values[9]).toBe(90);
  });
});

describe('toTimeSeries timezone handling', () => {
  it('converts DateTime with explicit timezone to UTC', () => {
    const self = makeSelf({
      meta: [{ name: 't', type: "DateTime('Europe/Berlin')" }, { name: 'val', type: 'UInt64' }],
      series: [{ t: '2024-01-15 12:00:00', val: 1 }],
    });
    const [frame] = toTimeSeries(false, false, self);
    expect(new Date(frame.fields[0].values[0]).getTime()).toBe(Date.UTC(2024, 0, 15, 11));
  });

  it('treats plain DateTime strings as UTC', () => {
    const self = makeSelf({
      meta: [{ name: 't', type: 'DateTime' }, { name: 'val', type: 'UInt64' }],
      series: [{ t: '2024-01-15 12:00:00', val: 1 }],
    });
    const [frame] = toTimeSeries(false, false, self);
    expect(new Date(frame.fields[0].values[0]).getTime()).toBe(Date.UTC(2024, 0, 15, 12));
  });
});

describe('toTimeSeries value and key shapes', () => {
  it('stringifies object GROUP BY keys into the series name', () => {
    const self = makeSelf({
      keys: ['tag'],
      meta: [meta[0], { name: 'tag', type: 'Object' }, meta[1]],
      series: [{ t: 1000, tag: { a: 1 }, val: 5 }],
    });
    const [frame] = toTimeSeries(false, false, self);
    expect(frame.fields[1].name).toBe('{"a":1}');
    expect(frame.refId).toBe('A - {"a":1}');
  });

  it('stringifies object metric values', () => {
    const self = makeSelf({ series: [{ t: 1000, val: { x: 1 } }] });
    const [frame] = toTimeSeries(false, false, self);
    expect(frame.fields[1].values).toEqual(['{"x":1}']);
  });

  it('backfills and appends nulls for sparse series when nullifySparse is set', () => {
    const self = makeSelf({
      keys: ['host'],
      meta: [meta[0], { name: 'host', type: 'String' }, meta[1]],
      series: [
        { t: 1000, host: 'a', val: 1 },
        { t: 2000, host: 'b', val: 5 },
        { t: 3000, host: 'a', val: 2 },
        { t: 4000, host: 'b', val: 6 },
      ],
    });
    const frames = toTimeSeries(false, true, self);
    const byName = Object.fromEntries(frames.map((f: any) => [f.fields[1].name, f]));
    expect(byName['a'].fields[0].values).toEqual([1000, 2000, 3000]);
    expect(byName['a'].fields[1].values).toEqual([1, null, 2]);
    expect(byName['b'].fields[0].values).toEqual([1000, 2000, 3000, 4000]);
    expect(byName['b'].fields[1].values).toEqual([null, 5, null, 6]);
  });

  it('expands groupArray values into multiple series', () => {
    const self = makeSelf({
      meta: [meta[0], { name: 'arr', type: 'Array(Tuple(String, UInt64))' }],
      series: [{ t: 1000, arr: [['x', 1], ['y', 2]] }],
    });
    const frames = toTimeSeries(false, false, self);
    expect(frames.map((f: any) => f.fields[1].name).sort()).toEqual(['x', 'y']);
  });
});
