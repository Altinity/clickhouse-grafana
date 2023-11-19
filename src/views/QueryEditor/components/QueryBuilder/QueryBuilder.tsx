import React, { useEffect, useState } from "react";
import { EditorMode } from "../../../../types/types";
import { Button, InlineField, InlineFieldRow, InlineLabel, Select } from "@grafana/ui";
import {SelectableValue} from "@grafana/data";

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
  const [databases, setDatabases] = useState([]);
  const [tables, setTables] = useState([]);
  const [dateTimeColumns, setDateTimeColumns] = useState([]);
  const [timestampColumns, setTimestampColumns] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState([]);
  const [selectedTable, setSelectedTable] = useState([]);
  const [selectedColumnTimestampType, setSelectedColumnTimestampType] = useState([]);

  useEffect(() => {
    fetchData('http://localhost:8123/?query=SHOW%20DATABASES%20FORMAT%20JSON', setDatabases);
  }, []);

  useEffect(() => {
    if (selectedDatabase) {
      fetchData(`http://localhost:8123/?query=SHOW%20TABLES%20FROM%20${selectedDatabase}%20FORMAT%20JSON`, setTables);
    }
  }, [selectedDatabase]);

  useEffect(() => {
    if (!!selectedDatabase || !!selectedTable || !!selectedColumnTimestampType) {
      fetchData(`http://localhost:8123/?query=SELECT%20name%20FROM%20system.columns%20WHERE%20database%20%3D%20%27${selectedDatabase}%27%20AND%20table%20%3D%20%27${selectedTable}%27%20AND%20type%20LIKE%20%27${selectedColumnTimestampType}%25%27%20ORDER%20BY%20name%20FORMAT%20JSON`, setDateTimeColumns);
    }
  }, [selectedTable, selectedDatabase, selectedColumnTimestampType]);

  useEffect(() => {
    if (!!selectedDatabase || !!selectedTable) {
      fetchData(`http://localhost:8123/?query=SELECT%20name%20FROM%20system.columns%20WHERE%20database%20%3D%20%27${selectedDatabase}%27%20AND%20table%20%3D%20%27${selectedTable}%27%20AND%20match%28type%2C%27%5EDate%24%7C%5EDate%5C%28%5B%5E%29%5D%2B%5C%29%24%27%29%20ORDER%20BY%20name%20UNION%20ALL%20SELECT%20%27%20%27%20AS%20name%20FORMAT%20JSON`, setTimestampColumns());
    }
  }, [selectedTable, selectedDatabase]);

  const onDateTimeTypeChanged = (dateTimeType: SelectableValue) => {
    setSelectedColumnTimestampType(dateTimeType.value)
    query.dateTimeColDataType = dateTimeType.value
    onChange(query)
  };
  const switchToSQLMode = () => {
    query.editorMode = EditorMode.SQL;
    onChange(query);
  };

  const onDatabaseChange = (database) => {
    setSelectedDatabase(database)
    query.database = database
    onChange(query)
  }

  const onTableChange = (table) => {
    setSelectedTable(table)
    query.table = table
    onChange(query)
  }

  return (
    <div className="gf-form" style={{ display: 'flex', flexDirection: "column", marginTop: '10px' }}>
      <InlineFieldRow>
        <InlineField label={<InlineLabel width={24} children={<span style={{ color: "#6e9fff" }}>FROM</span>} transparent />}>
          <Select
            width={24}
            onChange={(item) => onDatabaseChange(item.value)}
            placeholder={'Database'}
            options={databases}
          />
        </InlineField>
        <InlineField transparent>
          <Select
            width={24}
            onChange={(item) => onTableChange(item.value)}
            placeholder={'Table'}
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
            placeholder={'Timestamp type'}
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
            placeholder={'Datetime column'}
            options={dateTimeColumns}
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
            placeholder={'Timestamp Column'}
            options={timestampColumns}
          />
        </InlineField>
      </InlineFieldRow>
      <Button variant="primary" icon="arrow-right" size="sm" onClick={switchToSQLMode}>
        Go to Query
      </Button>
    </div>
  );
};

export default QueryBuilder;
