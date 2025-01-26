import React from 'react';
import { InlineField, InlineLabel, InlineSwitch } from '@grafana/ui';
import { SwitchProps } from '../../types';

export const ExtrapolationSwitch: React.FC<SwitchProps> = ({ query, onChange }) => (
  <InlineField
    label={
      <InlineLabel
        width={18}
        tooltip="Turn on if you don't like when last data point in time series much lower then previous"
      >
        Extrapolation
      </InlineLabel>
    }
  >
    <InlineSwitch
      transparent
      data-testid="extrapolate-switch"
      value={query.extrapolate}
      onChange={onChange}
    />
  </InlineField>
);
