import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
  {
    ignores: ['dist/**', 'node_modules/**']
  },
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  prettier,
  {
    name: 'app/base',
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // Injected at build time via vite.config.ts `define` (admin UI's own version)
        __APP_VERSION__: 'readonly'
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      // vue-eslint-parser reads `parserOptions.parser` for <script lang="ts"> blocks.
      parserOptions: {
        parser: typescriptParser
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    name: 'app/typescript',
    files: ['**/*.ts', '**/*.mts', '**/*.cts'],
    languageOptions: {
      parser: typescriptParser,
      globals: {
        ...globals.browser,
        ...globals.node,
        __APP_VERSION__: 'readonly'
      },
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    plugins: {
      '@typescript-eslint': typescriptEslint
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      // TypeScript's own lib types (RTCIceServer, etc.) aren't visible to this
      // rule, and vue-tsc catches real undeclared variables at compile time.
      'no-undef': 'off'
    }
  }
]
