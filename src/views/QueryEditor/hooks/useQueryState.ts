import { useEffect, useState } from 'react';
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
    // On component mount
    const storedData = localStorage.getItem(accessKey);
    if (storedData) {
      const { name, timestamp } = JSON.parse(storedData);
      const currentTime = new Date().getTime();
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

    // On component unmount
    return () => {
      const dataToStore = {
        name: accessKey,
        timestamp: new Date().getTime(),
      };
      localStorage.setItem(accessKey, JSON.stringify(dataToStore));
    };
    // eslint-disable-next-line
  }, []);
};
