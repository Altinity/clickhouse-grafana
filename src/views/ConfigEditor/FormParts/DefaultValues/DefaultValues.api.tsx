import {getBackendSrv} from '@grafana/runtime';


export const getOptions = async (query: string, url: string, options: any): Promise<any> => {
  const _getRequestOptions = (query: string, usePOST?: boolean, requestId?: string) => {
    let requestOptions: any = {
      url: options.access === 'proxy' ? `/api/datasources/proxy/uid/${options.uid}` : options.url,
      requestId: requestId,
    };
    let params: string[] = [];

    if (usePOST) {
      requestOptions.method = 'POST';
      requestOptions.data = query;
    } else {
      requestOptions.method = 'GET';
      params.push('query=' + encodeURIComponent(query));
    }

    if (options.defaultDatabase) {
      params.push('database=' + options.defaultDatabase);
    }

    if (options.basicAuth || options.withCredentials) {
      requestOptions.withCredentials = true;
    }

    requestOptions.headers = options.headers || {};
    if (options.basicAuth) {
      requestOptions.headers.Authorization = options.basicAuth;
    }

    if (options.useCompression) {
      requestOptions.headers['Accept-Encoding'] = options.compressionType
      params.push("enable_http_compression=1")
    }

    if (options.useYandexCloudAuthorization) {
      requestOptions.headers['X-ClickHouse-User'] = options.xHeaderUser;
      // look to routes in plugin.json
      if (requestOptions.url.indexOf('/?') === -1) {
        requestOptions.url += '/xHeaderKey';
      } else {
        requestOptions.url.replace('/?', '/xHeaderKey/?');
      }
    }

    if (options.addCorsHeader) {
      params.push('add_http_cors_header=1');
    }

    if (params.length) {
      requestOptions.url += (requestOptions.url.indexOf('?') !== -1 ? '&' : '/?') + params.join('&');
    }

    return requestOptions;
  }

  const backendSrv = getBackendSrv();

  const queryParams = _getRequestOptions(query, options.jsonData.usePOST, undefined);

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
