import { toLogs } from './toLogs';

describe('toLogs type handling', () => {
  it('returns [] when no String column exists', () => {
    const result = toLogs({
      series: [{ ts: '2024-01-15 12:00:00', num: 1 }],
      meta: [
        { name: 'ts', type: 'DateTime' },
        { name: 'num', type: 'UInt64' },
      ],
    });
    expect(result).toEqual([]);
  });

  it('converts DateTime with timezone to UTC for the timestamp field', () => {
    const [frame] = toLogs({
      series: [{ ts: '2024-01-15 12:00:00', content: 'msg' }],
      meta: [
        { name: 'ts', type: "DateTime('Europe/Berlin')" },
        { name: 'content', type: 'String' },
      ],
      refId: 'A',
    });
    const timestamp = frame.fields.find((f: any) => f.name === 'timestamp')!;
    expect(new Date(timestamp.values[0]).getTime()).toBe(Date.UTC(2024, 0, 15, 11));
  });

  it('exposes numeric columns as labels and keeps IPv columns out of them', () => {
    const [frame] = toLogs({
      series: [{ content: 'msg', code: 500, ip: '1.2.3.4' }],
      meta: [
        { name: 'content', type: 'String' },
        { name: 'code', type: 'Int32' },
        { name: 'ip', type: 'IPv4' },
      ],
      refId: 'A',
    });
    const labels = frame.fields.find((f: any) => f.name === 'labels')!;
    expect(labels.values[0]).toEqual({ code: 500 });
  });

  it('maps level to the severity field and keeps id', () => {
    const [frame] = toLogs({
      series: [{ content: 'msg', level: 'error', id: 'row-1' }],
      meta: [
        { name: 'content', type: 'String' },
        { name: 'level', type: 'String' },
        { name: 'id', type: 'String' },
      ],
      refId: 'A',
    });
    expect(frame.fields.find((f: any) => f.name === 'severity')!.values[0]).toBe('error');
    expect(frame.fields.find((f: any) => f.name === 'id')!.values[0]).toBe('row-1');
    expect(frame.fields.find((f: any) => f.name === 'body')!.values[0]).toBe('msg');
  });
});
