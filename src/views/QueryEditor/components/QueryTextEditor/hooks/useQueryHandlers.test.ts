import { useQueryHandlers } from './useQueryHandlers';

// No React state inside the hook — a direct call is sufficient.
const setup = () => {
  const onFieldChange = jest.fn();
  const handlers = useQueryHandlers({ onFieldChange, query: {} });
  return { onFieldChange, handlers };
};

describe('useQueryHandlers streaming fallback defaults', () => {
  it('streamingInterval uses || so 0 and undefined both fall back to 5000', () => {
    const { onFieldChange, handlers } = setup();
    handlers.handleStreamingIntervalChange(undefined);
    handlers.handleStreamingIntervalChange(0);
    handlers.handleStreamingIntervalChange(1000);
    expect(onFieldChange.mock.calls.map((c) => c[0].value)).toEqual([5000, 5000, 1000]);
  });

  it('streamingLookback uses ?? so 0 is preserved and only undefined falls back to 1', () => {
    const { onFieldChange, handlers } = setup();
    handlers.handleStreamingLookbackChange(undefined);
    handlers.handleStreamingLookbackChange(0);
    expect(onFieldChange.mock.calls.map((c) => c[0].value)).toEqual([1, 0]);
  });

  it('streamingMode falls back to delta when undefined', () => {
    const { onFieldChange, handlers } = setup();
    handlers.handleStreamingModeChange(undefined);
    handlers.handleStreamingModeChange('total');
    expect(onFieldChange.mock.calls.map((c) => c[0].value)).toEqual(['delta', 'total']);
  });
});
