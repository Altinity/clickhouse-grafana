import {TimestampFormat} from "../../../../../types/types";

export const buildExploreQuery = ({type, selectedTable, selectedDatabase}) => {
  let query;
  switch (type) {
    case 'TABLES':
      query = 'SELECT name ' +
        'FROM system.tables ' +
        'WHERE database = \'' + selectedDatabase + '\' ' +
        'ORDER BY name';
      break;
    case 'DATE':
      query = 'SELECT name ' +
        'FROM system.columns ' +
        'WHERE database = \'' + selectedDatabase + '\' AND ' +
        'table = \'' + selectedTable + '\' AND ' +
        'match(type,\'^Date$|^Date\\([^)]+\\)$\') ' +
        'ORDER BY name ' +
        'UNION ALL SELECT \' \' AS name';
      break;
    case TimestampFormat.DateTime:
      query = 'SELECT name ' +
        'FROM system.columns ' +
        'WHERE database = \'' + selectedDatabase + '\' AND ' +
        'table = \'' + selectedTable + '\' AND ' +
        'match(type,\'^DateTime$|^DateTime\\([^)]+\\)$\') ' +
        'ORDER BY name';
      break;
    case TimestampFormat.DateTime64:
      query = 'SELECT name ' +
        'FROM system.columns ' +
        'WHERE database = \'' + selectedDatabase + '\' AND ' +
        'table = \'' + selectedTable + '\' AND ' +
        'type LIKE \'DateTime64%\' ' +
        'ORDER BY name';
      break;
    case 'TIMESTAMP':
      query = 'SELECT name ' +
        'FROM system.columns ' +
        'WHERE database = \'' + selectedDatabase + '\' AND ' +
        'table = \'' + selectedTable + '\' AND ' +
        'type = \'UInt32\' ' +
        'ORDER BY name';
      break;
    case 'DATABASES':
      query = 'SELECT name ' +
        'FROM system.databases ' +
        'ORDER BY name';
      break;
    case 'COLUMNS':
      query = 'SELECT name text, type value ' +
        'FROM system.columns ' +
        'WHERE database = \'' + selectedDatabase + '\' AND ' +
        'table = \'' + selectedTable + '\'';
      break;
  }
  return query;
};

export const querySegment = ({type, selectedTable, selectedDatabase, datasource}) => {
  let query = buildExploreQuery({type, selectedTable, selectedDatabase});
  return datasource.metricFindQuery(query)
}
