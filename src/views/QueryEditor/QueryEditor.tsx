import React, {useEffect, useState} from 'react';
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
  const initializedQuery = initializeQueryDefaults(query, isAnnotationView, datasource, onChange);
  const [formattedData, error] = useFormattedData(initializedQuery, datasource, data?.request);

  useEffect(() => {
    if (formattedData !== initializedQuery.query) {
      onChange({ ...initializedQuery, rawQuery: formattedData })
    }

    // eslint-disable-next-line
  }, [formattedData, initializedQuery.query]);

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
    if (props.app !== CoreApp.Explore) {
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

export function QueryEditorVariable(props: QueryEditorProps<CHDataSource, CHQuery, CHDataSourceOptions>): any {

  const { datasource, query, onChange, onRunQuery } = props;
  let processedQuery
  if (typeof props.query as string | CHQuery === 'string') {
    processedQuery = {query: query, datasourceMode: DatasourceMode.Variable }
  } else {
    processedQuery = query
  };

  const isAnnotationView = false
  const initializedQuery = initializeQueryDefaultsForVariables(processedQuery, isAnnotationView, datasource, onChange);
  const [formattedData, error] = useFormattedData(initializedQuery, datasource);
  const [editorMode, setEditorMode] = useState(initializedQuery.editorMode || EditorMode.Builder);

  useEffect(() => {
    if (formattedData !== initializedQuery.query) {
      onChange({ ...initializedQuery, rawQuery: formattedData })
    }

    // eslint-disable-next-line
  }, [formattedData, initializedQuery.query]);

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
    if (props.app !== CoreApp.Explore) {
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
