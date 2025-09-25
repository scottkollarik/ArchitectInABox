module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  plugins: [
    'react',
    'react-hooks',
    'react-refresh',
    '@typescript-eslint',
    'tailwindcss',
  ],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:tailwindcss/recommended',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'react-refresh/only-export-components': 'off',
    'tailwindcss/classnames-order': 'off',
    'tailwindcss/enforces-shorthand': 'off',
    'tailwindcss/no-custom-classname': 'off',
    'tailwindcss/migration-from-tailwind-2': 'off',
    'tailwindcss/no-unnecessary-arbitrary-value': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-case-declarations': 'off',
  },
  ignorePatterns: ['dist', 'node_modules'],
}
