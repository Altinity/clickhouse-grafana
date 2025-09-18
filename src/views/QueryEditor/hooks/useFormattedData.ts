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
    // Determine if we're in a context where template replacement is possible
    const hasExecutionContext = (datasource.options?.range || options?.range);
    const hasTemplateService = !!datasource.templateSrv;

    if (hasExecutionContext && hasTemplateService) {
      // Normal dashboard mode - perform replacement
      datasource.replace(datasource.options || options, query).then((replaced) => {
        setFormattedData(replaced.stmt);
        setError(null);
      }).catch((e) => {
        setFormattedData(query.query);
        const errorStr = e.data?.error || e.toString();
        setError(errorStr);
      });
    } else if (hasTemplateService) {
      // Alerts/Explore mode - no execution context yet
      // This is EXPECTED behavior, not an error
      setFormattedData(query.query);
      setError(null);
    } else {
      // Critical error - no template service available
      setFormattedData(query.query);
      setError('Grafana template service unavailable. Please refresh the page.');
    }

    // eslint-disable-next-line
  }, [query, datasource.name, datasource.options, options, datasource.templateSrv]);

  return [formattedData, error];
};
