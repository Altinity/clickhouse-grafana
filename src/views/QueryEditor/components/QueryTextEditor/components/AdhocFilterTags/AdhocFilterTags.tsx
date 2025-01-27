import React from 'react';
import { TagsInput } from '@grafana/ui';
import { AdhocFilterTagsProps, AdhocFilter } from '../../types';

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
      className="adhoc-filters-tags"
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
