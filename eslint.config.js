const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: [
      'instrumented/*',
      'dist/',
      '.cache/',
      '.go-cache/',
      'node_modules/',
      'coverage/',
      // виртуальные окружения testflows (см. tests/testflows/README.md)
      'venv/',
      '.venv/',
      '*.d.ts'
    ]
  },
  ...compat.extends('@grafana/eslint-config'),
  {
    rules: {
      'react/prop-types': 'off',
      'object-curly-newline': ['error', {
        'ObjectPattern': { 'multiline': true, 'minProperties': 10 }
      }]
    }
  }
];
