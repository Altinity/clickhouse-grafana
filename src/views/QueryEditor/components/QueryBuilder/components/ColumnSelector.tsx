import React from 'react';
import { Segment } from '@grafana/ui';
import { CHQuery, DateTimeColumnSelectorType } from '../../../../../types/types';
import { SelectableValue } from '@grafana/data';
import { CHDataSource } from '../../../../../datasource/datasource';

interface DateTimeColumnSelectorProps {
  datasource: CHDataSource;
  query: CHQuery;
  selectorType: DateTimeColumnSelectorType;
  onChange: (query: CHQuery) => void;
  onRunQuery: () => void;
}

export const ColumnSelector = ({
  datasource,
  query,
  selectorType,
  onChange,
  onRunQuery,
}: DateTimeColumnSelectorProps) => {
  const [columnList, setColumnList] = React.useState<Array<{ label: any; value: any }>>([]);

  React.useEffect(() => {
    const buildExploreQuery = (type: string): string => {
      switch (type) {
        case 'DATE':
          return (
            'SELECT name ' +
            'FROM system.columns ' +
            "WHERE database = '" +
            query.database +
            "' AND " +
            "table = '" +
            query.table +
            "' AND " +
            "match(type,'^Date$|^Date\\([^)]+\\)$') " +
            'ORDER BY name ' +
            "UNION ALL SELECT ' ' AS name"
          );
        case 'DATETIME':
          return (
            'SELECT name ' +
            'FROM system.columns ' +
            "WHERE database = '" +
            query.database +
            "' AND " +
            "table = '" +
            query.table +
            "' AND " +
            "match(type,'^DateTime$|^DateTime\\([^)]+\\)$') " +
            'ORDER BY name'
          );
        case 'DATETIME64':
          return (
            'SELECT name ' +
            'FROM system.columns ' +
            "WHERE database = '" +
            query.database +
            "' AND " +
            "table = '" +
            query.table +
            "' AND " +
            "type LIKE 'DateTime64%' " +
            'ORDER BY name'
          );
        case 'TIMESTAMP':
          return (
            'SELECT name ' +
            'FROM system.columns ' +
            "WHERE database = '" +
            query.database +
            "' AND " +
            "table = '" +
            query.table +
            "' AND " +
            "type = 'UInt32' " +
            'ORDER BY name'
          );
      }
      return '';
    };
    const loadColumnList = async () => {
      let exploreType = 'DATETIME';
      if (selectorType === DateTimeColumnSelectorType.Date) {
        exploreType = 'DATE';
      }
      if (selectorType === DateTimeColumnSelectorType.DateTime) {
        exploreType = query.dateTimeType!;
      }
      let result = await datasource.metricFindQuery(buildExploreQuery(exploreType));
      return result.map((row) => {
        return { label: row.text, value: row.text };
      });
    };
    loadColumnList().then(setColumnList);
  }, [selectorType, datasource, query]);

  const onDateTimeColumnChanged = (selectedColumn: SelectableValue) => {
    switch (selectorType) {
      case DateTimeColumnSelectorType.Date: {
        query.dateColDataType = selectedColumn.value;
        break;
      }
      case DateTimeColumnSelectorType.DateTime: {
        query.dateTimeColDataType = selectedColumn.value;
      }
    }
    onChange(query);
    onRunQuery();
  };

  const currentValue =
    selectorType === DateTimeColumnSelectorType.Date ? query.dateColDataType : query.dateTimeColDataType;

  return (
    <div className="gf-form">
      <Segment options={columnList} value={currentValue} onChange={(e) => onDateTimeColumnChanged(e!)} />
    </div>
  );
};
