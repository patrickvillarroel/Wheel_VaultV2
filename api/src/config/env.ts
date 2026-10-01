/**
 * Validacion de variables de entorno al arrancar.
 *
 * Si falta un secreto o esta mal formado, el proceso muere de inmediato con un
 * mensaje claro en vez de fallar mas tarde con un error opaco en produccion.
 * Los valores nunca se imprimen en los logs.
 */
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),

  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map(
    (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
  );
  console.error(
    [
      'Variables de entorno invalidas o ausentes:',
      ...missing,
      '',
      'Copia api/.env.example a api/.env y completa los valores.',
      'Guia paso a paso: docs/supabase-setup.md',
    ].join('\n'),
  );
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
