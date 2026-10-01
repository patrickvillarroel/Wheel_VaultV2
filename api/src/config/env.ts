/**
 * Validación de variables de entorno al arrancar.
 *
 * Si falta un secreto o esta mal formado, el proceso muere de inmediato con un
 * mensaje claro en vez de fallar más tarde con un error opaco en producción.
 * Los valores nunca se imprimen en los logs.
 */
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),

  /**
   * Opcional a proposito: la API NO lo necesita. Express consulta Supabase con
   * la anon key y el JWT del usuario, para que la RLS siga aplicando (ADR-002).
   * Solo lo usan los scripts administrativos. Cuanto menos exista este secreto
   * en el entorno del servidor, menos sitios desde donde se puede filtrar.
   */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  /**
   * Opcional: solo hace falta si el proyecto de Supabase todavia firma los
   * tokens con el secreto compartido heredado (HS256). Los proyectos nuevos
   * usan claves asimetricas y se verifican contra el JWKS público, sin secreto.
   * Ver api/src/config/jwt.ts.
   */
  SUPABASE_JWT_SECRET: z.string().min(1).optional(),

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

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
