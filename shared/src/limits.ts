/**
 * Limites de validación compartidos entre el backend (Zod en Express) y la app
 * movil (Zod + React Hook Form). Una sola fuente de verdad: si cambia un limite
 * aquí, cambia en los dos lados y en la migración SQL correspondiente.
 *
 * Los CHECK constraints de PostgreSQL son deliberadamente iguales o más
 * permisivos que estos valores (ver docs/database.md).
 */

export const CAR_LIMITS = {
  model: { min: 1, max: 100 },
  vehicleMake: { max: 60 },
  description: { max: 1000 },
  quantity: { min: 1, max: 9999 },
  /** La BD acepta hasta 2100 (un CHECK debe ser inmutable); aquí acotamos al año real. */
  year: { min: 1900, maxOffsetFromNow: 2 },
} as const;

export const BRAND_LIMITS = {
  name: { min: 1, max: 60 },
  description: { max: 1000 },
} as const;

export const PROFILE_LIMITS = {
  displayName: { min: 2, max: 50 },
  bio: { max: 500 },
} as const;

export const PASSWORD_LIMITS = {
  /** Mínimo de Supabase Auth; se configura igual en el dashboard. */
  min: 8,
  max: 72,
} as const;

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 50,
} as const;

export const IMAGE_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
} as const;

/** Año máximo aceptable en el momento de la validación. */
export function maxCarYear(now: Date = new Date()): number {
  return now.getFullYear() + CAR_LIMITS.year.maxOffsetFromNow;
}
