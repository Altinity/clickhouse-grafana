import React from 'react';
import { InlineField, InlineLabel, Select } from '@grafana/ui';
import { CONTEXT_WINDOW_OPTIONS } from '../../constants'
import { SelectProps } from '../../types';

export const ContextWindowSizeSelect: React.FC<SelectProps> = ({ query, onChange }) => (
  <InlineField label={<InlineLabel width={'auto'}>Context window</InlineLabel>}>
    <Select
      width={'auto'}
      data-testid="context-window-size-select"
      onChange={onChange}
      options={CONTEXT_WINDOW_OPTIONS}
      value={query.contextWindowSize}
    />
  </InlineField>
);
