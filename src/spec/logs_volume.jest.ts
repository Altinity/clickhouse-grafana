import { FieldType, SupplementaryQueryType } from '@grafana/data';

import {
  buildLogsVolumeQuery,
  buildLogsVolumeSqlFallback,
  buildLogsVolumeSqlFromAst,
  computeLogsVolumeInterval,
  detectLevelColumn,
  getLogsVolumeSupplementaryQuery,
  getLogsVolumeSupplementaryRequest,
  LOGS_VOLUME_LEVELS,
} from '../datasource/logs-volume-query';
import { toLogsVolume } from '../datasource/sql-series/toLogsVolume';
import { LOGS_VOLUME_FORMAT } from '../types/types';

const logsQuery: any = {
  refId: 'A',
  query: 'SELECT timestamp, level, message FROM $table WHERE $timeFilter ORDER BY timestamp DESC LIMIT 1000',
  format: 'logs',
  extrapolate: true,
  dateTimeType: 'DATETIME64',
  dateTimeColDataType: 'timestamp',
  database: 'default',
  table: 'logs',
};

describe('logs volume (issue #782): getLogsVolumeSupplementaryQuery', () => {
  const options = { type: SupplementaryQueryType.LogsVolume };

  it('returns undefined for non-logs formats', () => {
    expect(getLogsVolumeSupplementaryQuery(options, { ...logsQuery, format: 'time_series' })).toBeUndefined();
    expect(getLogsVolumeSupplementaryQuery(options, { ...logsQuery, format: 'table' })).toBeUndefined();
  });

  it('returns undefined for other supplementary query types', () => {
    expect(
      getLogsVolumeSupplementaryQuery({ type: SupplementaryQueryType.LogsSample }, logsQuery)
    ).toBeUndefined();
  });

  it('returns undefined for hidden or empty queries', () => {
    expect(getLogsVolumeSupplementaryQuery(options, { ...logsQuery, hide: true })).toBeUndefined();
    expect(getLogsVolumeSupplementaryQuery(options, { ...logsQuery, query: '   ' })).toBeUndefined();
  });

  it('marks logs queries as logs_volume and keeps the original SQL for later rewrite', () => {
    const result = getLogsVolumeSupplementaryQuery(options, logsQuery);
    expect(result).toBeDefined();
    expect(result!.format).toBe(LOGS_VOLUME_FORMAT);
    expect(result!.query).toBe(logsQuery.query);
    expect(result!.extrapolate).toBe(false);
    expect(result!.streaming).toBe(false);
    expect(result!._levelColumn).toBe('level');
    expect(result!.dateTimeColDataType).toBe('timestamp');
  });

  it('returns undefined when the query has no timestamp column configured ($timeSeries would not expand)', () => {
    expect(getLogsVolumeSupplementaryQuery(options, { ...logsQuery, dateTimeColDataType: '' })).toBeUndefined();
    expect(getLogsVolumeSupplementaryQuery(options, { ...logsQuery, dateTimeColDataType: undefined })).toBeUndefined();
  });

  it('respects the level field hint from Explore', () => {
    const result = getLogsVolumeSupplementaryQuery(
      { type: SupplementaryQueryType.LogsVolume, field: 'log_level' },
      logsQuery
    );
    expect(result!._levelColumn).toBe('log_level');
  });

  it('falls back to severity when the query references severity but not level', () => {
    const query = { ...logsQuery, query: 'SELECT ts, severity, msg FROM $table WHERE $timeFilter' };
    expect(getLogsVolumeSupplementaryQuery(options, query)!._levelColumn).toBe('severity');
    expect(detectLevelColumn('SELECT ts, level FROM logs')).toBe('level');
    expect(detectLevelColumn('SELECT ts FROM logs')).toBeUndefined();
  });
});

