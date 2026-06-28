import { DataLink } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { DataLinkConfig } from './types';
import { DatasourceMode } from '../../types/types';

const CH_PLUGIN_ID = 'vertamedia-clickhouse-datasource';

export function isClickHouseTarget(uid: string): boolean {
  if (!uid) return false;
  const settings = getDataSourceSrv().getInstanceSettings(uid);
  return settings?.type === CH_PLUGIN_ID;
}

export interface BuildDataLinkOptions {
  /**
   * The Grafana app context the query was issued from (e.g. 'explore', 'dashboard').
   * Drives `targetBlank` behaviour: in Explore, links open in a split pane
   * (targetBlank=false); in Dashboards / alerting, they open in a new tab.
   * Mirrors the convention used by the official Grafana ClickHouse plugin.
   */
  app?: string;
}

export function buildDataLink(
  config: DataLinkConfig,
  targetIsClickHouse: boolean,
  options?: BuildDataLinkOptions
): DataLink {
  // In Explore the natural target is the split pane → don't open a new tab.
  // Anywhere else (Dashboard, alerting), opening in a new tab keeps the
  // current dashboard intact. Same heuristic as the official Grafana CH plugin.
  const targetBlank = !!(options?.app && options.app !== 'explore');

  // External URL takes precedence — when `url` is set, internal-link fields
  // are ignored. Grafana interpolates ${__value.raw} etc. at click time.
  if (config.url) {
    return { title: config.title, url: config.url, targetBlank };
  }
  if (targetIsClickHouse) {
    const link: DataLink = {
      title: config.title,
      url: '',
      targetBlank,
      internal: {
        datasourceUid: config.targetDatasourceUid,
        datasourceName: '',
        query: {
          refId: 'datalink',
          query: config.query,
          rawQuery: config.query,
          format: config.format ?? 'table',
          datasourceMode: DatasourceMode.Datasource,
          extrapolate: false,
          adHocFilters: [],
          showHelp: false,
          showFormattedSQL: false,
        },
      },
    };
    // For trace navigation, pin the clicked span so Grafana's TraceView panel
    // scrolls to and highlights it. Matches the official plugin's UX.
    if (config.format === 'traces' && link.internal) {
      link.internal.panelsState = { trace: { spanId: '${__value.raw}' } };
    }
    return link;
  }
  return {
    title: config.title,
    url: '',
    targetBlank,
    internal: {
      datasourceUid: config.targetDatasourceUid,
      datasourceName: '',
      query: { refId: 'datalink', query: config.query },
    },
  };
}
