// force timezone to UTC to allow tests to work regardless of local timezone
// generally used by snapshots, but can affect specific tests
process.env.TZ = 'UTC';

const { nodeModulesToTransform, grafanaESModules } = require('./.config/jest/utils');

// ESM-only packages pulled in transitively by @grafana/ui / @grafana/runtime
// (TimeRangePicker -> react-calendar -> @wojtekmaj/date-utils, get-user-locale).
// Jest must transform them, otherwise any suite importing @grafana/ui (e.g. the
// DataLinks editors) or @grafana/runtime fails to even load with
// "Cannot use import statement outside a module".
const extraESModules = [
  'react-calendar',
  '@wojtekmaj/date-utils',
  'get-user-locale',
  'memoize',
  'mimic-function',
];

module.exports = {
  // Jest configuration provided by Grafana scaffolding
  ...require('./.config/jest.config'),
  transformIgnorePatterns: [nodeModulesToTransform([...grafanaESModules, ...extraESModules])],
};
