import { initializeQueryDefaults, initializeQueryDefaultsForVariables } from './initializeQueryDefaults';
import { EditorMode, TimestampFormat } from '../../../types/types';
import { DEFAULT_FORMAT, DEFAULT_ROUND, defaultQuery } from '../../constants';

const noDefaults = {} as any;
const withDefaults = (defaultValues: any = {}) => ({ defaultValues: { dateTime: {}, ...defaultValues } });

describe.each([
  ['initializeQueryDefaults', initializeQueryDefaults],
  ['initializeQueryDefaultsForVariables', initializeQueryDefaultsForVariables],
])('%s', (_name, init) => {
  it('fills defaults for an empty query', () => {
    const result = init({} as any, false, noDefaults, jest.fn());
    expect(result).toMatchObject({
      format: DEFAULT_FORMAT,
      extrapolate: true,
      skip_comments: true,
      add_metadata: true,
      nullifySparse: false,
      useWindowFuncForMacros: true,
      round: DEFAULT_ROUND,
      intervalFactor: 1,
      interval: '',
      adHocFilters: [],
      query: defaultQuery,
      contextWindowSize: '10',
      editorMode: EditorMode.Builder,
      adHocValuesQuery: '',
    });
  });

  it('infers editorMode: database+table -> SQL, explicit preserved, database only -> Builder', () => {
    expect(init({ database: 'db', table: 't' } as any, false, noDefaults, jest.fn()).editorMode).toBe(EditorMode.SQL);
    expect(
      init({ database: 'db', table: 't', editorMode: EditorMode.Builder } as any, false, noDefaults, jest.fn())
        .editorMode
    ).toBe(EditorMode.Builder);
    expect(init({ database: 'db' } as any, false, noDefaults, jest.fn()).editorMode).toBe(EditorMode.Builder);
  });

  it('preserves falsy-but-set values under ?? and replaces empty string under ||', () => {
    const result = init({ extrapolate: false, format: '', round: '', query: '' } as any, false, noDefaults, jest.fn());
    expect(result.extrapolate).toBe(false);
    expect(result.format).toBe(DEFAULT_FORMAT);
    expect(result.round).toBe('0s');
    expect(result.query).not.toBe('');
  });

  it('does not call onChange without datasource.defaultValues', () => {
    const onChange = jest.fn();
    init({} as any, false, noDefaults, onChange);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when query.initialized is true', () => {
    const onChange = jest.fn();
    init({ initialized: true } as any, false, withDefaults(), onChange);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls onChange exactly once with initialized: true', () => {
    const onChange = jest.fn();
    init({} as any, false, withDefaults(), onChange);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ initialized: true }));
  });

  it('applies defaultDateTimeType only when query has none', () => {
    const ds = withDefaults({ defaultDateTimeType: TimestampFormat.DateTime64 });
    expect(init({} as any, false, ds, jest.fn()).dateTimeType).toBe(TimestampFormat.DateTime64);
    expect(init({ dateTimeType: TimestampFormat.Float } as any, false, ds, jest.fn()).dateTimeType).toBe(
      TimestampFormat.Float
    );
  });

  const colCases: Array<[string, string]> = [
    [TimestampFormat.DateTime, 'defaultDateTime'],
    [TimestampFormat.DateTime64, 'defaultDateTime64'],
    [TimestampFormat.TimeStamp, 'defaultUint32'],
    [TimestampFormat.Float, 'defaultFloat'],
    [TimestampFormat.TimeStamp64_3, 'defaultTimeStamp64_3'],
    [TimestampFormat.TimeStamp64_6, 'defaultTimeStamp64_6'],
    [TimestampFormat.TimeStamp64_9, 'defaultTimeStamp64_9'],
  ];

  it.each(colCases)('dateTimeColDataType default for %s', (type, field) => {
    const ds = withDefaults({ dateTime: { [field]: 'default_col' } });
    // applied when dateTimeType matches
    expect(init({ dateTimeType: type } as any, false, ds, jest.fn()).dateTimeColDataType).toBe('default_col');
    // not applied on a mismatched type
    const other = type === TimestampFormat.Float ? TimestampFormat.DateTime : TimestampFormat.Float;
    expect(init({ dateTimeType: other } as any, false, ds, jest.fn()).dateTimeColDataType).toBeUndefined();
    // existing value not overwritten
    expect(
      init({ dateTimeType: type, dateTimeColDataType: 'mine' } as any, false, ds, jest.fn()).dateTimeColDataType
    ).toBe('mine');
  });

  it('applies defaultDateDate32 only when query has no dateColDataType', () => {
    const ds = withDefaults({ dateTime: { defaultDateDate32: 'event_date' } });
    expect(init({} as any, false, ds, jest.fn()).dateColDataType).toBe('event_date');
    expect(init({ dateColDataType: 'mine' } as any, false, ds, jest.fn()).dateColDataType).toBe('mine');
  });

  it('applies datasource contextWindowSize only when query has none (check reads query, not the "10" default)', () => {
    const ds = withDefaults({ contextWindowSize: '25' });
    expect(init({} as any, false, ds, jest.fn()).contextWindowSize).toBe('25');
    expect(init({ contextWindowSize: '5' } as any, false, ds, jest.fn()).contextWindowSize).toBe('5');
  });

  it('datasource nullifySparse overrides the earlier false default when query has it undefined', () => {
    const ds = withDefaults({ nullifySparse: true });
    expect(init({} as any, false, ds, jest.fn()).nullifySparse).toBe(true);
    expect(init({ nullifySparse: false } as any, false, ds, jest.fn()).nullifySparse).toBe(false);
  });

  it('isAnnotationView forces format ANNOTATION', () => {
    expect(init({} as any, true, noDefaults, jest.fn()).format).toBe('ANNOTATION');
    expect(init({ format: 'table' } as any, true, withDefaults(), jest.fn()).format).toBe('ANNOTATION');
  });
});
