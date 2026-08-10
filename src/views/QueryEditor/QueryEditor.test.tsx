import '@testing-library/jest-dom';
jest.mock('react-calendar', () => ({}));
jest.mock('./components/QueryTextEditor/SQLCodeEditor', () => ({
  SQLCodeEditor: ({ onSqlChange }: any) => (
    <button data-testid="sql-editor" onClick={() => onSqlChange('SELECT 2')} />
  ),
}));
jest.mock('./components/QueryBuilder/hooks/useConnectionData');
jest.mock('./hooks/useFormattedData');
jest.mock('./hooks/useAutocompletionData');
jest.mock('./hooks/useQueryState');
jest.mock('./helpers/getAdHocFilters');
jest.mock('./helpers/detectVariableMacroIntersections');

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import 'spec/testUtils';
import { QueryEditor, QueryEditorVariable } from './QueryEditor';
import { useConnectionData } from './components/QueryBuilder/hooks/useConnectionData';
import { useFormattedData } from './hooks/useFormattedData';
import { useAutocompleteData } from './hooks/useAutocompletionData';
import { getAdhocFilters } from './helpers/getAdHocFilters';
import {
  detectVariableMacroIntersections,
  createVariableMacroConflictWarning,
} from './helpers/detectVariableMacroIntersections';

const setters = Array.from({ length: 5 }, () => jest.fn());
// selections must be non-empty strings: UniversalSelectField loops forever on empty values
(useConnectionData as jest.Mock).mockReturnValue([[], [], [], [], 'ts', 'd', ...setters, 't', 'db', 'DATETIME']);
(useAutocompleteData as jest.Mock).mockReturnValue({ data: null, hasPermissionError: false });
(getAdhocFilters as jest.Mock).mockReturnValue([]);

const mockFormatted = useFormattedData as jest.Mock;
const mockConflicts = detectVariableMacroIntersections as jest.Mock;
const mockWarning = createVariableMacroConflictWarning as jest.Mock;

const setup = (queryOver: any = {}, Component: any = QueryEditor) => {
  const onChange = jest.fn();
  const onRunQuery = jest.fn();
  render(
    <Component
      datasource={{} as any}
      query={{ refId: 'A', query: 'SELECT 1', ...queryOver } as any}
      onChange={onChange}
      onRunQuery={onRunQuery}
      app="panel-editor"
    />
  );
  return { onChange, onRunQuery };
};

describe('QueryEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatted.mockReturnValue(['SELECT 1', null]);
    mockConflicts.mockReturnValue([]);
    mockWarning.mockReturnValue('');
  });

  it('renders builder mode by default', () => {
    setup();
    expect(screen.getByLabelText('Query Settings')).toBeChecked();
    expect(screen.queryByTestId('sql-editor')).not.toBeInTheDocument();
  });

  it('renders SQL editor mode with Run Query and wires onSqlChange', () => {
    const { onChange, onRunQuery } = setup({ editorMode: 'sql' });
    fireEvent.click(screen.getByTestId('sql-editor'));
    expect(onChange.mock.calls.some(([q]) => q.query === 'SELECT 2')).toBe(true);
    fireEvent.click(screen.getByText('Run Query'));
    expect(onRunQuery).toHaveBeenCalled();
  });

  it('opens SQL mode when query has database and table', () => {
    setup({ database: 'db', table: 't' });
    expect(screen.getByTestId('sql-editor')).toBeInTheDocument();
  });

  it('shows formatting error alert', () => {
    mockFormatted.mockReturnValue(['', 'Bad SQL syntax']);
    setup({ editorMode: 'sql' });
    expect(screen.getByText('Bad SQL syntax')).toBeInTheDocument();
  });

  it('shows variable/macro conflict warning', () => {
    mockConflicts.mockReturnValue(['timeFilter']);
    mockWarning.mockReturnValue('Variable conflicts with macro: timeFilter');
    setup();
    expect(screen.getByText('Variable/Macro Name Conflict Warning')).toBeInTheDocument();
    expect(screen.getByText('Variable conflicts with macro: timeFilter')).toBeInTheDocument();
  });

  it('propagates formattedQuery when formatter output differs', () => {
    mockFormatted.mockReturnValue(['SELECT 1 FORMATTED', null]);
    const { onChange } = setup({ editorMode: 'sql' });
    expect(onChange.mock.calls.some(([q]) => q.formattedQuery === 'SELECT 1 FORMATTED')).toBe(true);
  });
});

describe('QueryEditorVariable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatted.mockReturnValue(['SELECT 1', null]);
    mockConflicts.mockReturnValue([]);
    mockWarning.mockReturnValue('');
  });

  it('renders header tabs for variable editor', () => {
    setup({}, QueryEditorVariable);
    expect(screen.getByLabelText('Query Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('SQL Editor')).toBeInTheDocument();
  });
});
