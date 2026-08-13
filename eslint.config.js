import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['dist/', 'build/', 'node_modules/'],
  },

  {
    files: ['**/*.{ts,tsx}'],

    extends: [js.configs.recommended, ...tseslint.configs.recommended],

    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': 'warn',

      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-empty-object-type': 'off',

      // JS
      'no-console': [
        'warn',
        {
          allow: ['log', 'error', 'warn'],
        },
      ],
      eqeqeq: 'error',
    },
  },
);
