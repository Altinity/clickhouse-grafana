import { DataQueryRequest, SupplementaryQueryOptions, SupplementaryQueryType } from '@grafana/data';

import { CHQuery, LOGS_VOLUME_FORMAT } from '../types/types';

// Level classification lists from issue #782, keyed by Grafana's canonical LogLevel values
// (note: Grafana expects 'warning', not 'warn'). Each base word is expanded to
// lower/UPPER/Capitalized variants because ClickHouse multiSearchAny is case-sensitive.
const LOG_LEVEL_KEYWORDS: Array<[string, string[]]> = [
  ['critical', ['critical', 'fatal', 'crit', 'alert', 'emerg']],
  ['error', ['error', 'err', 'eror']],
  ['warning', ['warn', 'warning']],
  ['info', ['info', 'information', 'informational', 'notice']],
  ['debug', ['debug', 'dbug']],
  ['trace', ['trace']],
  ['unknown', ['unknown']],
];

const caseVariants = (words: string[]): string[] => {
  const variants: string[] = [];
  words.forEach((word) => {
    [word, word.toUpperCase(), word.charAt(0).toUpperCase() + word.slice(1)].forEach((variant) => {
      if (!variants.includes(variant)) {
        variants.push(variant);
      }
    });
  });
  return variants;
};

export const LOGS_VOLUME_LEVELS = LOG_LEVEL_KEYWORDS.map(([level]) => level);

// Keep the histogram cheap: one aggregate row per bucket, at most this many buckets,
// instead of the fine-grained interval used by the logs query itself.
const LOGS_VOLUME_MAX_BUCKETS = 100;

export const computeLogsVolumeInterval = (rangeMs: number, maxDataPoints?: number): string => {
  const buckets = Math.min(maxDataPoints || LOGS_VOLUME_MAX_BUCKETS, LOGS_VOLUME_MAX_BUCKETS);
  const intervalSec = Math.max(1, Math.ceil(rangeMs / 1000 / buckets));
  return `${intervalSec}s`;
};

// Same column convention as toLogs(): a column literally named `level` or `severity`.
// The schema is not introspectable synchronously, so the query text is the only hint.
export const detectLevelColumn = (sql: string): string | undefined => {
  if (/\blevel\b/i.test(sql)) {
    return 'level';
  }
  if (/\bseverity\b/i.test(sql)) {
    return 'severity';
  }
  return undefined;
};

// Without a level column the histogram is a single series; `unknown` is a name toLogsVolume already maps.
const levelSelects = (levelColumn?: string): string =>
  levelColumn === undefined
    ? 'count() AS unknown'
    : LOG_LEVEL_KEYWORDS.map(
        ([level, words]) =>
          `sum(multiSearchAny(toString("${levelColumn}"), [${caseVariants(words)
            .map((word) => `'${word}'`)
            .join(',')}])) AS ${level}`
      ).join(', ');

const ensureTimeFilter = (where: string): string => {
  if (!where.trim()) {
    return '$timeFilter';
  }
  return where.includes('$timeFilter') ? where : `$timeFilter AND (${where})`;
};

export const buildLogsVolumeSqlFromAst = (
  from: string,
  where: string[],
  levelColumn?: string,
  withItems: string[] = []
): string => {
  const withPrefix = withItems.length ? `WITH ${withItems.join(', ')} ` : '';
  return `${withPrefix}SELECT $timeSeries AS t, ${levelSelects(levelColumn)} FROM ${from} WHERE ${ensureTimeFilter(
    (where || []).join(' ')
  )} GROUP BY t ORDER BY t`;
};

// Fallback when AST extraction fails: wrap the original query as a subquery with trailing
// LIMIT/ORDER BY stripped, so counts cover the full range and not the capped logs sample.
export const buildLogsVolumeSqlFallback = (sourceQuery: string, levelColumn?: string): string => {
  let inner = sourceQuery.trim().replace(/;\s*$/, '');
  inner = inner.replace(/\s+limit\s+\d+(?:\s*,\s*\d+)?(?:\s+offset\s+\d+)?\s*$/i, '');
  // `[^()]*$` keeps the match inside the outer query (never crosses into a subquery)
  inner = inner.replace(/\s+order\s+by\s+[^()]*$/i, '');
  return `SELECT $timeSeries AS t, ${levelSelects(levelColumn)} FROM (${inner.trim()}) WHERE $timeFilter GROUP BY t ORDER BY t`;
};

export const getLogsVolumeSupplementaryQuery = (
  options: SupplementaryQueryOptions,
  query: CHQuery
): CHQuery | undefined => {
  if (options.type !== SupplementaryQueryType.LogsVolume) {
    return undefined;
  }
  if (query.hide || query.format !== 'logs' || !query.query?.trim() || !query.dateTimeColDataType) {
    return undefined;
  }
  return {
    ...query,
    format: LOGS_VOLUME_FORMAT,
    extrapolate: false,
    streaming: false,
    _levelColumn: options.field || detectLevelColumn(query.query),
  };
};

export const hasLogsVolumeTargets = (request: DataQueryRequest<CHQuery>): boolean =>
  request.targets.some(
    (target) => getLogsVolumeSupplementaryQuery({ type: SupplementaryQueryType.LogsVolume }, target) !== undefined
  );

export const getLogsVolumeSupplementaryRequest = (
  request: DataQueryRequest<CHQuery>,
  options?: SupplementaryQueryOptions
): DataQueryRequest<CHQuery> | undefined => {
  const interval = computeLogsVolumeInterval(
    request.range.to.valueOf() - request.range.from.valueOf(),
    request.maxDataPoints
  );
  const targets = request.targets
    .map((target) =>
      getLogsVolumeSupplementaryQuery(options ?? { type: SupplementaryQueryType.LogsVolume }, target)
    )
    .filter((target): target is CHQuery => target !== undefined)
    .map((target) => ({ ...target, interval }));

  if (targets.length === 0) {
    return undefined;
  }

  return {
    ...request,
    requestId: `${SupplementaryQueryType.LogsVolume}_${request.requestId}`,
    targets,
  };
};

// getSupplementaryQuery must stay synchronous per the Grafana contract, so the SQL rewrite
// (which needs async AST extraction) happens later in the query pipeline via this helper.
export const buildLogsVolumeQuery = async (
  target: CHQuery,
  getAstProperties: (query: string, properties: string[]) => Promise<{ properties: { [property: string]: any[] } }>
): Promise<CHQuery> => {
  const source = target.query;
  const levelColumn = target._levelColumn || detectLevelColumn(source);
  let sql: string;

  try {
    const { properties } = await getAstProperties(source.replace(/\r\n|\r|\n/g, ' '), ['with', 'from', 'where']);
    const from = (properties?.from || []).join(' ').trim();
    if (!from) {
      throw new Error('no FROM clause extracted');
    }
    const withItems = Array.isArray(properties?.with) ? properties.with.map(String) : [];
    sql = buildLogsVolumeSqlFromAst(from, properties?.where || [], levelColumn, withItems);
  } catch (error) {
    console.warn('[logs volume] FROM/WHERE extraction failed, wrapping the original query as a sub-query', error);
    sql = buildLogsVolumeSqlFallback(source, levelColumn);
  }

  return { ...target, query: sql };
};
