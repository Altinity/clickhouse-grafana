// force timezone to UTC to allow tests to work regardless of local timezone
// generally used by snapshots, but can affect specific tests
process.env.TZ = 'UTC';

const { grafanaESModules, nodeModulesToTransform } = require('./.config/jest/utils');

module.exports = {
  // Jest configuration provided by Grafana scaffolding
  ...require('./.config/jest.config'),
  // Extend ESM transform list to include react-calendar (transitively imported by @grafana/ui).
  // Without this, jest throws "Cannot use import statement outside a module" when tests import
  // datasource.ts (which transitively pulls in @grafana/ui → react-calendar ESM bundle).
  transformIgnorePatterns: [nodeModulesToTransform([...grafanaESModules, 'react-calendar'])],
  // Async RTL tests (Advanced logs modal) do a real render + findBy* after a mocked fetch; under
  // the full parallel suite (plus the extra ESM transforms above) the first heavy test can exceed
  // the 5s default. Logic is verified green in isolation — raise the ceiling to avoid flaky timeouts.
  testTimeout: 15000,
};
