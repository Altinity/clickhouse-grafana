export const RESOLUTION_OPTIONS = [
  { value: 1, label: '1/1' },
  { value: 2, label: '1/2' },
  { value: 3, label: '1/3' },
  { value: 4, label: '1/4' },
  { value: 5, label: '1/5' },
  { value: 10, label: '1/10' },
];

export const FORMAT_OPTIONS = [
  { label: 'Time series', value: 'time_series' },
  { label: 'Table', value: 'table' },
  { label: 'Logs', value: 'logs' },
  { label: 'Traces', value: 'traces' },
  { label: 'Flame Graph', value: 'flamegraph' },
];

export const CONTEXT_WINDOW_OPTIONS = [ '10', '20', '50', '100' ].map(value => ({ value, label: value }));
