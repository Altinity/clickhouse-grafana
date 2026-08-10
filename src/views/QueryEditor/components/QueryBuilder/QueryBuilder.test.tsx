import '@testing-library/jest-dom';
jest.mock('react-calendar', () => ({}));
jest.mock('./hooks/useConnectionData');

import React from 'react';
import { render, screen } from '@testing-library/react';
import { selectOption } from 'spec/testUtils';
import { QueryBuilder } from './QueryBuilder';
import { useConnectionData } from './hooks/useConnectionData';

const setters = {
  setSelectedDatabase: jest.fn(),
  setSelectedTable: jest.fn(),
  setSelectedColumnTimestampType: jest.fn(),
  setSelectedColumnDateType: jest.fn(),
  setSelectedDateTimeType: jest.fn(),
};

(useConnectionData as jest.Mock).mockReturnValue([
  [{ label: 'db1', value: 'db1' }, { label: 'db2', value: 'db2' }], // databases
  [{ label: 't1', value: 't1' }], // tables
  [{ label: 'd_col', value: 'd_col' }], // dateColumns
  [{ label: 'ts_col', value: 'ts_col' }, { label: 'ts2_col', value: 'ts2_col' }], // timestampColumns
  'ts_col',
  'd_col',
  setters.setSelectedDatabase,
  setters.setSelectedTable,
  setters.setSelectedColumnTimestampType,
  setters.setSelectedColumnDateType,
  setters.setSelectedDateTimeType,
  't1',
  'db1',
  'DATETIME',
]);

const query = {
  refId: 'A',
  database: 'db1',
  table: 't1',
  dateTimeColDataType: 'ts_col',
  dateColDataType: 'd_col',
  dateTimeType: 'DATETIME',
};

const setup = () => {
  const onChange = jest.fn();
  render(<QueryBuilder query={query} onChange={onChange} datasource={{}} />);
  return onChange;
};

describe('QueryBuilder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('syncs selection state from query on mount', () => {
    setup();
    expect(setters.setSelectedDatabase).toHaveBeenCalledWith('db1');
    expect(setters.setSelectedTable).toHaveBeenCalledWith('t1');
    expect(setters.setSelectedColumnTimestampType).toHaveBeenCalledWith('ts_col');
    expect(setters.setSelectedColumnDateType).toHaveBeenCalledWith('d_col');
    expect(setters.setSelectedDateTimeType).toHaveBeenCalledWith('DATETIME');
  });

  it('renders current selections', () => {
    setup();
    expect(screen.getByText('db1')).toBeInTheDocument();
    expect(screen.getByText('t1')).toBeInTheDocument();
    expect(screen.getByText('ts_col')).toBeInTheDocument();
    expect(screen.getByText('d_col')).toBeInTheDocument();
  });

  it('propagates database change', async () => {
    const onChange = setup();
    await selectOption(screen.getAllByRole('combobox')[0], 'db2');
    expect(setters.setSelectedDatabase).toHaveBeenCalledWith('db2');
    expect(onChange).toHaveBeenCalledWith({ ...query, database: 'db2' });
  });

  it('propagates timestamp type change', async () => {
    const onChange = setup();
    await selectOption(screen.getAllByRole('combobox')[2], 'DateTime64');
    expect(setters.setSelectedDateTimeType).toHaveBeenCalledWith('DATETIME64');
    expect(onChange).toHaveBeenCalledWith({ ...query, dateTimeType: 'DATETIME64' });
  });

  it('propagates timestamp column change', async () => {
    const onChange = setup();
    await selectOption(screen.getAllByRole('combobox')[3], 'ts2_col');
    expect(setters.setSelectedColumnTimestampType).toHaveBeenCalledWith('ts2_col');
    expect(onChange).toHaveBeenCalledWith({ ...query, dateTimeColDataType: 'ts2_col' });
  });
});
