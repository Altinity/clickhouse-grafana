import React from "react";
import {EditorMode} from "../../../../types/types";
import {Button, InlineField, InlineFieldRow, InlineLabel, Select} from "@grafana/ui";

export const QueryBuilder = ({query, onRunQuery, onChange, datasource}: any) => {
  const [tableLoading, setTableLoading] = React.useState<boolean>(false);

  const switchToSQLMode = () => {
    query.editorMode = EditorMode.SQL
    onChange(query)
  };
  return <>
    <div className="gf-form" style={{display: 'flex', flexDirection:"column", marginTop: '10px'}}>
      <InlineFieldRow>
        <InlineField transparent>
          <InlineLabel children={<span style={{color: "#6e9fff"}}>FROM ${tableLoading}</span>} transparent />
        </InlineField>
        <InlineField transparent>
          <Select
            width={16}
            onChange={() => {}}
            placeholder={'--Database--'}
            options={[]}
          />
        </InlineField>
        <InlineField transparent>
          <Select
            width={16}
            onChange={() => {}}
            placeholder={'--Table--'}
            options={[]}
          />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label={<InlineLabel width="auto" tooltip={<div style={{width: "200px", backgroundColor:"black"}}>
          Select Type &nbsp;
          <a href="https://clickhouse.com/docs/en/sql-reference/data-types/datetime/" rel="noreferrer" target="_blank">DateTime</a>,&nbsp;
          <a href="https://clickhouse.com/docs/en/sql-reference/data-types/datetime64/" rel="noreferrer" target="_blank">DateTime64</a>&nbsp;
          or <a href="https://clickhouse.com/docs/en/sql-reference/data-types/int-uint/" rel="noreferrer" target="_blank">UInt32</a> column for binding with Grafana range selector
        </div>} transparent>
          Column: Timestamp
          </InlineLabel>}
         transparent>
          <Select
            width={16}
            onChange={() => {}}
            placeholder={'--Database--'}
            options={[
              {label: 'DateTime', value: 'DATETIME'},
              {label: 'DateTime64', value: 'DATETIME64'},
              {label: 'TimeStamp', value: 'TIMESTAMP'},
            ]}
          />
        </InlineField>
        <InlineField transparent>
          <Select
            width={16}
            onChange={() => {}}
            placeholder={'--DateTime:col--'}
            options={[]}
          />
        </InlineField>
        <InlineField label={<InlineLabel width="auto" tooltip={<div style={{width: "200px", backgroundColor:"black"}}>
          Select
          <a rel="noreferrer" href="https://clickhouse.tech/docs/en/sql-reference/data-types/date/" target = "_blank" >Date</a>
          column for binding with Grafana range selector
        </div>} transparent>
          Column: Timestamp
        </InlineLabel>} transparent>
          <Select
            width={16}
            onChange={() => {}}
            placeholder={'--Database--'}
            options={[]}
          />
        </InlineField>
      </InlineFieldRow>
      <Button className="btn btn-inverse gf-form-btn query-keyword" onClick={switchToSQLMode}>
        <i className="fa fa-arrow-right"></i>&nbsp;Go to Query
      </Button>
    </div>
  </>
}
