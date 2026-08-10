jest.mock('react-calendar', () => ({}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { selectOption, makeQuery } from 'spec/testUtils';
import { StreamingIntervalInput } from './StreamingIntervalInput';

describe('StreamingIntervalInput', () => {
  it('renders default interval of 5s', () => {
    render(<StreamingIntervalInput query={makeQuery() as any} handleStreamingIntervalChange={jest.fn()} />);
    expect(screen.getByText('Poll interval')).toBeInTheDocument();
    expect(screen.getByText('5s')).toBeInTheDocument();
  });

  it('renders explicit interval', () => {
    render(
      <StreamingIntervalInput query={makeQuery({ streamingInterval: 60000 }) as any} handleStreamingIntervalChange={jest.fn()} />
    );
    expect(screen.getByText('1m')).toBeInTheDocument();
  });

  it('fires handler with selected interval', async () => {
    const handler = jest.fn();
    render(<StreamingIntervalInput query={makeQuery() as any} handleStreamingIntervalChange={handler} />);
    await selectOption(screen.getByRole('combobox'), '30s');
    expect(handler.mock.calls[0][0].value).toBe(30000);
  });
});
