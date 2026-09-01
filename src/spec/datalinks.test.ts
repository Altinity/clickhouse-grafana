import { buildDataLink, isClickHouseTarget } from '../datasource/datalinks/buildDataLink';
import { DataLinkConfig } from '../datasource/datalinks/types';
import { applyDataLinks } from '../datasource/datalinks/applyDataLinks';

jest.mock('@grafana/runtime', () => ({
  getDataSourceSrv: () => ({
    getInstanceSettings: (uid: string) => {
      if (uid === 'ch-uid') {
        return { type: 'vertamedia-clickhouse-datasource' };
      }
      if (uid === 'loki-uid') {
        return { type: 'loki' };
      }
      return undefined;
    },
  }),
}));

describe('buildDataLink', () => {
  const baseConfig: DataLinkConfig = {
    fieldName: 'trace_id',
    title: 'View trace',
    targetDatasourceUid: 'target-uid',
    query: 'SELECT * FROM traces WHERE trace_id = ${__value.raw}',
  };

  it('builds a generic internal link when target is not ClickHouse', () => {
    const link = buildDataLink(baseConfig, false);

    expect(link.title).toBe('View trace');
    expect(link.url).toBe('');
    expect(link.internal).toEqual({
      datasourceUid: 'target-uid',
      datasourceName: '',
      query: { refId: 'datalink', query: baseConfig.query },
    });
  });

  it('builds an external link when config.url is set', () => {
    const config: DataLinkConfig = {
      ...baseConfig,
      url: 'https://jaeger.example.com/trace/${__value.raw}',
    };
    const link = buildDataLink(config, false);
    expect(link.title).toBe('View trace');
    expect(link.url).toBe('https://jaeger.example.com/trace/${__value.raw}');
    expect(link.internal).toBeUndefined();
  });

  it('external url takes precedence over CH target', () => {
    const config: DataLinkConfig = { ...baseConfig, url: 'https://x.example' };
    const link = buildDataLink(config, true);
    expect(link.url).toBe('https://x.example');
    expect(link.internal).toBeUndefined();
  });

  it('injects panelsState.trace.spanId when CH target and format=traces', () => {
    const config: DataLinkConfig = { ...baseConfig, format: 'traces' };
    const link = buildDataLink(config, true);
    expect(link.internal?.panelsState).toEqual({ trace: { spanId: '${__value.raw}' } });
  });

  it('does not inject panelsState for non-traces CH formats', () => {
    const config: DataLinkConfig = { ...baseConfig, format: 'logs' };
    const link = buildDataLink(config, true);
    expect(link.internal?.panelsState).toBeUndefined();
  });

  it('targetBlank is true for Dashboard app', () => {
    const link = buildDataLink(baseConfig, false, { app: 'dashboard' });
    expect(link.targetBlank).toBe(true);
  });

  it('targetBlank is false for Explore app (split pane preferred)', () => {
    const link = buildDataLink(baseConfig, false, { app: 'explore' });
    expect(link.targetBlank).toBe(false);
  });

  it('targetBlank defaults to false when app is unknown', () => {
    const link = buildDataLink(baseConfig, false);
    expect(link.targetBlank).toBe(false);
  });

  it('builds a CH-shaped CHQuery when target is ClickHouse', () => {
    const config: DataLinkConfig = { ...baseConfig, format: 'traces' };
    const link = buildDataLink(config, true);

    expect(link.title).toBe('View trace');
    expect(link.url).toBe('');
    expect(link.internal?.datasourceUid).toBe('target-uid');
    expect(link.internal?.query).toMatchObject({
      refId: 'datalink',
      query: config.query,
      rawQuery: config.query,
      format: 'traces',
      extrapolate: false,
      adHocFilters: [],
      showHelp: false,
      showFormattedSQL: false,
    });
  });

  it('defaults format to "table" when omitted on CH target', () => {
    const link = buildDataLink(baseConfig, true);
    expect((link.internal?.query as any).format).toBe('table');
  });
});

