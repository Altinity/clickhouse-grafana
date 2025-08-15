import { useEffect, useState } from 'react';
import { IndexedDBManager } from '../../../utils/indexedDBManager';
import { isPermissionError, getPermissionErrorMessage, PermissionErrorContext } from '../../../utils/clickhouseErrorHandling';

const GET_DATABASES_QUERY =
  'SELECT name FROM system.tables\n' +
  "WHERE database='system' AND name IN (\n" +
  "'functions','table_engines','formats',\n" +
  "'table_functions','data_type_families','merge_tree_settings',\n" +
  "'settings','clusters','macros','storage_policies','aggregate_function_combinators',\n" +
  "'database','tables','dictionaries','columns'\n" +
  ')';

export const useSystemDatabases = (datasource) => {
  const [data, setData] = useState<null | any[]>(null);
  useEffect(() => {
    const fetchData = async () => {
      const storageKey = `altinity_systemDatabases_${datasource.uid}`;
      
      try {
        // Try to get cached data using the IndexedDBManager
        const cachedData = await IndexedDBManager.getItem<string[]>(storageKey);
        if (cachedData) {
          setData(cachedData);
          return;
        }

        const result = await datasource.metricFindQuery(GET_DATABASES_QUERY);
        const processedResult = result.map((item) => item.text);
        
        // Store with 10 minute TTL using IndexedDBManager
        await IndexedDBManager.setItem(storageKey, processedResult, 10);
        
        setData(processedResult);
      } catch (error: any) {
        if (isPermissionError(error)) {
          // Permission error - return empty array gracefully
          console.info(getPermissionErrorMessage(PermissionErrorContext.SYSTEM_DATABASES, datasource.uid));
          setData([]);
          // Cache the empty result to avoid repeated permission errors
          await IndexedDBManager.setItem(storageKey, [], 10);
        } else {
          // Other errors - log and return empty
          console.error('Failed to fetch system databases:', error);
          setData([]);
        }
      }
    };

    const initializeData = async () => {
      // Perform cleanup of expired entries on component mount
      try {
        await IndexedDBManager.cleanupExpiredByPrefix('altinity_systemDatabases_');
      } catch (error) {
        console.error('Failed to cleanup expired system databases data:', error);
      }
      
      await fetchData();
    };
    
    initializeData();
  }, [datasource]);

  return data;
};
