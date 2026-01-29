import { useCallback, useEffect, useState } from 'react';
import { TimestampFormat } from '../../../../../types/types';
import { 
  isPermissionError, 
  getPermissionErrorMessage, 
  PermissionErrorContext, 
  PermissionErrorContextType 
} from '../../../../../utils/clickhouseErrorHandling';

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
            "type LIKE '%UInt64%'" +
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
            "type LIKE '%Float%' OR type LIKE '%Decimal%' " +
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
    async (type: any) => {
      let query = buildExploreQuery(type);
      if (!query) {
        return [];
      }
      try {
        return await datasource.metricFindQuery(query);
      } catch (error: any) {
        if (isPermissionError(error)) {
          // Map query type to appropriate context
          let context: PermissionErrorContextType;
          switch (type) {
            case 'DATABASES':
              context = PermissionErrorContext.DATABASES;
              break;
            case 'TABLES':
              context = PermissionErrorContext.TABLES;
              break;
            case 'DATE':
            case TimestampFormat.DateTime:
            case TimestampFormat.DateTime64:
              context = PermissionErrorContext.COLUMNS;
              break;
            default:
              context = PermissionErrorContext.QUERY_BUILDER;
          }
          
          // Permission error - return empty array gracefully
          console.info(getPermissionErrorMessage(context));
          return [];
        }
        // Re-throw non-permission errors
        throw error;
      }
    },
    [buildExploreQuery, datasource]
  );

  useEffect(() => {
    (async () => {
      try {
        const databases = await querySegment('DATABASES');
        setDatabases(databases.map((item: any) => ({ label: item.text, value: item.text })));
      } catch (error) {
        console.error('Failed to fetch databases:', error);
        setDatabases([]);
      }
    })();
  }, [querySegment]);

  useEffect(() => {
    if (selectedDatabase) {
      (async () => {
        try {
          const tables = await querySegment('TABLES');
          setTables(tables.map((item: any) => ({ label: item.text, value: item.text })));
        } catch (error) {
          console.error('Failed to fetch tables:', error);
          setTables([]);
        }
      })();
    }
  }, [selectedDatabase, querySegment]);

  useEffect(() => {
    if (selectedDatabase && selectedTable && selectedDateTimeType) {
      (async () => {
        try {
          const timestampColumns = await querySegment(selectedDateTimeType);
          setTimestampColumns(timestampColumns.map((item: any) => ({ label: item.text, value: item.text })));
        } catch (error) {
          console.error('Failed to fetch timestamp columns:', error);
          setTimestampColumns([]);
        }
      })();
    }
  }, [selectedTable, selectedDatabase, selectedDateTimeType, querySegment]);

  useEffect(() => {
    if (selectedDatabase && selectedTable) {
      (async () => {
        try {
          const dateColumns = await querySegment('DATE');
          setdateColumns(dateColumns.map((item: any) => ({ label: item.text, value: item.text })));
        } catch (error) {
          console.error('Failed to fetch date columns:', error);
          setdateColumns([]);
        }
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
