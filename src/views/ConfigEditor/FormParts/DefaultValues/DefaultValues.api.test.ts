import { of } from 'rxjs';

const fetchMock = jest.fn();
jest.mock('@grafana/runtime', () => ({
  getBackendSrv: () => ({ fetch: fetchMock }),
  getTemplateSrv: jest.fn(),
  getGrafanaLiveSrv: jest.fn(),
  config: { bootData: { user: { login: '' } } },
  DataSourceWithBackend: class {},
}));
jest.mock('../../../QueryEditor/QueryEditor', () => ({
  QueryEditor: () => null,
}));

import { getOptions } from './DefaultValues.api';

describe('DefaultValues.api getOptions', () => {
  const datasourceOptions = {
    access: 'proxy',
    uid: 'abc',
    jsonData: { usePOST: true },
  };

  it('parses the raw text response into an object (responseType is text since issue #832)', async () => {
    fetchMock.mockReturnValue(
      of({ data: '{"meta":[{"name":"d","type":"DateTime"}],"data":[{"d":"2024-01-01"}],"rows":1}' })
    );

    const result = await getOptions('SELECT 1 FORMAT JSON', 'http://x', datasourceOptions);

    expect(result).toEqual({
      meta: [{ name: 'd', type: 'DateTime' }],
      data: [{ d: '2024-01-01' }],
      rows: 1,
    });
  });

  it('preserves unsafe UInt64 values from the raw text response', async () => {
    fetchMock.mockReturnValue(
      of({ data: '{"meta":[{"name":"v","type":"UInt64"}],"data":[{"v":11189782786942380395}],"rows":1}' })
    );

    const result = await getOptions('SELECT 1 FORMAT JSON', 'http://x', datasourceOptions);

    expect(result.data).toEqual([{ v: '11189782786942380395' }]);
  });
});
