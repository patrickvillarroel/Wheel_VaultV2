/**
 * Lint de la app móvil.
 *
 * No se usa `eslint-config-expo` porque arrastra `eslint-plugin-react`, que
 * todavía no soporta ESLint 10 (usa `context.getFilename`, eliminado en esa
 * versión) y revienta al cargar. Antes que mantener dos versiones de ESLint en
 * el monorepo, aquí se arma la configuración con lo que de verdad aporta:
 *
 *   - typescript-eslint        errores de tipos y variables sin usar
 *   - eslint-plugin-react-hooks  rules-of-hooks y exhaustive-deps, que son las
 *                                reglas que atrapan bugs reales en React
 *
 * Lo que se pierde de la config de Expo es `react/prop-types` (irrelevante en
 * TypeScript) y `react/display-name` (cosmético). Cuando el plugin de React
 * soporte ESLint 10, se puede volver a `eslint-config-expo`.
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'expo-env.d.ts', '*.config.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  {
    languageOptions: {
      globals: {
        console: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        process: 'readonly',
        __DEV__: 'readonly',
        require: 'readonly',
        module: 'writable',
        __dirname: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  prettier,
);
