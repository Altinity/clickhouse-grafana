import React from 'react';
import { InlineField, InlineLabel, Select } from '@grafana/ui';
import { RESOLUTION_OPTIONS } from '../../constants';
import { ResolutionInputProps } from '../../types';

export const ResolutionsInput: React.FC<ResolutionInputProps> = ({ query, handleResolutionChange }) => (
  <InlineField label={<InlineLabel width={'auto'}>Resolution</InlineLabel>}>
    <Select
      width={'auto'}
      data-testid="resolution-select"
      onChange={(e) => handleResolutionChange(Number(e.value))}
      options={RESOLUTION_OPTIONS}
      value={query.intervalFactor}
    />
  </InlineField>
);
