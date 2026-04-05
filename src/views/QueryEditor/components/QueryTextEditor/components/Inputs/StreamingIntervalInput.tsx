import React from 'react';
import { SelectableValue } from '@grafana/data';
import { InlineField, InlineLabel, Select } from '@grafana/ui';
import { Query } from '../../types';

const INTERVAL_OPTIONS: Array<SelectableValue<number>> = [
  { label: '1s',  value: 1000,  description: 'Real-time monitoring' },
  { label: '2s',  value: 2000,  description: 'Near real-time' },
  { label: '5s',  value: 5000,  description: 'Default — balanced' },
  { label: '10s', value: 10000, description: 'Moderate refresh' },
  { label: '30s', value: 30000, description: 'Overview dashboards' },
  { label: '1m',  value: 60000, description: 'Infrequent updates' },
];

export interface StreamingIntervalInputProps {
  query: Query;
  handleStreamingIntervalChange: (e: SelectableValue<number>) => void;
}

export const StreamingIntervalInput: React.FC<StreamingIntervalInputProps> = ({ query, handleStreamingIntervalChange }) => (
  <InlineField
    label={
      <InlineLabel
        width={18}
        tooltip="How often the plugin polls ClickHouse for new data. Lower values give faster updates but increase database load."
      >
        Poll interval
      </InlineLabel>
    }
  >
    <Select
      width={12}
      data-testid="streaming-interval-select"
      onChange={handleStreamingIntervalChange}
      options={INTERVAL_OPTIONS}
      value={query.streamingInterval || 5000}
    />
  </InlineField>
);
