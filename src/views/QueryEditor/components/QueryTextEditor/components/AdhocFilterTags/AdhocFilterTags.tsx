import React from 'react';
import { css } from '@emotion/css';
import { TagsInput } from '@grafana/ui';
import { AdhocFilterTagsProps, AdhocFilter } from '../../types';

const tagsInputClassName = css({
  margin: '5px 0',
  '> div': {
    display: 'none',
  },
});

export const AdhocFilterTags: React.FC<AdhocFilterTagsProps> = ({ 
  adhocFilters, 
  areAdHocFiltersAvailable, 
  onFieldChange 
}) => {
  if (areAdHocFiltersAvailable || adhocFilters.length === 0) {
    return null;
  }

  return (
    <TagsInput
      className={tagsInputClassName}
      tags={adhocFilters.map((filter: AdhocFilter) => 
        `${filter.key} ${filter.operator} ${filter.value}`
      )}
      onChange={(tagsList: string[]) => {
        onFieldChange({
          fieldName: 'adHocFilters',
          value: tagsList.map((item) => {
            const [key, operator, value] = item.split(' ');
            return { key, operator, value };
          }),
        });
      }}
    />
  );
};
