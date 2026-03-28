import React from 'react';
import { SelectableValue } from '@grafana/data';
import { InlineField, InlineLabel, Select, Alert } from '@grafana/ui';
import { Query } from '../../types';

const STREAMING_MODE_OPTIONS: Array<SelectableValue<string>> = [
  {
    label: 'Delta',
    value: 'delta',
    description: 'Only fetches new data since the last poll. Requires $timeFilter macro.',
  },
  {
    label: 'Full refresh',
    value: 'full',
    description: 'Re-runs the full query each poll. Use for lightweight queries without time macros.',
  },
];

export interface StreamingModeSelectProps {
  query: Query;
  onChange: (e: SelectableValue<string>) => void;
}

const TIME_MACRO_PATTERN = /\$timeFilter|\$timeFilterMs|\$timeFilter64ByColumn|\$timeFilterByColumn/;

export const StreamingModeSelect: React.FC<StreamingModeSelectProps> = ({ query, onChange }) => {
  const mode = query.streamingMode || 'delta';
  const queryText = query.query || '';
  const hasTimeMacro = TIME_MACRO_PATTERN.test(queryText);
  const showWarning = mode === 'delta' && !hasTimeMacro && queryText.length > 0;

  return (
    <>
      <InlineField
        label={
          <InlineLabel
            width={18}
            tooltip={
              'Delta: first poll fetches full range, subsequent polls fetch only new data since the last tick. ' +
              'Reduces ClickHouse load for heavy queries. Requires $timeFilter or $timeFilterMs macro in the query. ' +
              '\n\n' +
              'Full refresh: re-runs the entire query on every poll. ' +
              'Better for lightweight queries or queries without time filter macros. ' +
              'Data is only sent to the panel when the result actually changes.'
            }
          >
            Streaming mode
          </InlineLabel>
        }
      >
        <Select
          width={16}
          data-testid="streaming-mode-select"
          onChange={onChange}
          options={STREAMING_MODE_OPTIONS}
          value={mode}
        />
      </InlineField>
      {showWarning && (
        <Alert title="" severity="warning" style={{ padding: '4px 8px', margin: '0 0 0 8px' }}>
          Delta mode requires $timeFilter or $timeFilterMs macro in the query to limit the time range
        </Alert>
      )}
    </>
  );
};
