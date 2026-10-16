import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'mobile/**',
      'supabase/**',
      // Generado por `npm run db:types`: no se edita ni se reformatea a mano.
      'api/src/types/database.types.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // Scripts de mantenimiento: corren en Node y su salida ES la interfaz con
    // la persona que los ejecuta, asi que aqui console si tiene sentido.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
        TextEncoder: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    // ADR-002: el cliente admin (service_role) nunca puede usarse dentro de la
    // logica de negocio. Solo scripts administrativos fuera de src/modules.
    files: ['api/src/modules/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/supabaseAdmin*', '**/config/supabaseAdmin'],
              message:
                'Prohibido: el cliente service_role ignora RLS. Usa el cliente con el JWT del usuario (ADR-002).',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
