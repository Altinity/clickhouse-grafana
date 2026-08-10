jest.mock('react-calendar', () => ({}));

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { makeQuery } from 'spec/testUtils';
import { StreamingSwitch } from './StreamingSwitch';

describe('StreamingSwitch', () => {
  it('reflects query.streaming state', () => {
    render(<StreamingSwitch query={makeQuery({ streaming: true }) as any} onChange={jest.fn()} />);
    expect(screen.getByTestId('streaming-switch')).toBeChecked();
  });

  it('fires onChange on click', () => {
    const onChange = jest.fn();
    render(<StreamingSwitch query={makeQuery({ streaming: false }) as any} onChange={onChange} />);
    const sw = screen.getByTestId('streaming-switch');
    expect(sw).not.toBeChecked();
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
