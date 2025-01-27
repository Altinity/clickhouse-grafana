import React from 'react';
import { InlineField, InlineLabel, Select } from '@grafana/ui';
import { FORMAT_OPTIONS } from '../../constants';
import { SelectProps } from '../../types';

export const FormatAsSelect: React.FC<SelectProps> = ({ query, onChange }) => (
  <InlineField label={<InlineLabel width={'auto'}>Format As</InlineLabel>}>
    <Select
      width={'auto'}
      data-testid="format-as-select"
      onChange={onChange}
      options={FORMAT_OPTIONS}
      value={query.format}
    />
  </InlineField>
);
