import React from 'react';
import { InlineField, InlineLabel, InlineSwitch } from '@grafana/ui';
import { SwitchProps } from '../../types';

export const MetadataSwitch: React.FC<SwitchProps> = ({ query, onChange }) => (
  <InlineField
    label={
      <InlineLabel width={18} tooltip="Add /* $__dashboard $__user */ to query">
        Add metadata
      </InlineLabel>
    }
    style={{ height: '100%' }}
  >
    <InlineSwitch
      data-testid="metadata-switch"
      width="auto"
      value={query.add_metadata}
      onChange={onChange}
      transparent
    />
  </InlineField>
);
