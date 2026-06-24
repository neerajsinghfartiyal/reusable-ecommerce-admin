import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Standard mount/filter data-fetch pattern; refactor deferred to a later phase.
      'react-hooks/set-state-in-effect': 'off',
      // Load helpers are intentionally omitted to avoid ref-churn loops; deps list query state.
      'react-hooks/exhaustive-deps': 'off',
    },
  },
])
