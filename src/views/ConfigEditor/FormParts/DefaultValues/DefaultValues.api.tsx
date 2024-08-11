import {getBackendSrv} from '@grafana/runtime';
import {CHDataSource} from "../../../../datasource/datasource";


export const getOptions = async (query: string, url: string, options: any): Promise<any> => {
  const backendSrv = getBackendSrv();

  options.url = options.access === 'proxy'
    ? `/api/datasources/proxy/uid/${options.uid}`
    : options.url

  const queryParams = CHDataSource._getRequestOptions(query, options.jsonData.usePOST, undefined, options);

  if (!url || !query) {
    return Promise.reject('Invalid parameters')
  }

  return new Promise((resolve, reject) => {
    backendSrv.fetch(queryParams).subscribe((response) => {
      resolve(response.data)
    },(e) => {
      reject(e)
    })
  })
}
