import '@testing-library/jest-dom';
jest.mock('react-calendar', () => ({}));

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import 'spec/testUtils';
import { FormattedSQL } from './FormattedSQL';

const sql = 'SELECT *\nFROM table';

describe('FormattedSQL', () => {
  it('renders nothing when hidden', () => {
    const { container } = render(<FormattedSQL sql={sql} showFormattedSQL={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the sql text when shown', () => {
    render(<FormattedSQL sql={sql} showFormattedSQL={true} />);
    expect(screen.getByText('Reformatted Query')).toBeInTheDocument();
    expect(screen.getByText(/SELECT \*/)).toBeInTheDocument();
  });

  it('copies sql to clipboard and shows transient message', async () => {
    jest.useFakeTimers();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<FormattedSQL sql={sql} showFormattedSQL={true} />);
    fireEvent.click(screen.getByLabelText('copy-formatted-data-to-clipboard'));
    // flush the clipboard promise
    await act(async () => {});
    expect(writeText).toHaveBeenCalledWith(sql);
    expect(screen.getByText('Copied!')).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1500));
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    jest.useRealTimers();
  });
});
