import tsParser from '@typescript-eslint/parser';

// TypeScript handles names and types; lint catches unsafe control flow and
// accidental debugging in application code without rewriting legacy style.
export default [{
  ignores: ['**/node_modules/**', '**/dist/**', '**/.expo/**'],
}, {
  files: ['apps/**/src/**/*.{ts,tsx}', 'apps/mobile/App.tsx', 'packages/**/src/**/*.ts'],
  languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
  rules: {
    'no-debugger': 'error',
    'no-duplicate-case': 'error',
    'no-constant-binary-expression': 'error',
    'no-unreachable': 'error',
    'no-unsafe-finally': 'error',
    'no-sparse-arrays': 'error',
    'no-async-promise-executor': 'error',
  },
}];
