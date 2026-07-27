jest.mock('@grafana/runtime', () => ({
  getBackendSrv: jest.fn(),
  getTemplateSrv: jest.fn(),
  getGrafanaLiveSrv: jest.fn(),
  config: { bootData: { user: { login: '' } } },
  DataSourceWithBackend: class {},
}));
jest.mock('../views/QueryEditor/QueryEditor', () => ({
  QueryEditor: () => null,
}));

import { CHDataSource } from './datasource';

describe('CHDataSource._getRequestOptions', () => {
  const options = { url: 'http://localhost:8123' };

  it('requests the response as raw text so large integers survive parsing (issue #832)', () => {
    const requestOptions = CHDataSource._getRequestOptions('SELECT 1 FORMAT JSON', true, 'req-1', options);
    expect(requestOptions.responseType).toBe('text');
  });

  it('requests raw text for GET requests as well', () => {
    const requestOptions = CHDataSource._getRequestOptions('SELECT 1 FORMAT JSON', false, 'req-2', options);
    expect(requestOptions.responseType).toBe('text');
  });
});
