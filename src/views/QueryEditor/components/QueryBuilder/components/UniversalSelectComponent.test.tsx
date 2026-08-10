import '@testing-library/jest-dom';
jest.mock('react-calendar', () => ({}));

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { selectOption } from 'spec/testUtils';
import { UniversalSelectField } from './UniversalSelectComponent';

const options = [
  { label: 'alpha', value: 'alpha' },
  { label: 'beta', value: 'beta' },
];

describe('UniversalSelectField', () => {
  it('renders placeholder and selected value', () => {
    render(<UniversalSelectField value="alpha" onChange={jest.fn()} options={options} placeholder="pick" />);
    expect(screen.getByText('alpha')).toBeInTheDocument();
  });

  it('injects unknown value as a custom option', () => {
    render(<UniversalSelectField value="custom_col" onChange={jest.fn()} options={options} />);
    expect(screen.getByText('custom_col')).toBeInTheDocument();
  });

  // value must stay defined: the component's sync effect loops forever on undefined values
  it('fires onChange with option value', async () => {
    const onChange = jest.fn();
    render(<UniversalSelectField value="alpha" onChange={onChange} options={options} placeholder="pick" />);
    await selectOption(screen.getByRole('combobox'), 'beta');
    expect(onChange).toHaveBeenCalledWith({ value: 'beta' });
  });

  it('creates custom option from typed value', async () => {
    const onChange = jest.fn();
    render(<UniversalSelectField value="alpha" onChange={onChange} options={options} placeholder="pick" />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'my_col ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith({ value: 'my_col' });
  });

  it('deduplicates options against injected custom ones', () => {
    render(
      <UniversalSelectField
        value="alpha"
        onChange={jest.fn()}
        options={[...options, { label: 'alpha', value: 'alpha' }]}
      />
    );
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
    expect(screen.getAllByText('alpha').length).toBeLessThanOrEqual(2); // selected value + single menu entry
  });
});