describe('isClickHouseTarget', () => {
  it('returns true for our plugin id', () => {
    expect(isClickHouseTarget('ch-uid')).toBe(true);
  });

  it('returns false for foreign datasource', () => {
    expect(isClickHouseTarget('loki-uid')).toBe(false);
  });

  it('returns false when target uid is unknown / deleted', () => {
    expect(isClickHouseTarget('missing-uid')).toBe(false);
  });
});

describe('applyDataLinks', () => {
  type AnyField = { name: string; config?: { links?: any[] } & Record<string, unknown> };

  const cfg: DataLinkConfig = {
    fieldName: 'trace_id',
    title: 'View trace',
    targetDatasourceUid: 'loki-uid',
    query: 'q',
  };

  it('attaches a link to a field with matching name only', () => {
    const fields: AnyField[] = [
      { name: 'trace_id', config: {} },
      { name: 'service', config: {} },
    ];

    applyDataLinks(fields, [cfg]);

    expect(fields[0].config?.links).toHaveLength(1);
    expect(fields[0].config?.links?.[0].title).toBe('View trace');
    expect(fields[1].config?.links ?? []).toHaveLength(0);
  });

  it('is a no-op when configs is undefined or empty', () => {
    const fields: AnyField[] = [{ name: 'trace_id', config: {} }];
    applyDataLinks(fields, undefined);
    applyDataLinks(fields, []);
    expect(fields[0].config?.links ?? []).toHaveLength(0);
  });

  it('attaches multiple links to the same field when several configs match', () => {
    const fields: AnyField[] = [{ name: 'trace_id', config: {} }];
    const cfgA: DataLinkConfig = { ...cfg, title: 'A' };
    const cfgB: DataLinkConfig = { ...cfg, title: 'B' };

    applyDataLinks(fields, [cfgA, cfgB]);

    expect(fields[0].config?.links).toHaveLength(2);
    expect(fields[0].config?.links?.map((l: any) => l.title)).toEqual(['A', 'B']);
  });

  it('appends to existing field.config.links instead of overwriting', () => {
    const existing = { title: 'pre-existing', url: 'https://x' };
    const fields: AnyField[] = [{ name: 'trace_id', config: { links: [existing] } }];

    applyDataLinks(fields, [cfg]);

    expect(fields[0].config?.links).toHaveLength(2);
    expect(fields[0].config?.links?.[0]).toBe(existing);
  });

  it('respects allowedFieldNames restriction', () => {
    const fields: AnyField[] = [
      { name: 'time', config: {} },
      { name: 'service', config: {} },
    ];
    const onTime: DataLinkConfig = { ...cfg, fieldName: 'time' };
    const onService: DataLinkConfig = { ...cfg, fieldName: 'service' };

    applyDataLinks(fields, [onTime, onService], { allowedFieldNames: new Set(['time']) });

    expect(fields[0].config?.links).toHaveLength(1);
    expect(fields[1].config?.links ?? []).toHaveLength(0);
  });

  it('skips configs with empty fieldName silently', () => {
    const fields: AnyField[] = [{ name: 'trace_id', config: {} }];
    const bad: DataLinkConfig = { ...cfg, fieldName: '' };

    applyDataLinks(fields, [bad]);

    expect(fields[0].config?.links ?? []).toHaveLength(0);
  });

  it('skips internal configs with empty query silently', () => {
    const fields: AnyField[] = [{ name: 'trace_id', config: {} }];
    const incomplete: DataLinkConfig = { ...cfg, query: '' };

    applyDataLinks(fields, [incomplete]);

    expect(fields[0].config?.links ?? []).toHaveLength(0);
  });

  it('applies external-url configs even when query is empty', () => {
    const fields: AnyField[] = [{ name: 'trace_id', config: {} }];
    const external: DataLinkConfig = { ...cfg, query: '', url: 'https://x.example/${__value.raw}' };

    applyDataLinks(fields, [external]);

    expect(fields[0].config?.links).toHaveLength(1);
    expect(fields[0].config?.links?.[0].url).toBe('https://x.example/${__value.raw}');
  });

  it('attaches links to fields that have no config object yet', () => {
    const fields: AnyField[] = [{ name: 'trace_id' }];

    applyDataLinks(fields, [cfg]);

    expect(fields[0].config?.links).toHaveLength(1);
  });
});
