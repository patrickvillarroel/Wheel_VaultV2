import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    /**
     * Entorno falso para los tests. Son valores inventados: estas pruebas no
     * tocan Supabase, verifican los middlewares y la verificacion de tokens.
     *
     * dotenv no sobrescribe variables ya presentes en process.env, asi que un
     * api/.env real no interfiere con estos valores.
     */
    env: {
      NODE_ENV: 'test',
      SUPABASE_URL: 'https://test-project.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      // Valor inventado solo para firmar tokens en los tests. check-secrets:permitido
      SUPABASE_JWT_SECRET: 'secreto-de-pruebas-con-longitud-suficiente-para-hs256',
      CORS_ORIGINS: 'http://localhost:8081',
    },
  },
});
