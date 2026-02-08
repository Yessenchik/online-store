const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      prettier: prettier,
    },
    rules: {
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-undef': 'error',
    },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jquery, // In case jquery is used
        Chart: 'readonly',
        api: 'readonly',
        authToken: 'readonly',
        formatPrice: 'readonly',
        showAlert: 'readonly',
        utils: 'readonly',
      },
    },
    rules: {
      'no-undef': 'warn', // Downgrade to warn for public JS since it uses many globals
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'logs/**', 'coverage/**'],
  },
];
