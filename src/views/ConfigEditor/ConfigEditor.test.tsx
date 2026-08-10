jest.mock('react-calendar', () => ({}));
// Monaco cannot run under jsdom; replace CodeEditor with a plain textarea
jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  CodeEditor: ({ value, onChange }: any) => (
    <textarea data-testid="code-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { makeOptions, selectOption } from 'spec/testUtils';
import { ConfigEditor } from './ConfigEditor';

const setup = (jsonData: any = {}, overrides: any = {}) => {
  const onOptionsChange = jest.fn();
  const options = makeOptions(jsonData, overrides);
  const utils = render(<ConfigEditor options={options as any} onOptionsChange={onOptionsChange} />);
  onOptionsChange.mockClear(); // drop the mount-time adHocValuesQuery sync call
  return { onOptionsChange, options, ...utils };
};

const lastJsonData = (fn: jest.Mock) => fn.mock.calls[fn.mock.calls.length - 1][0].jsonData;

describe('ConfigEditor', () => {
  it('renders http settings and main sections', () => {
    setup();
    expect(screen.getByText('Use Yandex.Cloud authorization headers')).toBeInTheDocument();
    expect(screen.getByText('Additional')).toBeInTheDocument();
    expect(screen.queryByText('X-ClickHouse-User')).not.toBeInTheDocument();
  });

  it('syncs adHocValuesQuery into jsonData on mount', () => {
    const onOptionsChange = jest.fn();
    render(<ConfigEditor options={makeOptions() as any} onOptionsChange={onOptionsChange} />);
    expect(lastJsonData(onOptionsChange).adHocValuesQuery).toContain('SELECT');
  });

  it('toggles yandex cloud authorization', () => {
    const { onOptionsChange } = setup();
    fireEvent.click(document.getElementById('useYandexCloudAuthorization')!);
    expect(lastJsonData(onOptionsChange).useYandexCloudAuthorization).toBe(true);
  });

  it('shows and edits yandex auth fields when enabled', () => {
    const { onOptionsChange } = setup({ useYandexCloudAuthorization: true });
    fireEvent.change(document.getElementById('xHeaderUser')!, { target: { value: 'bob' } });
    expect(lastJsonData(onOptionsChange).xHeaderUser).toBe('bob');

    fireEvent.change(screen.getByPlaceholderText('DB user password'), { target: { value: 's3cret' } });
    const call = onOptionsChange.mock.calls[onOptionsChange.mock.calls.length - 1][0];
    expect(call.secureJsonData.xHeaderKey).toBe('s3cret');

    fireEvent.click(document.getElementById('xClickHouseSSLCertificateAuth')!);
    expect(lastJsonData(onOptionsChange).xClickHouseSSLCertificateAuth).toBe(true);
  });

  it('toggles additional switches', () => {
    const { onOptionsChange } = setup();
    fireEvent.click(document.getElementById('addCorsHeader')!);
    expect(lastJsonData(onOptionsChange).addCorsHeader).toBe(true);
    fireEvent.click(document.getElementById('usePOST')!);
    expect(lastJsonData(onOptionsChange).usePOST).toBe(true);
    fireEvent.click(document.getElementById('useCompressions')!);
    expect(lastJsonData(onOptionsChange).useCompression).toBe(true);
    fireEvent.click(document.getElementById('adhoc')!);
    expect(lastJsonData(onOptionsChange).adHocHideTableNames).toBe(true);
  });

  it('edits default database', () => {
    const { onOptionsChange } = setup();
    fireEvent.change(screen.getByPlaceholderText('default'), { target: { value: 'mydb' } });
    expect(lastJsonData(onOptionsChange).defaultDatabase).toBe('mydb');
  });

  it('selects compression type', async () => {
    const { onOptionsChange } = setup({ useCompression: true });
    const selects = screen.getAllByRole('combobox');
    await selectOption(selects[selects.length - 1], 'gzip');
    expect(lastJsonData(onOptionsChange).compressionType).toBe('gzip');
  });

  it('edits adhoc filter query through the code editor', () => {
    const { onOptionsChange } = setup();
    fireEvent.change(screen.getByTestId('code-editor'), { target: { value: 'SELECT 1' } });
    expect(lastJsonData(onOptionsChange).adHocValuesQuery).toBe('SELECT 1');
  });
});
