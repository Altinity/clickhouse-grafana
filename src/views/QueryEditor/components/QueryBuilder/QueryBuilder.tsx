import React, { useEffect, useState } from "react";
import { EditorMode } from "../../../../types/types";
import { Button, InlineField, InlineFieldRow, InlineLabel, Select } from "@grafana/ui";
import {SelectableValue} from "@grafana/data";
import {ColumnSelector} from "./components/ColumnSelector";

const fetchData = async (url, setter) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    setter(data.data.map(item => ({ label: item.name, value: item.name })));
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
  }
};

export const QueryBuilder = ({ query, onRunQuery, onChange, datasource }) => {
  const [tableLoading, setTableLoading] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState([]);

  useEffect(() => {
    fetchData('http://localhost:8123/?query=SHOW%20DATABASES%20FORMAT%20JSON', setDatabases);
  }, []);

  useEffect(() => {
    if (selectedDatabase) {
      fetchData(`http://localhost:8123/?query=SHOW%20TABLES%20FROM%20${selectedDatabase}%20FORMAT%20JSON`, setTables);
    }
  }, [selectedDatabase]);

  const onDateTimeTypeChanged = (dateTimeType: SelectableValue) => {
    query.dateTimeType = dateTimeType.value
    onChange(query)
  };
  const switchToSQLMode = () => {
    query.editorMode = EditorMode.SQL;
    onChange(query);
  };

  return (
    <div className="gf-form" style={{ display: 'flex', flexDirection: "column", marginTop: '10px' }}>
      <InlineFieldRow>
        <InlineField label={<InlineLabel width={7} children={<span style={{ color: "#6e9fff" }}>FROM</span>} transparent />}>
          <Select
            width={16}
            onChange={(item) => setSelectedDatabase(item.value)}
            placeholder={'--Database--'}
            options={databases}
          />
        </InlineField>
        <InlineField transparent>
          <Select
            width={24}
            onChange={() => {}}
            placeholder={'--Table--'}
            options={tables}
          />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label={<InlineLabel width={24} tooltip={<div style={{width: "200px", backgroundColor:"black"}}>
          Select Type &nbsp;
          <a href="https://clickhouse.com/docs/en/sql-reference/data-types/datetime/" rel="noreferrer" target="_blank">DateTime</a>,&nbsp;
          <a href="https://clickhouse.com/docs/en/sql-reference/data-types/datetime64/" rel="noreferrer" target="_blank">DateTime64</a>&nbsp;
          or <a href="https://clickhouse.com/docs/en/sql-reference/data-types/int-uint/" rel="noreferrer" target="_blank">UInt32</a> column for binding with Grafana range selector
        </div>} transparent>
          Column timestamp type
        </InlineLabel>}
                     transparent>
          <Select
            width={24}
            onChange={onDateTimeTypeChanged}
            placeholder={'--Database--'}
            options={[
              {label: 'DateTime', value: 'DATETIME'},
              {label: 'DateTime64', value: 'DATETIME64'},
              {label: 'TimeStamp', value: 'TIMESTAMP'},
            ]}
          />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label={<InlineLabel width={24} transparent>
          Datetime Column
        </InlineLabel>} transparent>
          <Select
            width={24}
            onChange={() => {}}
            placeholder={'--DateTime:col--'}
            options={[]}
          />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label={<InlineLabel width="24" tooltip={<div style={{width: "200px", backgroundColor:"black"}}>
          Select
          <a rel="noreferrer" href="https://clickhouse.tech/docs/en/sql-reference/data-types/date/" target = "_blank" >Date</a>
          column for binding with Grafana range selector
        </div>} transparent>
          Timestamp column
        </InlineLabel>} transparent>
          <Select
            width={24}
            onChange={() => {}}
            placeholder={'--Database--'}
            options={[]}
          />
        </InlineField>
        <ColumnSelector query={query} datasource={datasource} onChange={onChange} onRunQuery={onRunQuery} selectorType='DATETIME'/>
      </InlineFieldRow>
      <Button variant="primary" icon="arrow-right" size="sm" onClick={switchToSQLMode}>
        Go to Query
      </Button>
    </div>
  );
};

export default QueryBuilder;
