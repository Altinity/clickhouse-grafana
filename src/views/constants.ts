import { TimestampFormat } from '../types/types';

export const defaultQuery = 'SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t';
export const DEFAULT_FORMAT = 'time_series';
export const DEFAULT_DATE_TIME_TYPE = TimestampFormat.DateTime;
export const DEFAULT_ROUND = '0s';
export const DEFAULT_INTERVAL_FACTOR = 1;

export const MONACO_EDITOR_OPTIONS: any = {
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  wrappingStrategy: 'advanced',
  scrollbar: {
    alwaysConsumeMouseWheel: false,
  },
  minimap: {
    enabled: false,
  },
  overviewRulerLanes: 0,
};
