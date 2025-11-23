import React, {useEffect, useState} from 'react';
import {CoreApp, QueryEditorProps, SelectableValue} from '@grafana/data';
import {CHDataSource} from '../../datasource/datasource';
import {CHDataSourceOptions, CHQuery, DatasourceMode, EditorMode} from '../../types/types';
import {QueryHeader} from './components/QueryHeader/QueryHeader';
import {QueryTextEditor} from './components/QueryTextEditor/QueryTextEditor';
import {QueryBuilder} from './components/QueryBuilder/QueryBuilder';
import {DataLinksConfig} from './components/DataLinksConfig/DataLinksConfig';
import {Alert} from '@grafana/ui';
import {useQueryState} from './hooks/useQueryState';
import {useFormattedData} from './hooks/useFormattedData';
import {useAutocompleteData} from './hooks/useAutocompletionData';
import {initializeQueryDefaults, initializeQueryDefaultsForVariables} from './helpers/initializeQueryDefaults';
import './QueryEditor.css';
import {getAdhocFilters} from './helpers/getAdHocFilters';
import {detectVariableMacroIntersections, createVariableMacroConflictWarning} from './helpers/detectVariableMacroIntersections';
import {getDataSourceSrv} from '@grafana/runtime';

export function QueryEditor(props: QueryEditorProps<CHDataSource, CHQuery, CHDataSourceOptions>): any {
  const { datasource, query, onChange, onRunQuery, data } = props;
  const isAnnotationView = !props.app;
  const initializedQuery = initializeQueryDefaults(query, isAnnotationView, datasource, onChange);
  const [formattedData, error] = useFormattedData(initializedQuery, datasource, data?.request);
  const { data: autocompleteData, hasPermissionError } = useAutocompleteData(datasource);
  const [availableDatasources, setAvailableDatasources] = useState<Array<SelectableValue<string>>>([]);

  console.log(props)

  // Fetch available datasources for DataLinksConfig
  useEffect(() => {
    const fetchDatasources = async () => {
      try {
        const datasources = await getDataSourceSrv().getList();
        const options = datasources.map(ds => ({
          label: ds.name,
          value: ds.uid,
          description: ds.type,
        }));
        setAvailableDatasources(options);
      } catch (error) {
        console.error('Failed to fetch datasources:', error);
      }
    };
    fetchDatasources();
  }, []);

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

  // Detect variable/macro name conflicts
  const variableMacroConflicts = detectVariableMacroIntersections();
  const conflictWarning = createVariableMacroConflictWarning(variableMacroConflicts);

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
        hasAutocompleteError={hasPermissionError}
      />
      {error ? <Alert title={error} elevated style={{ marginTop: '5px', marginBottom: '5px' }} /> : null}
      {conflictWarning ? (
        <Alert 
          title="Variable/Macro Name Conflict Warning" 
          severity="warning" 
          elevated 
          style={{ marginTop: '5px', marginBottom: '5px' }}
        >
          {conflictWarning}
        </Alert>
      ) : null}
      {editorMode === EditorMode.Builder && (
        <QueryBuilder
          query={initializedQuery}
          datasource={datasource}
          onChange={(items: CHQuery) => onChange({ ...items })}
          onRunQuery={onTriggerQuery}
        />
      )}
      {editorMode === EditorMode.SQL && (
        <>
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
            autocompleteData={autocompleteData}
          />
          <DataLinksConfig
            query={initializedQuery}
            onChange={onChange}
            datasources={availableDatasources}
          />
        </>
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

  // Detect variable/macro name conflicts
  const variableMacroConflicts = detectVariableMacroIntersections();
  const conflictWarning = createVariableMacroConflictWarning(variableMacroConflicts);

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
        hasAutocompleteError={false}
      />
      {error ? <Alert title={error} elevated style={{ marginTop: '5px', marginBottom: '5px' }} /> : null}
      {conflictWarning ? (
        <Alert 
          title="Variable/Macro Name Conflict Warning" 
          severity="warning" 
          elevated 
          style={{ marginTop: '5px', marginBottom: '5px' }}
        >
          {conflictWarning}
        </Alert>
      ) : null}
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
