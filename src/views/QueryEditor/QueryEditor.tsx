import React from 'react';
import { QueryEditorProps } from '@grafana/data';
import { CHDataSource } from '../../datasource/datasource';
import { CHDataSourceOptions, CHQuery, EditorMode } from '../../types/types';
import { QueryHeader } from "./components/QueryHeader";
import { QueryTextEditor } from "./components/QueryTextEditor";
import { QueryBuilder } from "./components/QueryBuilder/QueryBuilder";

const defaultQuery = "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t";

export function QueryEditor(props: QueryEditorProps<CHDataSource, CHQuery, CHDataSourceOptions>) {
  const { datasource, query, onChange, onRunQuery } = props;

  const initializedQuery = initializeQueryDefaults(query);

  const onSqlChange = (sql: string) => {
    onChange({ ...initializedQuery, query: sql });
    onRunQuery();
  };

  const onSQLEditorMount = (editor: any) => {
    // @todo: add auto-complete suggestions and syntax colors here
  };

  const calculateEditorHeight = (): number => 100;

  return (
    <>
      <QueryHeader query={initializedQuery} onChange={onChange} onRunQuery={onRunQuery} />
      {initializedQuery.editorMode === EditorMode.Builder && !initializedQuery.rawQuery && (
        <QueryBuilder query={initializedQuery} datasource={datasource} onChange={onChange} onRunQuery={onRunQuery} />
      )}
      {(initializedQuery.rawQuery || initializedQuery.editorMode === EditorMode.SQL) && (
        <QueryTextEditor query={initializedQuery} height={calculateEditorHeight()} onEditorMount={onSQLEditorMount} onSqlChange={onSqlChange} />
      )}
    </>
  );
}

function initializeQueryDefaults(query: CHQuery): CHQuery {
  return {
    ...query,
    format: query.format || 'time_series',
    extrapolate: query.extrapolate ?? true,
    skip_comments: query.skip_comments ?? true,
    dateTimeType: query.dateTimeType || 'DATETIME',
    round: query.round || "0s",
    intervalFactor: query.intervalFactor || 1,
    query: query.query || defaultQuery,
    formattedQuery: query.formattedQuery || query.query,
  };
}
