/**
 * Codigos de error de la API. El cliente movil mapea estos codigos a mensajes
 * en español; el backend nunca envia texto interno ni stack traces.
 * Ver docs/api.md.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  CAR_NOT_FOUND: 'CAR_NOT_FOUND',
  BRAND_NOT_FOUND: 'BRAND_NOT_FOUND',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  BRAND_NAME_TAKEN: 'BRAND_NAME_TAKEN',
  BRAND_HAS_CARS: 'BRAND_HAS_CARS',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
  request_id: string;
}

export interface ApiSuccessBody<T, M = undefined> {
  success: true;
  data: T;
  meta?: M;
}

export interface PaginationMeta {
  next_cursor: string | null;
  has_more: boolean;
}
