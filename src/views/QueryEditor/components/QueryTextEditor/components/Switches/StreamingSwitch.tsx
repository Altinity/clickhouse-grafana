import React from 'react';
import { InlineField, InlineLabel, InlineSwitch } from '@grafana/ui';
import { SwitchProps } from '../../types';

export const StreamingSwitch: React.FC<SwitchProps> = ({ query, onChange }) => (
  <InlineField
    label={
      <InlineLabel
        width={18}
        tooltip="Enable streaming mode: the plugin will continuously poll ClickHouse and push new data to the panel in real time"
      >
        Streaming
      </InlineLabel>
    }
  >
    <InlineSwitch
      transparent
      data-testid="streaming-switch"
      value={query.streaming}
      onChange={onChange}
    />
  </InlineField>
);
