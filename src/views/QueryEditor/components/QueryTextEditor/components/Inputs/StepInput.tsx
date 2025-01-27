import React from 'react';
import { InlineField, InlineLabel, Input } from '@grafana/ui';
import { InputProps } from '../../types';

export const StepInput: React.FC<InputProps> = ({ query, handleStepChange }) => (
  <InlineField
    label={
      <InlineLabel width={10} tooltip="Leave blank for auto handling based on time range and panel width">
        Step
      </InlineLabel>
    }
  >
    <Input 
      placeholder="" 
      onChange={handleStepChange} 
      data-testid="interval-input" 
      value={query.interval} 
    />
  </InlineField>
);
