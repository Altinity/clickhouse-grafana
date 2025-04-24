import React from 'react';
import { InlineField, InlineLabel, InlineSwitch } from '@grafana/ui';
import { SwitchProps } from '../../types';

export const NullifySparseSwitch: React.FC<SwitchProps> = ({ query, onChange }) => (
  <InlineField
    label={
      <InlineLabel width={18} tooltip="Replace sparse categories with NULL values">
        Nullify Sparse
      </InlineLabel>
    }
    style={{ height: '100%' }}
  >
    <InlineSwitch
      data-testid="nullify-sparse-switch"
      width="auto"
      value={query.nullifySparse}
      onChange={onChange}
      transparent
    />
  </InlineField>
); 
