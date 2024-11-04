import { useEffect, useState } from 'react';

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
      const cachedData = localStorage.getItem(storageKey);
      const now = new Date();

      if (cachedData) {
        const { expiry, result } = JSON.parse(cachedData);
        if (now.getTime() < expiry) {
          setData(result);
          return;
        }
      }

      try {
        const result = await datasource.metricFindQuery(GET_DATABASES_QUERY);
        const expiry = now.getTime() + 10 * 60 * 1000;
        localStorage.setItem(storageKey, JSON.stringify({ expiry, result: result.map((item) => item.text) }));
        setData(result.map((item) => item.text));
      } catch (error) {
        setData([]);
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, [datasource]);

  return data;
};
