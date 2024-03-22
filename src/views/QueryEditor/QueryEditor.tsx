import React, { useEffect, useState } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { CHDataSource } from '../../datasource/datasource';
import { CHDataSourceOptions, CHQuery, EditorMode } from '../../types/types';
import { QueryHeader } from './components/QueryHeader/QueryHeader';
import { QueryTextEditor } from './components/QueryTextEditor/QueryTextEditor';
import { QueryBuilder } from './components/QueryBuilder/QueryBuilder';
import SqlQuery from '../../datasource/sql-query/sql_query';
import { Alert } from "@grafana/ui";
import {useSystemDatabases} from "../hooks/useSystemDatabases";
import {useAutocompleteData} from "../hooks/useAutocompletionData";

const defaultQuery = 'SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t';
const DEFAULT_FORMAT = 'time_series';
const DEFAULT_DATE_TIME_TYPE = 'DATETIME';
const DEFAULT_ROUND = '0s';
const DEFAULT_INTERVAL_FACTOR = 1;

function useFormattedData(query: CHQuery, datasource: CHDataSource): [string, string | null] {
  useSystemDatabases(datasource)
  useAutocompleteData(datasource)
  const [formattedData, setFormattedData] = useState(query.query);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (datasource.options && datasource.templateSrv) {
        const queryModel = new SqlQuery(query, datasource.templateSrv, datasource.options);
        // @ts-ignore
        const adhocFilters = datasource.templateSrv.getAdhocFilters(datasource.name);
        const replaced = queryModel.replace(datasource.options, adhocFilters);
        setFormattedData(replaced);
        setError(null);
      }
    } catch (e: any) {
      setError(e?.message);
    }
  }, [query, datasource.name, datasource.options, datasource.templateSrv]);

  return [formattedData, error];
}

export function QueryEditor(props: QueryEditorProps<CHDataSource, CHQuery, CHDataSourceOptions>) {
  const { datasource, query, onChange, onRunQuery } = props;
  const [editorMode, setEditorMode] = useState(EditorMode.Builder);
  const initializedQuery = initializeQueryDefaults(query);
  const [externalQuery, setQuery] = useState({ ...initializedQuery });
  const [formattedData, error] = useFormattedData(initializedQuery, datasource);

  const onSqlChange = (sql: string) => {
    setQuery({ ...initializedQuery, query: sql });
  };

  const onFieldChange = (value: any) => {
    setQuery({ ...query, ...value });
  };

  const onTriggerQuery = () => {
    onChange(externalQuery);
    onRunQuery();
  };

  return (
    <>
      <QueryHeader query={initializedQuery} editorMode={editorMode} setEditorMode={setEditorMode} onTriggerQuery={onTriggerQuery} />
      {error ? <Alert title={error} elevated style={{marginTop: "5px", marginBottom: "5px"}}/> : null}
      {editorMode === EditorMode.Builder && (
        <QueryBuilder query={initializedQuery} datasource={datasource} onChange={onChange} onRunQuery={onRunQuery} />
      )}
      {editorMode === EditorMode.SQL && (
        <>
          <QueryTextEditor
            query={initializedQuery}
            height={200}
            onSqlChange={onSqlChange}
            onRunQuery={onTriggerQuery}
            onFieldChange={onFieldChange}
            formattedData={formattedData}
            datasource={datasource}
          />
        </>
      )}
    </>
  );
}

function initializeQueryDefaults(query: CHQuery): CHQuery {
  return {
    ...query,
    format: query.format || DEFAULT_FORMAT,
    extrapolate: query.extrapolate ?? true,
    skip_comments: query.skip_comments ?? true,
    dateTimeType: query.dateTimeType || DEFAULT_DATE_TIME_TYPE,
    round: query.round || DEFAULT_ROUND,
    intervalFactor: query.intervalFactor || DEFAULT_INTERVAL_FACTOR,
    query: query.query || defaultQuery,
    formattedQuery: query.formattedQuery || query.query,
    editorMode: EditorMode.Builder,
  };
}