describe('logs volume (issue #782): getLogsVolumeSupplementaryRequest', () => {
  const makeRequest = (targets: any[], rangeMs = 3600000, maxDataPoints = 1345): any => ({
    requestId: 'explore_123',
    interval: '2s',
    maxDataPoints,
    range: { from: { valueOf: () => 0 }, to: { valueOf: () => rangeMs } },
    targets,
  });

  it('returns undefined when there are no logs targets', () => {
    const request = makeRequest([{ ...logsQuery, format: 'table' }]);
    expect(getLogsVolumeSupplementaryRequest(request)).toBeUndefined();
  });

  it('maps logs targets and applies a coarse interval derived from the range', () => {
    const request = makeRequest([logsQuery, { ...logsQuery, refId: 'B', format: 'table' }]);
    const result = getLogsVolumeSupplementaryRequest(request);

    expect(result).toBeDefined();
    expect(result!.requestId).toBe('LogsVolume_explore_123');
    expect(result!.targets).toHaveLength(1);
    expect(result!.targets[0].refId).toBe('A');
    expect(result!.targets[0].format).toBe(LOGS_VOLUME_FORMAT);
    // 1h range, capped at 100 buckets -> 36s, not the fine 2s logs interval
    expect(result!.targets[0].interval).toBe('36s');
  });

  it('computes coarse intervals with a 100-bucket cap and 1s floor', () => {
    expect(computeLogsVolumeInterval(3600000, 1345)).toBe('36s');
    expect(computeLogsVolumeInterval(3600000, 50)).toBe('72s');
    expect(computeLogsVolumeInterval(10000, 1000)).toBe('1s');
  });
});

