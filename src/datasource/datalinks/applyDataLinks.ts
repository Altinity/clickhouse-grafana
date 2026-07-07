import { DataLink } from '@grafana/data';
import { buildDataLink, isClickHouseTarget } from './buildDataLink';
import { DataLinkConfig } from './types';

/**
 * The minimal structural shape applyDataLinks needs. Both the plugin's own
 * converter fields (sql_series Field) and @grafana/data Fields satisfy it.
 */
interface MinimalField {
  name: string;
  config?: { links?: DataLink[] };
}

interface ApplyOptions {
  allowedFieldNames?: Set<string>;
  /** Grafana app context (forwarded to buildDataLink for targetBlank). */
  app?: string;
}

/**
 * A config is applicable when it names a field and carries a destination:
 * an external `url`, or a `query` for the internal link. Incomplete configs
 * (e.g. just added in ConfigEditor and not filled in yet) are skipped
 * silently, per the design spec's edge-case rules.
 */
function isApplicable(config: DataLinkConfig): boolean {
  return !!config.fieldName && !!(config.url || config.query);
}

export function applyDataLinks(
  fields: MinimalField[],
  configs: DataLinkConfig[] | undefined,
  options?: ApplyOptions,
): void {
  if (!configs?.length) return;
  for (const field of fields) {
    if (options?.allowedFieldNames && !options.allowedFieldNames.has(field.name)) continue;
    const matching = configs.filter((c) => isApplicable(c) && c.fieldName === field.name);
    if (!matching.length) continue;
    const links = matching.map((c) =>
      buildDataLink(c, isClickHouseTarget(c.targetDatasourceUid), { app: options?.app })
    );
    field.config = {
      ...field.config,
      links: [...(field.config?.links ?? []), ...links],
    };
  }
}
