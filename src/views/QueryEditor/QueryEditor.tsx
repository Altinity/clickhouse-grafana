import React, {useEffect, useState, useMemo, useCallback} from 'react';
import {CoreApp, QueryEditorProps} from '@grafana/data';
import {CHDataSource} from '../../datasource/datasource';
import {CHDataSourceOptions, CHQuery, DatasourceMode, EditorMode} from '../../types/types';
import {QueryHeader} from './components/QueryHeader/QueryHeader';
import {QueryTextEditor} from './components/QueryTextEditor/QueryTextEditor';
import {QueryBuilder} from './components/QueryBuilder/QueryBuilder';
import {Alert} from '@grafana/ui';
import {useQueryState} from './hooks/useQueryState';
import {useFormattedData} from './hooks/useFormattedData';
import {initializeQueryDefaults, initializeQueryDefaultsForVariables} from './helpers/initializeQueryDefaults';
import './QueryEditor.css';
import {getAdhocFilters} from './helpers/getAdHocFilters';

export function QueryEditor(props: QueryEditorProps<CHDataSource, CHQuery, CHDataSourceOptions>): any {
  const { datasource, query, onChange, onRunQuery, data } = props;
  const isAnnotationView = !props.app;
  
  // Memoize the initialized query to prevent recreating it on every render
  const initializedQuery = useMemo(() => 
    initializeQueryDefaults(query, isAnnotationView, datasource),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query.refId, query.initialized, isAnnotationView, datasource.uid]
  );
  
  // Handle initialization only when needed
  useEffect(() => {
    if (!query.initialized && datasource.defaultValues) {
      onChange({ ...initializedQuery, initialized: true });
    }
  }, [query.initialized, datasource.defaultValues, initializedQuery, onChange]);
  
  const [formattedData, error] = useFormattedData(initializedQuery, datasource, data?.request, onChange);

  const [editorMode, setEditorMode] = useState(initializedQuery.editorMode || EditorMode.Builder);
  useQueryState(query, onChange, datasource);

  const onSqlChange = useCallback((sql: string) => onChange({ ...query, query: sql }), [onChange, query]);
  const onFieldChange = useCallback((field: any) => onChange({ ...query, [field.fieldName]: field.value }), [onChange, query]);
  const onTriggerQuery = useCallback(() => onRunQuery(), [onRunQuery]);

  // @ts-ignore
  const adHocFilters = useMemo(() => getAdhocFilters(datasource?.name, query.datasource?.uid), [datasource?.name, query.datasource?.uid]);
  // @ts-ignore
  const adHocFiltersKey = useMemo(() => adHocFilters.map(({ key, operator, value }) => `${key}${operator}${value}`).join(','), [adHocFilters]);
  const areAdHocFiltersAvailable = !!adHocFilters.length;

  useEffect(() => {
    if (props.app !== CoreApp.Explore) {
      onChange({ ...query, adHocFilters: adHocFilters });
    }

    // eslint-disable-next-line
  }, [props.app, adHocFiltersKey]);

  return (
    <>
      <QueryHeader
        query={query}
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
          query={query}
          datasource={datasource}
          onChange={(items: CHQuery) => onChange({ ...items })}
          onRunQuery={onTriggerQuery}
        />
      )}
      {editorMode === EditorMode.SQL && (
        <QueryTextEditor
          adhocFilters={query.adHocFilters}
          areAdHocFiltersAvailable={areAdHocFiltersAvailable}
          query={query}
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

export function QueryEditorVariable(props: QueryEditorProps<CHDataSource, CHQuery, CHDataSourceOptions>): any {

  const { datasource, query, onChange, onRunQuery } = props;
  let processedQuery
  if (typeof props.query as string | CHQuery === 'string') {
    processedQuery = {query: query, datasourceMode: DatasourceMode.Variable }
  } else {
    processedQuery = query
  };

  const isAnnotationView = false
  
  // Memoize the initialized query to prevent recreating it on every render
  const initializedQuery = useMemo(() => 
    initializeQueryDefaultsForVariables(processedQuery, isAnnotationView, datasource),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [processedQuery.query, processedQuery.datasourceMode, isAnnotationView, datasource.uid]
  );
  
  // Handle initialization only when needed
  useEffect(() => {
    if (!processedQuery.initialized && datasource.defaultValues) {
      onChange({ ...initializedQuery, initialized: true });
    }
  }, [processedQuery.initialized, datasource.defaultValues, initializedQuery, onChange]);
  
  const [formattedData, error] = useFormattedData(initializedQuery, datasource, undefined, onChange);
  const [editorMode, setEditorMode] = useState(initializedQuery.editorMode || EditorMode.Builder);

  useQueryState(query, onChange, datasource);
  const onSqlChange = useCallback((sql: string) => onChange({ ...processedQuery, query: sql }), [onChange, processedQuery]);
  const onFieldChange = useCallback((field: any) => onChange({ ...processedQuery, [field.fieldName]: field.value }), [onChange, processedQuery]);
  const onTriggerQuery = useCallback(() => onRunQuery(), [onRunQuery]);

  // @ts-ignore
  const adHocFilters = useMemo(() => getAdhocFilters(datasource?.name, query.datasource?.uid), [datasource?.name, query.datasource?.uid]);
  // @ts-ignore
  const adHocFiltersKey = useMemo(() => adHocFilters.map(({ key, operator, value }) => `${key}${operator}${value}`).join(','), [adHocFilters]);
  const areAdHocFiltersAvailable = !!adHocFilters.length;

  useEffect(() => {
    if (props.app !== CoreApp.Explore) {
      onChange({ ...processedQuery, adHocFilters: adHocFilters });
    }
    // eslint-disable-next-line
  }, [props.app, adHocFiltersKey]);

  return (
    <>
      <QueryHeader
        query={processedQuery}
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
          query={processedQuery}
          datasource={datasource}
          onChange={(items: CHQuery) => onChange({ ...items })}
          onRunQuery={onTriggerQuery}
        />
      )}
      {editorMode === EditorMode.SQL && (
        <QueryTextEditor
          adhocFilters={processedQuery.adHocFilters}
          areAdHocFiltersAvailable={areAdHocFiltersAvailable}
          query={processedQuery}
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
