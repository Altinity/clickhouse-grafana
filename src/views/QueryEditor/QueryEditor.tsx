import React, {useEffect, useState} from 'react';
import {QueryEditorProps} from '@grafana/data';
import {CHDataSource} from '../../datasource/datasource';
import {CHDataSourceOptions, CHQuery, EditorMode} from '../../types/types';
import {QueryHeader} from './components/QueryHeader/QueryHeader';
import {QueryTextEditor} from './components/QueryTextEditor/QueryTextEditor';
import {QueryBuilder} from './components/QueryBuilder/QueryBuilder';
import SqlQuery from '../../datasource/sql-query/sql_query';
import {initiateEditor} from "./components/QueryTextEditor/editor/initiateEditor";

const defaultQuery = 'SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t';

export function QueryEditor(props: QueryEditorProps<CHDataSource, CHQuery, CHDataSourceOptions>) {
  const { datasource, query, onChange, onRunQuery } = props;
  const [editorMode, setEditorMode] = useState(EditorMode.Builder);
  const initializedQuery = initializeQueryDefaults(query);
  const [formattedData, setFormattedData] = useState(initializedQuery.query);

  useEffect(() => {
    initiateEditor()
  }, []);

  useEffect(() => {
    if (datasource.options && datasource.templateSrv) {
      const queryModel = new SqlQuery(query, datasource.templateSrv, datasource.options);
      // @ts-ignore
      const adhocFilters = datasource.templateSrv.getAdhocFilters(datasource.name);
      const replaced = queryModel.replace(datasource.options, adhocFilters);
      setFormattedData(replaced);
    }
  }, [query, datasource.name, datasource.options, datasource.templateSrv]);
  const onSqlChange = (sql: string) => {
    onChange({ ...initializedQuery, query: sql });
    onRunQuery();
  };

  const onSQLEditorMount = (editor: any) => {
    // @todo: add auto-complete suggestions and syntax colors here
  };

  // const calculateEditorHeight = (): number => 100;

  const onFieldChange = (value: any) => {
    onChange({ ...query, ...value });
  };

  return (
    <>
      <QueryHeader query={initializedQuery} editorMode={editorMode} setEditorMode={setEditorMode} />
      {editorMode === EditorMode.Builder && (
        <QueryBuilder query={initializedQuery} datasource={datasource} onChange={onChange} setEditorMode={setEditorMode} onRunQuery={onRunQuery} />
      )}
      {editorMode === EditorMode.SQL && (
        <>
          <QueryTextEditor
            query={initializedQuery}
            height={200}
            onEditorMount={onSQLEditorMount}
            onSqlChange={onSqlChange}
            onFieldChange={onFieldChange}
            formattedData={formattedData}
          />
        </>
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
    round: query.round || '0s',
    intervalFactor: query.intervalFactor || 1,
    query: query.query || defaultQuery,
    formattedQuery: query.formattedQuery || query.query,
    editorMode: EditorMode.Builder,
  };
}
