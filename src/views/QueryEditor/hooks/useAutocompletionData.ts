import { useEffect, useState } from 'react';

// SQL query for autocompletion data
const AUTOCOMPLETION_QUERY = `
SELECT DISTINCT arrayJoin(extractAll(name, '[\\\\w_]{2,}')) AS completion, color 
FROM (
  SELECT name, 'identifier' AS color FROM system.functions 
  UNION ALL 
  SELECT name, 'keyword' AS color FROM system.table_engines 
  UNION ALL 
  SELECT name, 'keyword' AS color FROM system.formats 
  UNION ALL 
  SELECT name, 'identifier' AS color FROM system.table_functions 
  UNION ALL 
  SELECT name, 'identifier' AS color FROM system.data_type_families 
  UNION ALL 
  SELECT name, 'identifier' AS color FROM system.merge_tree_settings 
  UNION ALL 
  SELECT name, 'identifier' AS color FROM system.settings 
  UNION ALL 
  SELECT cluster, 'string' AS color FROM system.clusters 
  UNION ALL 
  SELECT macro, 'string' AS color FROM system.macros 
  UNION ALL 
  SELECT policy_name, 'string' AS color FROM system.storage_policies 
  UNION ALL 
  SELECT concat(func.name, comb.name), 'identifier' AS color FROM system.functions AS func 
  CROSS JOIN system.aggregate_function_combinators AS comb WHERE is_aggregate 
  UNION ALL 
  SELECT name, 'identifier' AS color FROM system.databases 
  UNION ALL 
  SELECT DISTINCT name, 'identifier' AS color FROM system.tables 
  UNION ALL 
  SELECT DISTINCT name, 'identifier' AS color FROM system.dictionaries 
  UNION ALL 
  SELECT DISTINCT name, 'identifier' AS color FROM system.columns
) WHERE notEmpty(completion) LIMIT 10000
`;

export const useAutocompleteData = (datasource) => {
  const [data, setData] = useState<null | any[]>(null);

  useEffect(() => {
    const fetchData = async () => {
      const storageKey = `altinity_autocomplete_${datasource.uid}`;
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
        const result = await datasource.metricFindQuery(AUTOCOMPLETION_QUERY);
        const expiry = now.getTime() + 10 * 60 * 1000; // 10 minutes in milliseconds

        const groupByColor = (data) => {
          const groupedData = {};
          data.forEach((item) => {
            const color = item.color;
            if (!groupedData[color]) {
              groupedData[color] = [];
            }
            groupedData[color].push(item.completion);
          });
          return groupedData;
        };

        const groupedResult = groupByColor(result);
        localStorage.setItem(storageKey, JSON.stringify({ expiry, result: groupedResult }));

        // @ts-ignore
        setData(groupedResult);
      } catch (error) {
        setData([]);
        console.error('Failed to fetch autocomplete data:', error);
      }
    };

    fetchData();
  }, [datasource]);

  return data;
};
