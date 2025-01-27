import React, { useEffect, useState } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { CHDataSource } from '../../datasource/datasource';
import { CHDataSourceOptions, CHQuery, EditorMode } from '../../types/types';
import { QueryHeader } from './components/QueryHeader/QueryHeader';
import { QueryTextEditor } from './components/QueryTextEditor/QueryTextEditor';
import { QueryBuilder } from './components/QueryBuilder/QueryBuilder';
import { Alert } from '@grafana/ui';
import { useQueryState } from './hooks/useQueryState';
import { useFormattedData } from './hooks/useFormattedData';
import { initializeQueryDefaults } from './helpers/initializeQueryDefaults';
import './QueryEditor.css';
import { getAdhocFilters } from './helpers/getAdHocFilters';

export function QueryEditor(props: QueryEditorProps<CHDataSource, CHQuery, CHDataSourceOptions>): any {
  const { datasource, query, onChange, onRunQuery } = props;
  const isAnnotationView = !props.app;
  const initializedQuery = initializeQueryDefaults(query, isAnnotationView, datasource, onChange);
  const [formattedData, error] = useFormattedData(initializedQuery, datasource);
  const [editorMode, setEditorMode] = useState(initializedQuery.editorMode || EditorMode.Builder);
  useQueryState(query, onChange, datasource);

  const onSqlChange = (sql: string) => onChange({ ...initializedQuery, query: sql });
  const onFieldChange = (field: any) => onChange({ ...initializedQuery, [field.fieldName]: field.value });
  const onTriggerQuery = () => onRunQuery();

  // @ts-ignore
  const adHocFilters = getAdhocFilters(datasource?.name, query.datasource?.uid);
  // @ts-ignore
  const adHocFiltersKey = adHocFilters.map(({ key, operator, value }) => `${key}${operator}${value}`).join(',');
  const areAdHocFiltersAvailable = !!adHocFilters.length;

  useEffect(() => {
    if (props.app !== 'explore') {
      onChange({ ...initializedQuery, adHocFilters: adHocFilters });
    }
    // eslint-disable-next-line
  }, [props.app, adHocFiltersKey]);

  return (
    <>
      <QueryHeader
        query={initializedQuery}
        datasource={datasource}
        editorMode={editorMode}
        setEditorMode={setEditorMode}
        isAnnotationView={isAnnotationView}
        onTriggerQuery={onTriggerQuery}
        onChange={onChange}
      />
      {error ? <Alert title={error} elevated style={{ marginTop: '5px', marginBottom: '5px' }} /> : null}
      {editorMode === EditorMode.Builder && (
        <QueryBuilder
          query={initializedQuery}
          datasource={datasource}
          onChange={(items: CHQuery) => onChange({ ...items })}
          onRunQuery={onTriggerQuery}
        />
      )}
      {editorMode === EditorMode.SQL && (
        <QueryTextEditor
          adhocFilters={initializedQuery.adHocFilters}
          areAdHocFiltersAvailable={areAdHocFiltersAvailable}
          query={initializedQuery}
          onSqlChange={onSqlChange}
          onRunQuery={onTriggerQuery}
          onFieldChange={onFieldChange}
          formattedData={formattedData}
          datasource={datasource}
          isAnnotationView={isAnnotationView}
        />
      )}
    </>
  );
}