describe('logs volume (issue #782): SQL generation', () => {
  afterEach(() => jest.restoreAllMocks());

  it('builds the aggregate from extracted FROM/WHERE reusing macros', async () => {
    const getAstProperties = jest.fn().mockResolvedValue({
      properties: { from: ['$table'], where: ['$timeFilter', 'AND', "service = 'api'"] },
    });
    const target = getLogsVolumeSupplementaryQuery({ type: SupplementaryQueryType.LogsVolume }, logsQuery)!;
    const result = await buildLogsVolumeQuery(target, getAstProperties);

    expect(getAstProperties).toHaveBeenCalledWith(logsQuery.query, ['with', 'from', 'where']);
    expect(result.query).toBe(
      'SELECT $timeSeries AS t, ' +
        "sum(multiSearchAny(toString(\"level\"), ['critical','CRITICAL','Critical','fatal','FATAL','Fatal','crit','CRIT','Crit','alert','ALERT','Alert','emerg','EMERG','Emerg'])) AS critical, " +
        "sum(multiSearchAny(toString(\"level\"), ['error','ERROR','Error','err','ERR','Err','eror','EROR','Eror'])) AS error, " +
        "sum(multiSearchAny(toString(\"level\"), ['warn','WARN','Warn','warning','WARNING','Warning'])) AS warning, " +
        "sum(multiSearchAny(toString(\"level\"), ['info','INFO','Info','information','INFORMATION','Information','informational','INFORMATIONAL','Informational','notice','NOTICE','Notice'])) AS info, " +
        "sum(multiSearchAny(toString(\"level\"), ['debug','DEBUG','Debug','dbug','DBUG','Dbug'])) AS debug, " +
        "sum(multiSearchAny(toString(\"level\"), ['trace','TRACE','Trace'])) AS trace, " +
        "sum(multiSearchAny(toString(\"level\"), ['unknown','UNKNOWN','Unknown'])) AS unknown " +
        "FROM $table WHERE $timeFilter AND service = 'api' GROUP BY t ORDER BY t"
    );
    // the volume query must not inherit the logs LIMIT
    expect(result.query).not.toMatch(/LIMIT/i);
    expect(result.format).toBe(LOGS_VOLUME_FORMAT);
  });

  it('adds $timeFilter when the extracted WHERE lacks it and when WHERE is empty', () => {
    expect(buildLogsVolumeSqlFromAst('db.logs', ["service = 'api'"], 'level')).toContain(
      "WHERE $timeFilter AND (service = 'api') GROUP BY t"
    );
    expect(buildLogsVolumeSqlFromAst('db.logs', [], 'level')).toContain('WHERE $timeFilter GROUP BY t');
  });

  it('emits a single count() series when the query has no level or severity column', async () => {
    expect(buildLogsVolumeSqlFromAst('$table', ['$timeFilter'], undefined)).toBe(
      'SELECT $timeSeries AS t, count() AS unknown FROM $table WHERE $timeFilter GROUP BY t ORDER BY t'
    );

    const getAstProperties = jest.fn().mockResolvedValue({
      properties: { with: [], from: ['$table'], where: ['$timeFilter'] },
    });
    const target = getLogsVolumeSupplementaryQuery(
      { type: SupplementaryQueryType.LogsVolume },
      { ...logsQuery, query: 'SELECT timestamp, message FROM $table WHERE $timeFilter' }
    )!;
    const result = await buildLogsVolumeQuery(target, getAstProperties);

    expect(target._levelColumn).toBeUndefined();
    expect(result.query).toBe(
      'SELECT $timeSeries AS t, count() AS unknown FROM $table WHERE $timeFilter GROUP BY t ORDER BY t'
    );
  });

  it('carries the WITH clause into the aggregate', async () => {
    expect(buildLogsVolumeSqlFromAst('$table', ['$timeFilter'], 'level', ['topX AS (SELECT 1)'])).toMatch(
      /^WITH topX AS \(SELECT 1\) SELECT \$timeSeries AS t, /
    );

    const getAstProperties = jest.fn().mockResolvedValue({
      properties: { with: ['topX AS (SELECT 1)'], from: ['$table'], where: ['$timeFilter'] },
    });
    const target = getLogsVolumeSupplementaryQuery({ type: SupplementaryQueryType.LogsVolume }, logsQuery)!;
    const result = await buildLogsVolumeQuery(target, getAstProperties);

    expect(getAstProperties).toHaveBeenCalledWith(logsQuery.query, ['with', 'from', 'where']);
    expect(result.query).toMatch(/^WITH topX AS \(SELECT 1\) SELECT \$timeSeries AS t, /);
  });

  it('uses the resolved level column in multiSearchAny', () => {
    const sql = buildLogsVolumeSqlFromAst('$table', ['$timeFilter'], 'severity');
    expect(sql).toContain('multiSearchAny(toString("severity")');
    expect(sql).not.toContain('toString("level")');
  });

  it('falls back to subquery-wrap with LIMIT/ORDER BY stripped when AST extraction fails', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const getAstProperties = jest.fn().mockRejectedValue(new Error('parse error'));
    const target = getLogsVolumeSupplementaryQuery({ type: SupplementaryQueryType.LogsVolume }, logsQuery)!;
    const result = await buildLogsVolumeQuery(target, getAstProperties);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(result.query).toContain(
      'FROM (SELECT timestamp, level, message FROM $table WHERE $timeFilter) WHERE $timeFilter GROUP BY t ORDER BY t'
    );
    expect(result.query).not.toMatch(/LIMIT\s+1000/i);
    expect(result.query).not.toMatch(/ORDER BY timestamp DESC/i);
  });

  it('falls back when the AST result has no FROM clause', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const getAstProperties = jest.fn().mockResolvedValue({ properties: { from: [], where: [] } });
    const target = getLogsVolumeSupplementaryQuery({ type: SupplementaryQueryType.LogsVolume }, logsQuery)!;
    const result = await buildLogsVolumeQuery(target, getAstProperties);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(result.query).toContain('FROM (SELECT timestamp, level, message FROM $table WHERE $timeFilter)');
  });

  it('strips trailing LIMIT variants and semicolons in the fallback', () => {
    expect(buildLogsVolumeSqlFallback('SELECT * FROM logs LIMIT 10, 20;', 'level')).toContain(
      'FROM (SELECT * FROM logs) WHERE $timeFilter'
    );
    expect(buildLogsVolumeSqlFallback('SELECT * FROM logs LIMIT 10 OFFSET 5', 'level')).toContain(
      'FROM (SELECT * FROM logs) WHERE $timeFilter'
    );
    // ORDER BY inside a subquery is preserved, only the trailing outer clause is stripped
    expect(buildLogsVolumeSqlFallback('SELECT * FROM (SELECT ts FROM logs ORDER BY ts) ORDER BY ts LIMIT 5', 'level')).toContain(
      'FROM (SELECT * FROM (SELECT ts FROM logs ORDER BY ts)) WHERE $timeFilter'
    );
  });

  it('covers all seven levels in a stable order', () => {
    expect(LOGS_VOLUME_LEVELS).toEqual(['critical', 'error', 'warning', 'info', 'debug', 'trace', 'unknown']);
  });
});

