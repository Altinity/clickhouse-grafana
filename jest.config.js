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

  // Pin the coverage denominator to the whole frontend (issue #785).
  // Without this, Istanbul only counts files imported by some test, which
  // inflates the headline number over a small slice of the codebase.
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.{test,spec,jest}.{ts,tsx}',
    '!src/**/__mocks__/**',
    '!src/spec/testUtils/**',
    '!src/**/*.d.ts',
    // Pure static data (autocomplete metadata): thousands of LOC, ~5 statements, no logic.
    '!src/views/QueryEditor/components/QueryTextEditor/editor/autocompletions/functions.ts',
    '!src/views/QueryEditor/components/QueryTextEditor/editor/constants/funcs.ts',
  ],

  // Ratchet: floor measured 2026-08-10 (stmts 91.9 / branch 90.17 / func 82.18 / lines 92.68).
  // Raise these as coverage grows; never lower without a written justification.
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 88,
      functions: 80,
      lines: 90,
    },
  },
};
