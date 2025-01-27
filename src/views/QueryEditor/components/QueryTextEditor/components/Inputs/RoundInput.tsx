import React from 'react';
import { InlineField, InlineLabel, Input } from '@grafana/ui';
import { RoundInputProps } from '../../types';

export const RoundInput: React.FC<RoundInputProps> = ({ query, handleRoundChange }) => (
  <InlineField
    label={
      <InlineLabel width={10} tooltip="Set rounding for $from and $to timestamps...">
        Round
      </InlineLabel>
    }
  >
    <Input 
      data-testid="round-input" 
      placeholder="" 
      onChange={handleRoundChange} 
      value={query.round} 
    />
  </InlineField>
);
