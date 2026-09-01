import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataLinksSection } from '../views/ConfigEditor/components/DataLinks/DataLinksSection';
import { DataLinkConfig } from '../datasource/datalinks/types';

// Replace DataLinkEditor with a stub so we only test list management here.
jest.mock('../views/ConfigEditor/components/DataLinks/DataLinkEditor', () => ({
  DataLinkEditor: ({ dataLink, onChange, onDelete }: any) => (
    <div data-testid="editor">
      <input
        data-testid={`name-${dataLink.fieldName}`}
        value={dataLink.fieldName}
        onChange={(e) => onChange({ ...dataLink, fieldName: e.target.value })}
      />
      <button onClick={onDelete}>delete-{dataLink.fieldName}</button>
    </div>
  ),
}));

describe('DataLinksSection', () => {
  it('renders empty state when list is empty', () => {
    render(<DataLinksSection dataLinks={[]} onChange={() => {}} />);
    expect(screen.getByText(/no data links configured/i)).toBeInTheDocument();
  });

  it('renders one editor per data link', () => {
    const links: DataLinkConfig[] = [
      { fieldName: 'a', title: 'A', targetDatasourceUid: 'x', query: 'q' },
      { fieldName: 'b', title: 'B', targetDatasourceUid: 'x', query: 'q' },
    ];
    render(<DataLinksSection dataLinks={links} onChange={() => {}} />);
    expect(screen.getAllByTestId('editor')).toHaveLength(2);
  });

  it('appends a new empty link on "Add data link"', () => {
    const onChange = jest.fn();
    render(<DataLinksSection dataLinks={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /add data link/i }));
    expect(onChange).toHaveBeenCalledWith([
      { fieldName: '', title: '', targetDatasourceUid: '', query: '' },
    ]);
  });

  it('removes a link by index', () => {
    const links: DataLinkConfig[] = [
      { fieldName: 'a', title: 'A', targetDatasourceUid: 'x', query: 'q' },
      { fieldName: 'b', title: 'B', targetDatasourceUid: 'x', query: 'q' },
    ];
    const onChange = jest.fn();
    render(<DataLinksSection dataLinks={links} onChange={onChange} />);
    fireEvent.click(screen.getByText('delete-a'));
    expect(onChange).toHaveBeenCalledWith([
      { fieldName: 'b', title: 'B', targetDatasourceUid: 'x', query: 'q' },
    ]);
  });

  it('propagates an edit by index', () => {
    const links: DataLinkConfig[] = [
      { fieldName: 'a', title: 'A', targetDatasourceUid: 'x', query: 'q' },
    ];
    const onChange = jest.fn();
    render(<DataLinksSection dataLinks={links} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('name-a'), { target: { value: 'aa' } });
    expect(onChange).toHaveBeenCalledWith([
      { fieldName: 'aa', title: 'A', targetDatasourceUid: 'x', query: 'q' },
    ]);
  });
});
