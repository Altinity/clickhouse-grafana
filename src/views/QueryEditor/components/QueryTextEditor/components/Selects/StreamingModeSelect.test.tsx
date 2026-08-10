import '@testing-library/jest-dom';
// react-calendar is ESM-only and not in the scaffolded transform list; @grafana/ui barrel imports it
jest.mock('react-calendar', () => ({}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { selectOption, makeQuery } from 'spec/testUtils';
import { StreamingModeSelect } from './StreamingModeSelect';

const warning = /Delta mode requires \$timeFilter/;

describe('StreamingModeSelect', () => {
  it('renders current mode and no warning for empty query', () => {
    render(<StreamingModeSelect query={makeQuery() as any} onChange={jest.fn()} />);
    expect(screen.getByText('Delta')).toBeInTheDocument();
    expect(screen.queryByText(warning)).not.toBeInTheDocument();
  });

  it('warns when delta mode query lacks time macros', () => {
    render(<StreamingModeSelect query={makeQuery({ query: 'SELECT 1' }) as any} onChange={jest.fn()} />);
    expect(screen.getByText(warning)).toBeInTheDocument();
  });

  it('does not warn when $timeFilter present or mode is full', () => {
    const { rerender } = render(
      <StreamingModeSelect query={makeQuery({ query: 'SELECT 1 WHERE $timeFilter' }) as any} onChange={jest.fn()} />
    );
    expect(screen.queryByText(warning)).not.toBeInTheDocument();
    rerender(
      <StreamingModeSelect query={makeQuery({ query: 'SELECT 1', streamingMode: 'full' }) as any} onChange={jest.fn()} />
    );
    expect(screen.queryByText(warning)).not.toBeInTheDocument();
  });

  it('fires onChange with selected mode', async () => {
    const onChange = jest.fn();
    render(<StreamingModeSelect query={makeQuery() as any} onChange={onChange} />);
    await selectOption(screen.getByRole('combobox'), 'Full refresh');
    expect(onChange.mock.calls[0][0].value).toBe('full');
  });
});
