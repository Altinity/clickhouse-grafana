jest.mock('react-calendar', () => ({}));
// Monaco-based editor cannot run under jsdom
jest.mock('./SQLCodeEditor', () => ({
  SQLCodeEditor: () => <div data-testid="sql-editor" />,
}));

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { makeQuery } from 'spec/testUtils';
import { QueryTextEditor } from './QueryTextEditor';

const setup = (queryOver: any = {}, propsOver: any = {}) => {
  const onFieldChange = jest.fn();
  render(
    <QueryTextEditor
      query={makeQuery({ query: 'SELECT 1', format: 'time_series', ...queryOver }) as any}
      onSqlChange={jest.fn()}
      onFieldChange={onFieldChange}
      formattedData="SELECT 1"
      onRunQuery={jest.fn()}
      datasource={{} as any}
      isAnnotationView={false}
      adhocFilters={[]}
      areAdHocFiltersAvailable={true}
      autocompleteData={null}
      {...propsOver}
    />
  );
  return onFieldChange;
};

describe('QueryTextEditor', () => {
  it('renders editor with toggles, inputs and format select', () => {
    setup();
    expect(screen.getByTestId('sql-editor')).toBeInTheDocument();
    expect(screen.getByTestId('extrapolate-switch')).toBeInTheDocument();
    expect(screen.getByTestId('interval-input')).toBeInTheDocument();
    expect(screen.getByTestId('round-input')).toBeInTheDocument();
    expect(screen.getByText('Format As')).toBeInTheDocument();
    expect(screen.queryByText('Poll interval')).not.toBeInTheDocument();
    expect(screen.queryByTestId('context-window-size-select')).not.toBeInTheDocument();
  });

  it('fires toggle and input handlers with fieldName payloads', () => {
    const onFieldChange = setup({ extrapolate: true });
    fireEvent.click(screen.getByTestId('extrapolate-switch'));
    expect(onFieldChange).toHaveBeenCalledWith({ fieldName: 'extrapolate', value: false });
    fireEvent.click(screen.getByTestId('streaming-switch'));
    expect(onFieldChange).toHaveBeenCalledWith({ fieldName: 'streaming', value: true });
    fireEvent.change(screen.getByTestId('interval-input'), { target: { value: '30s' } });
    expect(onFieldChange).toHaveBeenCalledWith({ fieldName: 'interval', value: '30s' });
    fireEvent.change(screen.getByTestId('round-input'), { target: { value: '1m' } });
    expect(onFieldChange).toHaveBeenCalledWith({ fieldName: 'round', value: '1m' });
  });

  it('shows streaming controls only when streaming, lookback only in delta mode', () => {
    setup({ streaming: true });
    expect(screen.getByText('Poll interval')).toBeInTheDocument();
    expect(screen.getByText('Streaming mode')).toBeInTheDocument();
    expect(screen.getByText('Lookback points')).toBeInTheDocument();
  });

  it('hides lookback in full refresh mode', () => {
    setup({ streaming: true, streamingMode: 'full' });
    expect(screen.queryByText('Lookback points')).not.toBeInTheDocument();
  });

  it('shows context window select for logs format', () => {
    setup({ format: 'logs' });
    expect(screen.getByTestId('context-window-size-select')).toBeInTheDocument();
  });

  it('hides format select in annotation view', () => {
    setup({}, { isAnnotationView: true });
    expect(screen.queryByText('Format As')).not.toBeInTheDocument();
  });

  it('renders formatted SQL and macros help on demand', () => {
    setup({ showFormattedSQL: true, showHelp: true });
    expect(screen.getByText('Reformatted Query')).toBeInTheDocument();
    expect(screen.getByText('Macros')).toBeInTheDocument();
  });
});
