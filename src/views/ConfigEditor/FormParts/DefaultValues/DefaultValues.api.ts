import { getBackendSrv } from '@grafana/runtime';
import { CHDataSource } from '../../../../datasource/datasource';
import { parseJsonResponseLossless, tryParseJson } from '../../../../datasource/losslessJson';

export const getOptions = async (query: string, url: string, datasourceOptions: any): Promise<any> => {
  const backendSrv = getBackendSrv();
  const options = JSON.parse(JSON.stringify(datasourceOptions));

  options.url = options.access === 'proxy' ? `/api/datasources/proxy/uid/${options.uid}` : options.url;

  const queryParams = CHDataSource._getRequestOptions(query, options.jsonData.usePOST, undefined, options);

  if (!url || !query) {
    return Promise.reject('Invalid parameters');
  }

  return new Promise((resolve, reject) => {
    backendSrv.fetch(queryParams).subscribe(
      (response) => {
        try {
          resolve(parseJsonResponseLossless(response.data));
        } catch (parseError) {
          reject(parseError);
        }
      },
      (e) => {
        reject({ ...e, data: tryParseJson(e?.data) });
      }
    );
  });
};

export const getSettings = async (): Promise<any> => {
  const backendSrv = getBackendSrv();

  return new Promise((resolve, reject) => {
    backendSrv.fetch({ url: '/api/frontend/settings' }).subscribe(
      (response) => {
        resolve(response.data);
      },
      (e) => {
        reject(e);
      }
    );
  });
};
