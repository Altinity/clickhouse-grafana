import '@testing-library/jest-dom';
jest.mock('react-calendar', () => ({}));
jest.mock('./DefaultValues.api');

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { selectOption } from 'spec/testUtils';
import { DefaultValues } from './DefaultValues';
import { getOptions, getSettings } from './DefaultValues.api';

const mockGetSettings = getSettings as jest.Mock;
const mockGetOptions = getOptions as jest.Mock;

// dataSourceUrl '' keeps the fetch effect inert unless a test opts in
const setup = (jsonData: any = {}, newOptions: any = {}) => {
  const onSwitchToggle = jest.fn();
  const onFieldChange = jest.fn();
  render(
    <DefaultValues
      jsonData={{ dataSourceUrl: '', ...jsonData }}
      newOptions={{ version: 2, uid: 'uid-1', ...newOptions }}
      onSwitchToggle={onSwitchToggle}
      onFieldChange={onFieldChange}
    />
  );
  return { onSwitchToggle, onFieldChange };
};

const columns = (rows: Array<[string, string]>) => ({
  data: rows.map(([name, type]) => ({ name, type, database: 'db', table: 't' })),
});

describe('DefaultValues', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders collapsed when useDefaultConfiguration is off', () => {
    setup();
    expect(screen.getByText('Use default values')).toBeInTheDocument();
    expect(screen.queryByText('TimestampType')).not.toBeInTheDocument();
  });

  it('toggles useDefaultConfiguration', () => {
    const { onSwitchToggle } = setup();
    fireEvent.click(document.getElementById('useDefaultConfiguration')!);
    expect(onSwitchToggle).toHaveBeenCalledWith('useDefaultConfiguration', true);
  });

  it('renders all sections when enabled', () => {
    setup({ useDefaultConfiguration: true });
    expect(screen.getByText('TimestampType')).toBeInTheDocument();
    expect(screen.getByText('DateTime columns')).toBeInTheDocument();
    expect(screen.getByText('Datetime Field')).toBeInTheDocument();
    expect(screen.getByText('Logs settings')).toBeInTheDocument();
    expect(screen.getByText('Macros settings')).toBeInTheDocument();
  });

  it('shows save-first alert for unsaved datasource (version 1)', () => {
    setup({ useDefaultConfiguration: true }, { version: 1 });
    expect(screen.getByText(/Please save data source before use default configurations/)).toBeInTheDocument();
  });

  it('changes timestamp type via select', async () => {
    const { onFieldChange } = setup({ useDefaultConfiguration: true });
    await selectOption(screen.getAllByRole('combobox')[0], 'DateTime64');
    expect(onFieldChange).toHaveBeenCalledWith({ value: 'DATETIME64' }, 'defaultDateTimeType');
  });

  it('changes context window size via select', async () => {
    const { onFieldChange } = setup({ useDefaultConfiguration: true });
    const selects = screen.getAllByRole('combobox');
    await selectOption(selects[selects.length - 1], '50 entries');
    expect(onFieldChange).toHaveBeenCalledWith({ value: '50' }, 'contextWindowSize');
  });

  it('toggles macros switches', () => {
    const { onSwitchToggle } = setup({ useDefaultConfiguration: true });
    fireEvent.click(screen.getByTestId('use-window-func-for-macros'));
    expect(onSwitchToggle).toHaveBeenCalledWith('useWindowFuncForMacros', false);
    fireEvent.click(screen.getByTestId('nullify-sparse-switch'));
    expect(onSwitchToggle).toHaveBeenCalledWith('nullifySparse', true);
  });

  it('loads column options grouped by normalized type', async () => {
    mockGetSettings.mockResolvedValue({ datasources: { a: { uid: 'uid-1', basicAuth: 'Basic xyz' } } });
    mockGetOptions.mockResolvedValue(
      columns([
        ['dt_col', 'DateTime'],
        ['dt_tz_col', "DateTime('UTC')"],
        ['dt64_col', 'DateTime64(3)'],
        ['u32_col', 'UInt32'],
        ['u64_col', 'UInt64'],
        ['d_col', 'Date'],
        ['f_col', 'LowCardinality(Float64)'],
        ['dec_col', 'Nullable(Decimal(10,2))'],
      ])
    );
    const { onFieldChange } = setup({ useDefaultConfiguration: true, dataSourceUrl: 'http://localhost:8123' });
    expect(await screen.findByText('Datetime Field')).toBeInTheDocument();
    expect(mockGetOptions).toHaveBeenCalled();

    // DateTime select gets both plain and timezone-typed columns
    const dtSelect = screen.getAllByRole('combobox')[1];
    fireEvent.keyDown(dtSelect, { key: 'ArrowDown' });
    expect(await screen.findByText('dt_col')).toBeInTheDocument();
    expect(screen.getByText('dt_tz_col')).toBeInTheDocument();
    fireEvent.click(screen.getByText('dt_col'));
    expect(onFieldChange).toHaveBeenCalledWith({ value: 'dt_col' }, 'defaultDateTime');

    // Float select merges Float and Decimal columns
    const floatSelect = screen.getAllByRole('combobox')[4];
    fireEvent.keyDown(floatSelect, { key: 'ArrowDown' });
    expect(await screen.findByText('f_col')).toBeInTheDocument();
    expect(screen.getByText('dec_col')).toBeInTheDocument();
  });

  it('skips fetch when url is not http(s)', () => {
    setup({ useDefaultConfiguration: true, dataSourceUrl: 'localhost:8123' });
    expect(mockGetSettings).not.toHaveBeenCalled();
  });

  it('recovers when the options request fails', async () => {
    mockGetSettings.mockResolvedValue({ datasources: { a: { uid: 'uid-1' } } });
    mockGetOptions.mockRejectedValue(new Error('boom'));
    setup({ useDefaultConfiguration: true, dataSourceUrl: 'http://localhost:8123' });
    expect(await screen.findByText('Datetime Field')).toBeInTheDocument();
    expect(mockGetOptions).toHaveBeenCalled();
  });
});
