// force timezone to UTC to allow tests to work regardless of local timezone
// generally used by snapshots, but can affect specific tests
process.env.TZ = 'UTC';

module.exports = {
  // Jest configuration provided by Grafana scaffolding
  ...require('./.config/jest.config'),

  // Pin the coverage denominator to the whole frontend (issue #785).
  // Without this, Istanbul only counts files imported by some test, which
  // inflates the headline number over a small slice of the codebase.
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.{test,spec,jest}.{ts,tsx}',
    '!src/**/__mocks__/**',
    '!src/**/*.d.ts',
    // Pure static data (autocomplete metadata): thousands of LOC, ~5 statements, no logic.
    '!src/views/QueryEditor/components/QueryTextEditor/editor/autocompletions/functions.ts',
    '!src/views/QueryEditor/components/QueryTextEditor/editor/constants/funcs.ts',
  ],

  // Ratchet: floor measured 2026-07-14 on master (stmts 32.76 / branch 31.44 / func 21.75 / lines 32.33).
  // Raise these as coverage grows; never lower without a written justification.
  coverageThreshold: {
    global: {
      statements: 32,
      branches: 31,
      functions: 21,
      lines: 32,
    },
  },
};
