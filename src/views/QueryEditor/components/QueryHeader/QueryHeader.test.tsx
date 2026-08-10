import '@testing-library/jest-dom';
jest.mock('react-calendar', () => ({}));

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import 'spec/testUtils';
import { QueryHeader } from './QueryHeader';
import { EditorMode } from '../../../../types/types';

const setup = (over: any = {}) => {
  const props = {
    editorMode: EditorMode.SQL,
    setEditorMode: jest.fn(),
    isAnnotationView: false,
    onTriggerQuery: jest.fn(),
    datasource: {} as any,
    query: { refId: 'A', dateTimeType: 'DATETIME' } as any,
    onChange: jest.fn(),
    hasAutocompleteError: false,
    ...over,
  };
  render(<QueryHeader {...props} />);
  return props;
};

// datasource defaults that differ from the query by dateTimeType only
const datasourceWithDefaults = {
  defaultValues: {
    defaultDateTimeType: 'DATETIME64',
    dateTime: {},
  },
} as any;

describe('QueryHeader', () => {
  it('runs query from SQL mode', () => {
    const { onTriggerQuery } = setup();
    fireEvent.click(screen.getByText('Run Query'));
    expect(onTriggerQuery).toHaveBeenCalled();
  });

  it('hides Run Query in annotation view', () => {
    setup({ isAnnotationView: true });
    expect(screen.queryByText('Run Query')).not.toBeInTheDocument();
  });

  it('shows autocomplete error badge only in SQL mode', () => {
    setup({ hasAutocompleteError: true });
    expect(screen.getByText(/Autocomplete unavailable/)).toBeInTheDocument();
  });

  it('switches editor mode via tabs', () => {
    const { setEditorMode, onChange, query } = setup();
    fireEvent.click(screen.getByLabelText('Query Settings'));
    expect(setEditorMode).toHaveBeenCalledWith(EditorMode.Builder);
    expect(onChange).toHaveBeenCalledWith({ ...query, editorMode: EditorMode.Builder });
  });

  it('navigates from builder to SQL mode', () => {
    const { setEditorMode } = setup({ editorMode: EditorMode.Builder });
    fireEvent.click(screen.getByText('Go to Query'));
    expect(setEditorMode).toHaveBeenCalledWith(EditorMode.SQL);
  });

  it('offers override only when query differs from datasource defaults', () => {
    setup({ editorMode: EditorMode.Builder });
    expect(screen.queryByText('Override settings')).not.toBeInTheDocument();
  });

  it('resets differing fields through the confirmation modal', () => {
    const { onChange, query } = setup({ editorMode: EditorMode.Builder, datasource: datasourceWithDefaults });
    fireEvent.click(screen.getByText('Override settings'));
    expect(screen.getByText(/Configuration will be reset/)).toBeInTheDocument();
    expect(screen.getByText('DATETIME → DATETIME64')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirm'));
    expect(onChange).toHaveBeenCalledWith({ ...query, dateTimeType: 'DATETIME64' });
  });

  it('cancel closes the modal without changes', () => {
    const { onChange } = setup({ editorMode: EditorMode.Builder, datasource: datasourceWithDefaults });
    fireEvent.click(screen.getByText('Override settings'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
