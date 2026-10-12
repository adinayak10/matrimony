// ESLint 9 flat config. Lint only the Node code; templates, browser bundles,
// the Flutter tree, the docs and the URL-contract fixtures are out of scope.
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      'apps/*/public/**',
      'apps/mobile/**',
      'docs/**',
      'deploy/url-contract*',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
    },
  },
];
