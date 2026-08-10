import { findDifferences } from './findDifferences';
import { TimestampFormat } from '../../../../../types/types';

const ds = (defaultValues: any) => ({ defaultValues } as any);
// keep boolean fields aligned with the query fixtures so only the branch under test differs
const base = (dv: any = {}) => ({ dateTime: {}, useWindowFuncForMacros: true, nullifySparse: false, ...dv });

describe('findDifferences', () => {
  it('returns [] without defaultValues', () => {
    expect(findDifferences({} as any, ds(undefined))).toEqual([]);
  });

  it('returns [] for a fully matching query', () => {
    const defaults = base({
      defaultDateTimeType: TimestampFormat.DateTime,
      dateTime: { defaultDateTime: 'ts' },
      contextWindowSize: '10',
      useWindowFuncForMacros: true,
      nullifySparse: false,
    });
    const query = {
      dateTimeType: TimestampFormat.DateTime,
      dateTimeColDataType: 'ts',
      contextWindowSize: '10',
      useWindowFuncForMacros: true,
      nullifySparse: false,
    } as any;
    expect(findDifferences(query, ds(defaults))).toEqual([]);
  });

  it('dateTimeType mismatch: trims original, EMPTY for undefined and whitespace-only', () => {
    const defaults = base({ defaultDateTimeType: TimestampFormat.DateTime });
    const q = (v: any) => ({ dateTimeType: v, useWindowFuncForMacros: true, nullifySparse: false } as any);
    expect(findDifferences(q('  DATETIME64  '), ds(defaults))).toEqual([
      {
        key: 'Timestamp type Column',
        original: 'DATETIME64',
        updated: TimestampFormat.DateTime,
        fieldName: 'dateTimeType',
      },
    ]);
    expect(findDifferences(q(undefined), ds(defaults))[0].original).toBe('EMPTY');
    expect(findDifferences(q('  '), ds(defaults))[0].original).toBe('EMPTY');
  });

  it.each([
    ['TIMESTAMP', 'defaultUint32', TimestampFormat.TimeStamp],
    ['DATETIME64', 'defaultDateTime64', TimestampFormat.DateTime64],
    ['DATETIME', 'defaultDateTime', TimestampFormat.DateTime],
  ])('type-gated %s column diff via %s, suppressed when default is falsy', (_label, field, type) => {
    const q = { dateTimeType: type, dateTimeColDataType: 'other', useWindowFuncForMacros: true, nullifySparse: false } as any;
    const diffs = findDifferences(q, ds(base({ defaultDateTimeType: type, dateTime: { [field]: 'col' } })));
    expect(diffs).toEqual([
      { key: 'Timestamp Column', original: 'other', updated: 'col', fieldName: 'dateTimeColDataType' },
    ]);
    // falsy default suppresses the diff
    expect(findDifferences(q, ds(base({ defaultDateTimeType: type, dateTime: { [field]: '' } })))).toEqual([]);
  });

  it('reports defaultDateDate32 mismatch', () => {
    const q = { dateColDataType: 'd', useWindowFuncForMacros: true, nullifySparse: false } as any;
    const diffs = findDifferences(q, ds(base({ dateTime: { defaultDateDate32: 'date32' } })));
    expect(diffs).toEqual([{ key: 'Date column', original: 'd', updated: 'date32', fieldName: 'dateColDataType' }]);
  });

  it('reports contextWindowSize mismatch', () => {
    const q = { contextWindowSize: '10', useWindowFuncForMacros: true, nullifySparse: false } as any;
    const diffs = findDifferences(q, ds(base({ contextWindowSize: '20' })));
    expect(diffs).toEqual([
      { key: 'Logs context window size', original: '10', updated: '20', fieldName: 'contextWindowSize' },
    ]);
  });

  it('useWindowFuncForMacros: undefined query value stringifies to "true"', () => {
    const diffs = findDifferences({ nullifySparse: false } as any, ds(base({ useWindowFuncForMacros: true, nullifySparse: false })));
    expect(diffs).toEqual([
      { key: 'Use window functions for macros', original: 'true', updated: 'true', fieldName: 'useWindowFuncForMacros' },
    ]);
    const explicit = findDifferences(
      { useWindowFuncForMacros: false, nullifySparse: false } as any,
      ds(base({ useWindowFuncForMacros: true, nullifySparse: false }))
    );
    expect(explicit[0]).toMatchObject({ original: 'false', updated: 'true' });
  });

  it('nullifySparse: undefined query value stringifies to "false"', () => {
    const diffs = findDifferences({ useWindowFuncForMacros: true } as any, ds(base({ useWindowFuncForMacros: true, nullifySparse: true })));
    expect(diffs).toEqual([
      { key: 'Nullify sparse categories', original: 'false', updated: 'true', fieldName: 'nullifySparse' },
    ]);
  });

  it('dateTimeType mismatch does not short-circuit the column diff (both reported)', () => {
    const defaults = base({
      defaultDateTimeType: TimestampFormat.DateTime,
      dateTime: { defaultDateTime: 'col' },
      useWindowFuncForMacros: true,
      nullifySparse: false,
    });
    const q = {
      dateTimeType: TimestampFormat.DateTime64,
      dateTimeColDataType: 'other',
      useWindowFuncForMacros: true,
      nullifySparse: false,
    } as any;
    const diffs = findDifferences(q, ds(defaults));
    expect(diffs.map((d) => d.fieldName)).toEqual(['dateTimeType', 'dateTimeColDataType']);
  });
});
