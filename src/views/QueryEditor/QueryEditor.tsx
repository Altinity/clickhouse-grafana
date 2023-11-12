import React from 'react';
import {QueryEditorProps} from '@grafana/data';
import {CHDataSource} from '../../datasource/datasource';
import {CHDataSourceOptions, CHQuery, EditorMode} from '../../types/types';
import {QueryHeader} from "./components/QueryHeader";
import {QueryTextEditor} from "./components/QueryTextEditor";
import {QueryBuilder} from "./components/QueryBuilder/QueryBuilder";

type CHQueryEditorProps = QueryEditorProps<CHDataSource, CHQuery, CHDataSourceOptions>;

const defaultQuery = "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t";

export function QueryEditor(props: CHQueryEditorProps) {
  const {datasource, query, onChange, onRunQuery} = props

  query.format = query.format || 'time_series';
  if (typeof query.extrapolate === 'undefined') {
    query.extrapolate = true;
  }
  if (typeof query.skip_comments === 'undefined') {
    query.skip_comments = true;
  }
  query.dateTimeType = query.dateTimeType || 'DATETIME';
  query.round = query.round || "0s";
  query.intervalFactor = query.intervalFactor || 1;
  query.query = query.query || defaultQuery;
  query.formattedQuery = query.formattedQuery || query.query;

  const onSqlChange = (sql: string) => {
    onChange({...query, query: sql});
    onRunQuery();
  };

  /* @todo add auto-complete suggestions and syntax colors here */
  const onSQLEditorMount = (editor: any) => {

  };
  const calculateEditorHeight = (): number => {
    return 100;
  };

  return (
    <>
      <QueryHeader query={query} onChange={onChange} onRunQuery={onRunQuery} />
      {
        ((query.editorMode === EditorMode.Builder || !query.rawQuery) && query.editorMode === EditorMode.Builder ) &&
        <QueryBuilder query={query} datasource={datasource} onChange={onChange} onRunQuery={onRunQuery} />
      }
      { ( (query.rawQuery && query.editorMode !== EditorMode.Builder) || query.editorMode === EditorMode.SQL) &&
        <QueryTextEditor query={query} height={calculateEditorHeight()} onEditorMount={(editor: any) => onSQLEditorMount(editor)} onSqlChange={onSqlChange}/>
      }
    </>
  );
}
