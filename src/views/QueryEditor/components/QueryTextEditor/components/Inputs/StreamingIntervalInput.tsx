import React from 'react';
import { InlineField, InlineLabel, Input } from '@grafana/ui';
import { Query } from '../../types';

export interface StreamingIntervalInputProps {
  query: Query;
  handleStreamingIntervalChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const StreamingIntervalInput: React.FC<StreamingIntervalInputProps> = ({ query, handleStreamingIntervalChange }) => (
  <InlineField
    label={
      <InlineLabel
        width={18}
        tooltip="Polling interval in milliseconds (minimum 1000ms). How often the plugin queries ClickHouse for new data."
      >
        Poll interval (ms)
      </InlineLabel>
    }
  >
    <Input
      width={10}
      data-testid="streaming-interval-input"
      type="number"
      step={1000}
      placeholder="5000"
      value={query.streamingInterval ?? ''}
      onChange={handleStreamingIntervalChange}
    />
  </InlineField>
);