describe('logs volume (issue #782): toLogsVolume converter', () => {
  const meta = [
    { name: 't', type: 'UInt64' },
    { name: 'critical', type: 'UInt64' },
    { name: 'error', type: 'UInt64' },
    { name: 'warning', type: 'UInt64' },
    { name: 'info', type: 'UInt64' },
    { name: 'debug', type: 'UInt64' },
    { name: 'trace', type: 'UInt64' },
    { name: 'unknown', type: 'UInt64' },
  ];
  const series = [
    { t: '1700000000000', critical: '1', error: '2', warning: '3', info: '4', debug: '5', trace: '6', unknown: '7' },
    { t: '1700000060000', critical: '0', error: '1', warning: '0', info: '2', debug: '0', trace: '0', unknown: '0' },
  ];

  it('emits one frame per level with a level label on the numeric field', () => {
    const frames = toLogsVolume({ refId: 'A', meta, series });

    expect(frames).toHaveLength(7);
    const levels = frames.map((frame: any) => frame.fields[1].labels.level);
    expect(levels).toEqual(['critical', 'error', 'warning', 'info', 'debug', 'trace', 'unknown']);

    frames.forEach((frame: any) => {
      expect(frame.refId).toBe('A');
      expect(frame.length).toBe(2);
      expect(frame.meta.preferredVisualisationType).toBe('graph');
      expect(frame.fields[0].name).toBe('time');
      expect(frame.fields[0].type).toBe(FieldType.time);
      // shared time grid across all level frames
      expect([...frame.fields[0].values]).toEqual([1700000000000, 1700000060000]);
      expect(frame.fields[1].name).toBe('value');
      expect(frame.fields[1].type).toBe(FieldType.number);
    });

    const errorFrame: any = frames[1];
    expect([...errorFrame.fields[1].values]).toEqual([2, 1]);
  });

  it('maps abbreviated column aliases to canonical Grafana levels', () => {
    const frames = toLogsVolume({
      refId: 'A',
      meta: [
        { name: 't', type: 'UInt64' },
        { name: 'warn', type: 'UInt64' },
        { name: 'err', type: 'UInt64' },
        { name: 'fatal', type: 'UInt64' },
      ],
      series: [{ t: '1700000000000', warn: '3', err: '1', fatal: '2' }],
    });

    expect(frames.map((frame: any) => frame.fields[1].labels.level)).toEqual(['warning', 'error', 'critical']);
  });

  it('omits levels with no occurrences in the range and ignores unrelated columns', () => {
    const frames = toLogsVolume({
      refId: 'A',
      meta,
      series: [
        { t: '1700000000000', critical: '0', error: '5', warning: '0', info: '0', debug: '0', trace: '0', unknown: '0' },
      ],
    });
    expect(frames).toHaveLength(1);
    expect((frames[0] as any).fields[1].labels.level).toBe('error');
  });

  it('zero-fills missing or non-numeric counts', () => {
    const frames = toLogsVolume({
      refId: 'A',
      meta: [
        { name: 't', type: 'UInt64' },
        { name: 'error', type: 'UInt64' },
      ],
      series: [
        { t: '1700000000000', error: '2' },
        { t: '1700000060000', error: null },
        { t: '1700000120000' },
      ],
    });
    expect([...(frames[0] as any).fields[1].values]).toEqual([2, 0, 0]);
  });

  it('maps the single count() series to one unknown-level frame', () => {
    const frames = toLogsVolume({
      refId: 'A',
      meta: [
        { name: 't', type: 'UInt64' },
        { name: 'unknown', type: 'UInt64' },
      ],
      series: [
        { t: '1700000000000', unknown: '4' },
        { t: '1700000060000', unknown: '9' },
      ],
    });

    expect(frames).toHaveLength(1);
    expect((frames[0] as any).fields[1].labels.level).toBe('unknown');
    expect([...(frames[0] as any).fields[1].values]).toEqual([4, 9]);
  });

  it('returns an empty result for empty responses', () => {
    expect(toLogsVolume({ refId: 'A', meta, series: [] })).toEqual([]);
    expect(toLogsVolume({ refId: 'A', meta: [], series: undefined })).toEqual([]);
  });
});
