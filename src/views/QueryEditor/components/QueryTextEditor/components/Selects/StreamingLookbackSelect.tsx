import React from 'react';
import { SelectableValue } from '@grafana/data';
import { InlineField, InlineLabel, Select } from '@grafana/ui';
import { Query } from '../../types';

const LOOKBACK_OPTIONS: Array<SelectableValue<number>> = [
  { label: '0',  value: 0,  description: 'No lookback — append only' },
  { label: '1',  value: 1,  description: 'Re-check last 1 point' },
  { label: '2',  value: 2,  description: 'Re-check last 2 points' },
  { label: '3',  value: 3,  description: 'Re-check last 3 points' },
  { label: '5',  value: 5,  description: 'Re-check last 5 points' },
  { label: '10', value: 10, description: 'Re-check last 10 points' },
];

export interface StreamingLookbackSelectProps {
  query: Query;
  onChange: (e: SelectableValue<number>) => void;
}

export const StreamingLookbackSelect: React.FC<StreamingLookbackSelectProps> = ({ query, onChange }) => (
  <InlineField
    label={
      <InlineLabel
        width={18}
        tooltip={
          'Number of recent data points to re-query on each poll. ' +
          'Useful when the last few GROUP BY buckets may be incomplete ' +
          '(still receiving data). Higher values ensure accuracy but increase query load.'
        }
      >
        Lookback points
      </InlineLabel>
    }
  >
    <Select
      width={12}
      data-testid="streaming-lookback-select"
      onChange={onChange}
      options={LOOKBACK_OPTIONS}
      value={query.streamingLookback ?? 1}
    />
  </InlineField>
);
