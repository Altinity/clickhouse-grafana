import {UniversalSelectField} from "./UniversalSelectComponent";
import {InlineLabel} from "@grafana/ui";
import {SelectableValue} from "@grafana/data";
import React, {useEffect, useState} from "react";
import {querySegment} from "./helpers";

export const DatabaseTableSelector = ({onChange, query}) => {
  const [databases, setDatabases] = useState([]);
  const [tables, setTables] = useState([]);
  const [dateColumns, setdateColumns] = useState([]);
  const [timestampColumns, setTimestampColumns] = useState([]);
  let [selectedDatabase, setSelectedDatabase] = useState<string | undefined>(query.database);
  let [selectedTable, setSelectedTable] = useState<string | undefined>(query.table);
  let [selectedDateTimeType, setSelectedDateTimeType] = useState(query.dateTimeType);




  useEffect(() => {
    (async () => {
      const databases = await querySegment('DATABASES')
      setDatabases(databases.map((item: any) => ({ label: item.text, value: item.text })))
    })()
  }, [querySegment]);

  useEffect(() => {
    if (selectedDatabase) {
      (async () => {
        const tables = await querySegment('TABLES')
        setTables(tables.map((item: any) => ({ label: item.text, value: item.text })))
      })()
    }
  }, [selectedDatabase, querySegment]);

  useEffect(() => {
    if (!!selectedDatabase || !!selectedTable || !!selectedDateTimeType) {
      (async () => {
        const timestampColumns = await querySegment(selectedDateTimeType)
        setTimestampColumns(timestampColumns.map((item: any) => ({ label: item.text, value: item.text })))
      })()
    }
  }, [selectedTable, selectedDatabase, selectedDateTimeType, querySegment]);

  useEffect(() => {
    if (!!selectedDatabase || !!selectedTable) {

      (async () => {
        const dateColumns = await querySegment('DATE')
        setdateColumns(dateColumns.map((item: any) => ({ label: item.text, value: item.text })))
      })()
    }
  }, [selectedTable, selectedDatabase, querySegment]);

  const onDatabaseChange = (database?: string) => {
    setSelectedDatabase(database);
    onChange({...query, database});
  };

  const onTableChange = (table?: string) => {
    setSelectedTable(table);
    onChange({...query, table});
  };

  return <>
    <UniversalSelectField
      width={24}
      label={<InlineLabel width={24} >
        <span style={{ color: '#6e9fff' }}>FROM</span>
      </InlineLabel>}
      placeholder="Database"
      value={selectedDatabase}
      onChange={(item: SelectableValue<string>) => onDatabaseChange(item.value)}
      options={databases}
    />
    <UniversalSelectField
      width={24}
      placeholder="Table"
      value={selectedTable}
      onChange={(selectedItem: SelectableValue<string>) => onTableChange(selectedItem.value)}
      options={tables}
      disabled={true}
    />
  </>
}
