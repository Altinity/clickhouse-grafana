import { useCallback, useEffect, useState } from 'react';
import { TimestampFormat } from '../../../../../types/types';

export const useConnectionData = (query, datasource) => {
  const [databases, setDatabases] = useState([]);
  const [tables, setTables] = useState([]);
  const [dateColumns, setdateColumns] = useState([]);
  const [timestampColumns, setTimestampColumns] = useState([]);
  let [selectedDatabase, setSelectedDatabase] = useState<string | undefined>(query.database);
  let [selectedTable, setSelectedTable] = useState<string | undefined>(query.table);
  let [selectedColumnTimestampType, setSelectedColumnTimestampType] = useState(query.dateTimeColDataType);
  let [selectedColumnDateType, setSelectedColumnDateType] = useState(query.dateColDataType);
  let [selectedDateTimeType, setSelectedDateTimeType] = useState(query.dateTimeType);

  const buildExploreQuery = useCallback(
    (type) => {
      let query;
      switch (type) {
        case 'TABLES':
          query =
            'SELECT name ' + 'FROM system.tables ' + "WHERE database = '" + selectedDatabase + "' " + 'ORDER BY name';
          break;
        case 'DATE':
          query =
            'SELECT name ' +
            'FROM system.columns ' +
            "WHERE database = '" +
            selectedDatabase +
            "' AND " +
            "table = '" +
            selectedTable +
            "' AND " +
            "type IN ('Date','Date32','Nullable(Date)','Nullable(Date32)') " +
            'ORDER BY name ' +
            "UNION ALL SELECT ' ' AS name";
          break;
        case TimestampFormat.DateTime:
          query =
            'SELECT name ' +
            'FROM system.columns ' +
            "WHERE database = '" +
            selectedDatabase +
            "' AND " +
            "table = '" +
            selectedTable +
            "' AND " +
            "(substring(type,1,8) = 'DateTime' OR substring(type,10,8) = 'DateTime') AND " +
            "(substring(type,1,10) != 'DateTime64' OR substring(type,10,10) != 'DateTime64')" +
            'ORDER BY name';
          break;
        case TimestampFormat.DateTime64:
          query =
            'SELECT name ' +
            'FROM system.columns ' +
            "WHERE database = '" +
            selectedDatabase +
            "' AND " +
            "table = '" +
            selectedTable +
            "' AND " +
            "(substring(type,1,10) = 'DateTime64' OR substring(type,10,10) = 'DateTime64')" +
            'ORDER BY name';
          break;
        case TimestampFormat.TimeStamp:
          query =
            'SELECT name ' +
            'FROM system.columns ' +
            "WHERE database = '" +
            selectedDatabase +
            "' AND " +
            "table = '" +
            selectedTable +
            "' AND " +
            "type = 'UInt32' " +
            'ORDER BY name';
          break;
        case TimestampFormat.TimeStamp64_3:
        case TimestampFormat.TimeStamp64_6:
        case TimestampFormat.TimeStamp64_9:
          query =
            'SELECT name ' +
            'FROM system.columns ' +
            "WHERE database = '" +
            selectedDatabase +
            "' AND " +
            "table = '" +
            selectedTable +
            "' AND " +
            "(type LIKE 'UInt%' OR type LIKE 'Int%')" +
            'ORDER BY name';
          break;
        case TimestampFormat.Float:
          query =
            'SELECT name ' +
            'FROM system.columns ' +
            "WHERE database = '" +
            selectedDatabase +
            "' AND " +
            "table = '" +
            selectedTable +
            "' AND " +
            "type LIKE 'Float%' OR type LIKE 'Decimal%' " +
            'ORDER BY name';
          break;
        case 'DATABASES':
          query = 'SELECT name ' + 'FROM system.databases ' + 'ORDER BY name';
          break;
        case 'COLUMNS':
          query =
            'SELECT name text, type value ' +
            'FROM system.columns ' +
            "WHERE database = '" +
            selectedDatabase +
            "' AND " +
            "table = '" +
            selectedTable +
            "'";
          break;
      }
      return query;
    },
    [selectedTable, selectedDatabase]
  );

  const querySegment = useCallback(
    (type: any) => {
      let query = buildExploreQuery(type);
      return datasource.metricFindQuery(query);
    },
    [buildExploreQuery, datasource]
  );

  useEffect(() => {
    (async () => {
      const databases = await querySegment('DATABASES');
      setDatabases(databases.map((item: any) => ({ label: item.text, value: item.text })));
    })();
  }, [querySegment]);

  useEffect(() => {
    if (selectedDatabase) {
      (async () => {
        const tables = await querySegment('TABLES');
        setTables(tables.map((item: any) => ({ label: item.text, value: item.text })));
      })();
    }
  }, [selectedDatabase, querySegment]);

  useEffect(() => {
    if (!!selectedDatabase || !!selectedTable || !!selectedDateTimeType) {
      (async () => {
        const timestampColumns = await querySegment(selectedDateTimeType);
        setTimestampColumns(timestampColumns.map((item: any) => ({ label: item.text, value: item.text })));
      })();
    }
  }, [selectedTable, selectedDatabase, selectedDateTimeType, querySegment]);

  useEffect(() => {
    if (!!selectedDatabase || !!selectedTable) {
      (async () => {
        const dateColumns = await querySegment('DATE');
        setdateColumns(dateColumns.map((item: any) => ({ label: item.text, value: item.text })));
      })();
    }
  }, [selectedTable, selectedDatabase, querySegment]);

  return [
    databases,
    tables,
    dateColumns,
    timestampColumns,
    selectedColumnTimestampType,
    selectedColumnDateType,
    setSelectedDatabase,
    setSelectedTable,
    setSelectedColumnTimestampType,
    setSelectedColumnDateType,
    setSelectedDateTimeType,
    selectedTable,
    selectedDatabase,
    selectedDateTimeType,
  ];
};
