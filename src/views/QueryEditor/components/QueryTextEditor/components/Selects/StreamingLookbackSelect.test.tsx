import '@testing-library/jest-dom';
jest.mock('react-calendar', () => ({}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { selectOption, makeQuery } from 'spec/testUtils';
import { StreamingLookbackSelect } from './StreamingLookbackSelect';

describe('StreamingLookbackSelect', () => {
  it('renders default lookback of 1', () => {
    render(<StreamingLookbackSelect query={makeQuery() as any} onChange={jest.fn()} />);
    expect(screen.getByText('Lookback points')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders explicit value including 0', () => {
    render(<StreamingLookbackSelect query={makeQuery({ streamingLookback: 0 }) as any} onChange={jest.fn()} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('fires onChange with selected lookback', async () => {
    const onChange = jest.fn();
    render(<StreamingLookbackSelect query={makeQuery() as any} onChange={onChange} />);
    await selectOption(screen.getByRole('combobox'), '5');
    expect(onChange.mock.calls[0][0].value).toBe(5);
  });
});
