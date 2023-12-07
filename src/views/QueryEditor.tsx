import React from 'react';
import {Button, CodeEditor, Icon, Popover, Select, Spinner} from '@grafana/ui';
import {QueryEditorProps} from '@grafana/data';
import {CHDataSource} from '../datasource';
import {CHDataSourceOptions, CHQuery, DateTimeColumnSelectorType, EditorMode} from '../types';
import {QueryHeader} from "../components/QueryHeader";
import {DateTimeTypeSelector} from "../components/DateTimeTypeSelector";
import {ColumnSelector} from "../components/ColumnSelector";

type CHQueryEditorProps = QueryEditorProps<CHDataSource, CHQuery, CHDataSourceOptions>;

const defaultQuery = "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t";
export function QueryEditor(props: CHQueryEditorProps) {
  const {datasource, query, onChange, onRunQuery} = props
  // const datasource = props.datasource
  const [tableLoading, setTableLoading] = React.useState<boolean>(false);

  const databasesList = [
    {disable: true, label: '-- database --'}
  ]
  const tableList = [
    {disable: true, label: '-- table --'}
  ]


  /*
  const formatsList = [
    {label: 'Time series', value: 'time_series'},
    {label: 'Table', value: 'table'},
    {label: 'Logs', value: 'logs'},
  ];
  */
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

  const onDatabaseChanged = () => {
    setTableLoading(true)
  };

  const onTableChanged = () => {
    setTableLoading(true)
  }

  /* @todo add auto-complete suggestions and syntax colors here */
  const onSQLEditorMount = (editor: any) => {

  };
  const calculateEditorHeight = (): number => {
    return 100;
  };
  const [showDateColumnPopover, setShowDateColumnPopover] = React.useState(false);
  const dateColumnIconRef = React.useRef(null);
  const onDateColPopupMouseEnter = () => {
    setShowDateColumnPopover(true);
  };

  const onDateColPopupMouseLeave = () => {
    setShowDateColumnPopover(false);
  };

  const switchToSQLMode = () => {
    query.editorMode = EditorMode.SQL
    onChange(query)
  };
  return (
    <>
      <QueryHeader query={query} onChange={onChange} onRunQuery={onRunQuery} />
      {
        (query.editorMode === EditorMode.Builder || !query.rawQuery) &&
        <>
          <div className="gf-form-inline">
            <div className="gf-form">
              <label className="gf-form-label query-keyword width-7">
                FROM
                {tableLoading &&
                  <Spinner inline={true}/>
                }
              </label>
              <Select options={databasesList} onChange={onDatabaseChanged}/>
              <Select options={tableList} onChange={onTableChanged}/>
            </div>
          </div>
          <DateTimeTypeSelector query={query} onChange={onChange} onRunQuery={onRunQuery} />
          <ColumnSelector selectorType={DateTimeColumnSelectorType.DateTime} query={query} datasource={datasource} onChange={onChange} onRunQuery={onRunQuery} />
          <div className="gf-form">
            <label className="gf-form-label query-keyword width-10">
              <Icon
                name="info-circle"
                ref={dateColumnIconRef}
                onMouseEnter={onDateColPopupMouseEnter}
                onMouseLeave={onDateColPopupMouseLeave}
                style={{ marginRight: '10px' }}
              />
              {dateColumnIconRef.current != null &&
                <Popover
                  onMouseEnter={onDateColPopupMouseEnter}
                  onMouseLeave={onDateColPopupMouseLeave}
                  referenceElement={dateColumnIconRef.current} show={showDateColumnPopover} content={
                  <div style={{width: "200px", backgroundColor:"black"}}>
                    Select
                    <a rel="noreferrer" href="https://clickhouse.tech/docs/en/sql-reference/data-types/date/" target = "_blank" >Date</a>
                    column for binding with Grafana range selector
                  </div>
                } />
              }
              Column:Date
            </label>
          </div>
          <ColumnSelector selectorType={DateTimeColumnSelectorType.Date} query={query} datasource={datasource} onChange={onChange} onRunQuery={onRunQuery} />
          <div className="gf-form">
            <Button className="btn btn-inverse gf-form-btn query-keyword" onClick={switchToSQLMode}>
              <i className="fa fa-arrow-right"></i>&nbsp;Go to Query
            </Button>
          </div>

        </>
      }
      { ( (query.rawQuery && query.editorMode !== EditorMode.Builder) || query.editorMode === EditorMode.SQL) &&
        <>
          <div style={{position:"relative",width:"100%"}}>
            <CodeEditor
              aria-label="SQL"
              height={calculateEditorHeight()}
              language="sql"
              value={query.query || ''}
              showMiniMap={false}
              showLineNumbers={true}
              onSave={onSqlChange}
              onBlur={(sql) => onSqlChange(sql)}
              onEditorDidMount={(editor: any) => onSQLEditorMount(editor)}
            />
          </div>
          <div className="gf-form"></div>
        </>
      }
    </>
  );
}
