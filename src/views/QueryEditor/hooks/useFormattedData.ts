import { CHQuery } from '../../../types/types';
import { CHDataSource } from '../../../datasource/datasource';
import { useSystemDatabases } from './useSystemDatabases';
import { useAutocompleteData } from './useAutocompletionData';
import { useEffect, useState } from 'react';

export const useFormattedData = (query: CHQuery, datasource: CHDataSource, options?: any): [string, string | null] => {
  useSystemDatabases(datasource);
  useAutocompleteData(datasource);
  const [formattedData, setFormattedData] = useState(query.query);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
      if ((datasource.options || options) && datasource.templateSrv) {
        datasource.replace(datasource.options || options, query).then((replaced) => {
          setFormattedData(replaced.stmt);

          setError(null);
        }).catch((e) => {
          setFormattedData(query.query);
          // Display the error we received from backend
          const errorStr = e.data?.error || e.toString();
          setError(errorStr);
        })
      }

    // eslint-disable-next-line
  }, [query, datasource.name, datasource.options, options, datasource.templateSrv]);

  return [formattedData, error];
};
