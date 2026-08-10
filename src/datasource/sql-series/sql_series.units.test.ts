import SqlSeries, {
  _toFieldType,
  convertTimezonedDateToUTC,
  convertTimezonedDateToUnixTimestamp,
} from './sql_series';
import { FieldType } from '@grafana/data';

describe('convertTimezonedDate helpers', () => {
  it('converts a zoned datetime to UTC ISO', () => {
    const iso = convertTimezonedDateToUTC('2024-01-15 12:00:00', 'Europe/Berlin');
    expect(new Date(iso!).getTime()).toBe(Date.UTC(2024, 0, 15, 11));
  });

  it('converts a zoned datetime to a unix timestamp', () => {
    expect(convertTimezonedDateToUnixTimestamp('2024-01-15 12:00:00', 'UTC')).toBe(Date.UTC(2024, 0, 15, 12));
  });

  it.each([['convertTimezonedDateToUTC', convertTimezonedDateToUTC], ['convertTimezonedDateToUnixTimestamp', convertTimezonedDateToUnixTimestamp]])(
    '%s throws on invalid input',
    (_name, fn: any) => {
      expect(() => fn('garbage', 'UTC')).toThrow('Invalid datetime format');
    }
  );
});

describe('_toFieldType', () => {
  it('strips Nullable wrappers', () => {
    expect(_toFieldType('Nullable(Int32)')).toBe(FieldType.number);
  });

  it('treats a UInt column at index 0 as time', () => {
    expect(_toFieldType('UInt32', 0)).toBe(FieldType.time);
    expect(_toFieldType('UInt32', 1)).toBe(FieldType.number);
  });

  it('extracts the timezone from DateTime types', () => {
    expect(_toFieldType("DateTime64(3, 'UTC')")).toEqual({ fieldType: FieldType.time, timezone: 'UTC' });
    expect(_toFieldType('Date')).toBe(FieldType.time);
  });

  it('maps IPv types to other and everything else to string', () => {
    expect(_toFieldType('IPv4')).toBe(FieldType.other);
    expect(_toFieldType('LowCardinality(String)')).toBe(FieldType.string);
  });
});

describe('SqlSeries wrappers', () => {
  it('toAnnotation delegates with meta-driven time parsing', () => {
    const series = new SqlSeries({});
    const [frame] = series.toAnnotation(
      [{ time: '1704067200000', time_end: '0', title: 'T', text: 'txt', tags: 'a,b' }],
      [{ name: 'time', type: 'UInt64' }]
    );
    expect(frame.fields.find((f: any) => f.name === 'time').values).toEqual([1704067200000]);
    expect(frame.fields.find((f: any) => f.name === 'tags').values).toEqual([['a', 'b']]);
  });

  it('toFlamegraph delegates and prepends the synthetic root', () => {
    const series = new SqlSeries({
      series: [
        { label: 'root', level: 1, value: '10', self: 2 },
        { label: 'child', level: 2, value: '5', self: 5 },
      ],
    });
    const [frame] = series.toFlamegraph();
    expect(frame.fields.find((f: any) => f.name === 'label').values).toEqual(['all', 'root', 'child']);
    expect(frame.fields.find((f: any) => f.name === 'value').values).toEqual([10, 10, 5]);
  });

  it('toTraces delegates and stringifies span ids', () => {
    const series = new SqlSeries({
      series: [
        {
          traceID: 1,
          spanID: 11189782786942380395,
          parentSpanID: null,
          serviceName: 'svc',
          startTime: '1704067200000',
          duration: 5,
          operationName: 'op',
          tags: { k: 'v' },
          serviceTags: {},
        },
      ],
      meta: [{ name: 'startTime', type: 'UInt64' }],
    });
    const [frame] = series.toTraces();
    expect(frame.fields.find((f: any) => f.name === 'traceID').values).toEqual(['1']);
    expect(frame.fields.find((f: any) => f.name === 'tags').values).toEqual([[{ key: 'k', value: 'v' }]]);
  });
});
