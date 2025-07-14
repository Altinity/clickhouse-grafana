import { useEffect, useState } from 'react';
import { LocalStorageManager } from '../../../utils/localStorageManager';
import { EditorMode } from '../../../types/types';
import {
  DEFAULT_DATE_TIME_TYPE,
  DEFAULT_FORMAT,
  DEFAULT_INTERVAL_FACTOR,
  DEFAULT_ROUND,
  defaultQuery,
} from '../../constants';

export const useQueryState = (query, onChange, datasource) => {
  const [datasourceName] = useState(datasource.name);
  const [datasourceUid] = useState(datasource.uid);
  const [refId] = useState(query.refId);

  useEffect(() => {
    const accessKey = `dataStorage_${datasourceName}_${datasourceUid}_${refId}`;
    
    // On component mount - check for recent data
    const storedData = LocalStorageManager.getItem<{ name: string; timestamp: number }>(accessKey);
    if (storedData) {
      const { name, timestamp } = storedData;
      const currentTime = Date.now();
      const timeDifference = (currentTime - timestamp) / 1000; // Convert milliseconds to seconds

      if (timeDifference < 5) {
        if (name !== accessKey) {
          const initialQuery = {
            ...query,
            format: DEFAULT_FORMAT,
            extrapolate: true,
            skip_comments: true,
            add_metadata: true,
            dateTimeType: DEFAULT_DATE_TIME_TYPE,
            round: DEFAULT_ROUND,
            intervalFactor: DEFAULT_INTERVAL_FACTOR,
            interval: '',
            query: defaultQuery,
            formattedQuery: query.query,
            editorMode: EditorMode.Builder,
            database: undefined,
            table: undefined,
            dateColDataType: undefined,
            dateTimeColDataType: undefined,
          };

          onChange(initialQuery);
        }
      }
    }

    // Cleanup old query states on mount
    LocalStorageManager.limitQueryStatesPerDatasource(datasourceUid);

    // On component unmount
    return () => {
      const dataToStore = {
        name: accessKey,
        timestamp: Date.now(),
      };
      
      // Store with a 1 hour TTL (query states don't need to persist long)
      LocalStorageManager.setItem(accessKey, dataToStore, 60);
      
      // Ensure we don't exceed the limit after storing
      LocalStorageManager.limitQueryStatesPerDatasource(datasourceUid);
    };
    // eslint-disable-next-line
  }, []);
};
