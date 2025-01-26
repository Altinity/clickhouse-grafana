import React from 'react';
import { InlineField, InlineLabel, InlineSwitch } from '@grafana/ui';
import { SwitchProps } from '../../types';

export const SkipCommentsSwitch: React.FC<SwitchProps> = ({ query, onChange }) => (
  <InlineField
    label={
      <InlineLabel width={18} tooltip="Turn off if you would like pass comments in SQL query to server">
        Skip Comments
      </InlineLabel>
    }
    style={{ height: '100%' }}
  >
    <InlineSwitch
      data-testid="skip-comments-switch"
      width="auto"
      value={query.skip_comments}
      onChange={onChange}
      transparent
    />
  </InlineField>
);
