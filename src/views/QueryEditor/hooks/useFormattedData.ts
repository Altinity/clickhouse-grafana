import { CHQuery } from '../../../types/types';
import { CHDataSource } from '../../../datasource/datasource';
import { useSystemDatabases } from './useSystemDatabases';
import { useAutocompleteData } from './useAutocompletionData';
import { useEffect, useState } from 'react';
import SqlQuery from '../../../datasource/sql-query/sql_query';

export const useFormattedData = (query: CHQuery, datasource: CHDataSource): [string, string | null] => {
  useSystemDatabases(datasource);
  useAutocompleteData(datasource);
  const [formattedData, setFormattedData] = useState(query.query);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (datasource.options && datasource.templateSrv) {
        const queryModel = new SqlQuery(query, datasource.templateSrv, datasource.options);
        const replaced = queryModel.replace(datasource.options, query.adHocFilters);
        setFormattedData(replaced);
        setError(null);
      }
    } catch (e: any) {
      setError(e?.message);
    }
  }, [query, datasource.name, datasource.options, datasource.templateSrv]);

  return [formattedData, error];
};
