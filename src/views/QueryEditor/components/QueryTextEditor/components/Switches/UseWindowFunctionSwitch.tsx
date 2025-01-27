import React from 'react';
import { InlineField, InlineLabel, InlineSwitch } from '@grafana/ui';
import { SwitchProps } from '../../types';

export const UseWindowFunctionSwitch: React.FC<SwitchProps> = ({ query, onChange }) => (
  <InlineField
    label={
      <InlineLabel width={23} tooltip="Turn off if you would like use `runnindDifference` and `neighbor` functions for macros">
        Use window functions
      </InlineLabel>
    }
    style={{ height: '100%' }}
  >
    <InlineSwitch
      data-testid="use-window-func-for-macros"
      width="auto"
      value={query.useWindowFuncForMacros}
      onChange={onChange}
      transparent
    />
  </InlineField>
);
