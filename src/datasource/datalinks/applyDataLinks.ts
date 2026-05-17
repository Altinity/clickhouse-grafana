import { buildDataLink, isClickHouseTarget } from './buildDataLink';
import { DataLinkConfig } from './types';

interface MinimalField {
  name: string;
  config?: { links?: any[] } & Record<string, unknown>;
}

interface ApplyOptions {
  allowedFieldNames?: Set<string>;
  /** Grafana app context (forwarded to buildDataLink for targetBlank). */
  app?: string;
}

export function applyDataLinks(
  fields: MinimalField[],
  configs: DataLinkConfig[] | undefined,
  options?: ApplyOptions,
): void {
  if (!configs?.length) return;
  for (const field of fields) {
    if (options?.allowedFieldNames && !options.allowedFieldNames.has(field.name)) continue;
    const matching = configs.filter((c) => c.fieldName && c.fieldName === field.name);
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
