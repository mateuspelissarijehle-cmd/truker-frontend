import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // 'android' é o projeto Capacitor gerado (build de terceiros + cópia do
  // bundle já minificado) -- não é código-fonte que a gente edita à mão, e
  // lintar o bundle minificado só gera ruído (no-cond-assign, no-fallthrough
  // etc. típicos de código gerado).
  globalIgnores(['dist', 'android']),
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['public/sw.js'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Service worker roda num escopo global próprio (self/clients/caches),
    // não no escopo de browser normal (window/document).
    files: ['public/sw.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
])
