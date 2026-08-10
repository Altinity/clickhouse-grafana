import '@testing-library/jest-dom';
jest.mock('react-calendar', () => ({}));

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import 'spec/testUtils';
import { AdhocFilterTags } from './AdhocFilterTags';

const filters = [
  { key: 'host', operator: '=', value: 'web1' },
  { key: 'region', operator: '!=', value: 'us' },
];

describe('AdhocFilterTags', () => {
  it('renders nothing when adhoc filters are natively available', () => {
    const { container } = render(
      <AdhocFilterTags adhocFilters={filters} areAdHocFiltersAvailable={true} onFieldChange={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there are no filters', () => {
    const { container } = render(
      <AdhocFilterTags adhocFilters={[]} areAdHocFiltersAvailable={false} onFieldChange={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one tag per filter', () => {
    render(<AdhocFilterTags adhocFilters={filters} areAdHocFiltersAvailable={false} onFieldChange={jest.fn()} />);
    expect(screen.getByText('host = web1')).toBeInTheDocument();
    expect(screen.getByText('region != us')).toBeInTheDocument();
  });

  it('parses remaining tags back into filters on removal', () => {
    const onFieldChange = jest.fn();
    render(<AdhocFilterTags adhocFilters={filters} areAdHocFiltersAvailable={false} onFieldChange={onFieldChange} />);
    fireEvent.click(screen.getByRole('button', { name: /host = web1/ }));
    expect(onFieldChange).toHaveBeenCalledWith({
      fieldName: 'adHocFilters',
      value: [{ key: 'region', operator: '!=', value: 'us' }],
    });
  });
});
