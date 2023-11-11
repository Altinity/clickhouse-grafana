import React, {useState} from 'react';
import {
  Button,
  CodeEditor,
  Icon,
  InlineField,
  InlineFieldRow,
  InlineLabel, InlineSwitch,
  Input,
  PanelContainer,
  Popover,
  Select,
  Spinner,
  Switch, ToolbarButton
} from '@grafana/ui';
import {QueryEditorProps} from '@grafana/data';
import {CHDataSource} from '../datasource';
import {CHDataSourceOptions, CHQuery, DateTimeColumnSelectorType, EditorMode} from '../types';
import {QueryHeader} from "./components/QueryHeader";
import {DateTimeTypeSelector} from "../components/DateTimeTypeSelector";
import {ColumnSelector} from "../components/ColumnSelector";
import {login} from "@grafana/e2e";
import QueryMacrosInfo from "./components/QueryMacrosInfo";

type CHQueryEditorProps = QueryEditorProps<CHDataSource, CHQuery, CHDataSourceOptions>;

const defaultQuery = "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t";


const QueryBuilder = ({query, onRunQuery, onChange, datasource}: any) => {
  const [tableLoading, setTableLoading] = React.useState<boolean>(false);
  const [showDateColumnPopover, setShowDateColumnPopover] = React.useState(false);

  const dateColumnIconRef = React.useRef(null);
  const onDatabaseChanged = () => {
    setTableLoading(true)
  };

  const onTableChanged = () => {
    setTableLoading(true)
  }

  const databasesList = [
    {disable: true, label: '-- database --'}
  ]
  const tableList = [
    {disable: true, label: '-- table --'}
  ]

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
  return <>
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

const QueryTextEditor = ({query, height, onEditorMount, onSqlChange}: any) => {
  const [showFormattedSQL, setShowFormattedSQL] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  return <>
    <div style={{position:"relative",width:"100%", marginTop: '10px'}}>
      <CodeEditor
        aria-label="SQL"
        height={height}
        language="sql"
        value={query.query || ''}
        showMiniMap={false}
        showLineNumbers={true}
        onSave={onSqlChange}
        onBlur={(sql) => onSqlChange(sql)}
        onEditorDidMount={onEditorMount}
      />
    </div>
    <div className="gf-form" style={{display: 'flex', flexDirection:"column", marginTop: '10px'}}>
      <InlineFieldRow>
        <InlineField label={'Step'} transparent>
          <Input placeholder="Label" />
        </InlineField>
        <InlineField label={<InlineLabel width="auto" tooltip="Tooltip content" transparent>
          Resolution
        </InlineLabel>} transparent>
          <Select
            width={16}
            onChange={() => {}}
            options={[
              { value: 0, label: '1/1' },
              { value: 1, label: '1/2' },
              { value: 2, label: '1/3' },
              { value:3, label: '1/4' },
              { value: 4, label: '1/5' },
              { value: 5, label: '1/10' },
            ]}
          />
        </InlineField>
        <InlineField label="Round" transparent>
          <Input placeholder="Label" />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label="Format as" transparent>
          <Select
            width={16}
            onChange={() => {}}
            options={[
              {label: 'Time series', value: 'time_series'},
              {label: 'Table', value: 'table'},
              {label: 'Logs', value: 'logs'},
            ]}
          />
        </InlineField>
        <InlineField label="Extrapolation" transparent>
          <InlineSwitch value={true} onChange={() => {}} transparent/>
        </InlineField>
        <InlineField label="Skip comments" style={{height: "100%"}} transparent>
            <InlineSwitch value={true} onChange={() => {}} transparent/>
        </InlineField>
        <InlineField transparent>
          <ToolbarButton
            // variant={args.variant}
            // disabled={args.disabled}
            // fullWidth={args.fullWidth}
            // icon={args.icon}
            // tooltip={args.tooltip}
            // isOpen={args.isOpen}
            // isHighlighted={args.isHighlighted}
            // imgSrc={args.imgSrc}
            // imgAlt={args.imgAlt}
            onClick={() => setShowHelp(!showHelp)}
            isOpen={showHelp}
          >
            Show help
          </ToolbarButton>
        </InlineField>
        <InlineField transparent>
          <ToolbarButton
            // variant={args.variant}
            // disabled={args.disabled}
            // fullWidth={args.fullWidth}
            // icon={args.icon}
            // tooltip={args.tooltip}
            isOpen={showFormattedSQL}
            onClick={() => setShowFormattedSQL(!showFormattedSQL)}
            // isHighlighted={args.isHighlighted}
            // imgSrc={args.imgSrc}
            // imgAlt={args.imgAlt}
          >
            Show reformated SQL
          </ToolbarButton>
        </InlineField>
        <InlineField transparent>
          <ToolbarButton
            // variant={args.variant}
            // disabled={args.disabled}
            // fullWidth={args.fullWidth}
            // icon={args.icon}
            // tooltip={args.tooltip}
            // isOpen={args.isOpen}
            // isHighlighted={args.isHighlighted}
            // imgSrc={args.imgSrc}
            // imgAlt={args.imgAlt}
          >
            Generate query
          </ToolbarButton>
        </InlineField>
      </InlineFieldRow>
      { showHelp && <QueryMacrosInfo/>}
    </div>
  </>
}

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
      {/*<QueryHeader query={query} onChange={onChange} onRunQuery={onRunQuery} />*/}
      {/*{*/}
      {/*  ((query.editorMode === EditorMode.Builder || !query.rawQuery) && query.editorMode === EditorMode.Builder ) &&*/}
      {/*  <QueryBuilder query={query} datasource={datasource} onChange={onChange} onRunQuery={onRunQuery} />*/}
      {/*}*/}
      {/*{ ( (query.rawQuery && query.editorMode !== EditorMode.Builder) || query.editorMode === EditorMode.SQL) &&*/}
      {/*  <QueryTextEditor query={query} height={calculateEditorHeight()} onEditorMount={(editor: any) => onSQLEditorMount(editor)} onSqlChange={onSqlChange}/>*/}
      {/*}*/}
      <QueryTextEditor query={query} height={calculateEditorHeight()} onEditorMount={(editor: any) => onSQLEditorMount(editor)} onSqlChange={onSqlChange}/>
    </>
  );
}
