import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataLinkEditor } from '../views/ConfigEditor/components/DataLinks/DataLinkEditor';
import { DataLinkConfig } from '../datasource/datalinks/types';

jest.mock('@grafana/runtime', () => ({
  getDataSourceSrv: () => ({
    getInstanceSettings: (uid: string) => {
      if (uid === 'ch-uid') return { type: 'vertamedia-clickhouse-datasource', name: 'CH' };
      if (uid === 'loki-uid') return { type: 'loki', name: 'Loki' };
      return undefined;
    },
  }),
  DataSourcePicker: ({ current, onChange }: any) => (
    <select
      data-testid="ds-picker"
      value={current ?? ''}
      onChange={(e) => onChange({ uid: e.target.value })}
    >
      <option value="">(none)</option>
      <option value="ch-uid">CH</option>
      <option value="loki-uid">Loki</option>
    </select>
  ),
}));

// Mock @grafana/ui's CodeEditor to a plain textarea for test simplicity.
jest.mock('@grafana/ui', () => {
  const actual = jest.requireActual('@grafana/ui');
  return {
    ...actual,
    CodeEditor: ({ value, onBlur }: any) => (
      <textarea
        data-testid="code-editor"
        defaultValue={value}
        onBlur={(e) => onBlur(e.currentTarget.value)}
      />
    ),
  };
});

describe('DataLinkEditor', () => {
  const baseLink: DataLinkConfig = {
    fieldName: 'trace_id',
    title: 'View',
    targetDatasourceUid: 'loki-uid',
    query: 'q',
  };

  it('renders all editable fields with current values', () => {
    render(
      <DataLinkEditor
        dataLink={baseLink}
        onChange={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByDisplayValue('trace_id')).toBeInTheDocument();
    expect(screen.getByDisplayValue('View')).toBeInTheDocument();
    expect(screen.getByTestId('code-editor')).toHaveValue('q');
  });

  it('hides Format selector when target is not ClickHouse', () => {
    render(
      <DataLinkEditor
        dataLink={baseLink}
        onChange={() => {}}
        onDelete={() => {}}
      />
    );
    // @grafana/ui Field renders <label> without a `for` attribute, so queryByLabelText always returns null.
    // Use queryByText targeting the label text instead.
    expect(screen.queryByText(/^format$/i)).not.toBeInTheDocument();
  });

  it('shows Format selector when target is ClickHouse', () => {
    render(
      <DataLinkEditor
        dataLink={{ ...baseLink, targetDatasourceUid: 'ch-uid' }}
        onChange={() => {}}
        onDelete={() => {}}
      />
    );
    // @grafana/ui Field renders <label> without a `for` attribute, so getByLabelText fails.
    // Use getByText targeting the label element instead.
    expect(screen.getByText(/^format$/i)).toBeInTheDocument();
  });

  it('calls onChange when fieldName is edited', () => {
    const onChange = jest.fn();
    render(
      <DataLinkEditor dataLink={baseLink} onChange={onChange} onDelete={() => {}} />
    );
    fireEvent.change(screen.getByDisplayValue('trace_id'), { target: { value: 'span_id' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fieldName: 'span_id' }));
  });

  it('calls onDelete when remove button is clicked', () => {
    const onDelete = jest.fn();
    render(
      <DataLinkEditor dataLink={baseLink} onChange={() => {}} onDelete={onDelete} />
    );
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('hides Target/Query/Format and renders External URL Input in external mode', () => {
    const external: DataLinkConfig = {
      ...baseLink,
      url: 'https://jaeger.example.com/trace/${__value.raw}',
    };
    render(<DataLinkEditor dataLink={external} onChange={() => {}} onDelete={() => {}} />);
    expect(screen.getByDisplayValue('https://jaeger.example.com/trace/${__value.raw}')).toBeInTheDocument();
    expect(screen.queryByTestId('code-editor')).not.toBeInTheDocument();
    // Target/Format labels are not rendered when external mode is active.
    expect(screen.queryByText(/^target$/i)).not.toBeInTheDocument();
  });

  it('shows error when targetDatasourceUid points to a missing datasource', () => {
    render(
      <DataLinkEditor
        dataLink={{ ...baseLink, targetDatasourceUid: 'missing-uid' }}
        onChange={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText(/target datasource not found/i)).toBeInTheDocument();
  });
});
