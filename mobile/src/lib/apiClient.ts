import { ERROR_CODES, type ApiErrorDetail, type ErrorCode } from '@wheel-vault/shared';
import { env } from '../config/env';
import { supabase } from './supabase';

/**
 * Cliente de la API de Express.
 *
 * Se encarga de tres cosas que si no habria que repetir en cada pantalla:
 * adjuntar el token, reintentar una vez cuando caduca, y convertir el sobre de
 * error de la API en una excepción con un mensaje presentable.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | 'NETWORK_ERROR';
  readonly details: ApiErrorDetail[] | undefined;
  readonly requestId: string | undefined;

  constructor(params: {
    status: number;
    code: ErrorCode | 'NETWORK_ERROR';
    message: string;
    details?: ApiErrorDetail[];
    requestId?: string;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
    this.requestId = params.requestId;
  }

  /** La sesión ya no sirve: el gate de rutas debe llevar al login. */
  get isAuthError(): boolean {
    return this.status === 401;
  }
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface Envelope<T> {
  data: T;
  meta?: { next_cursor: string | null; has_more: boolean };
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Uso interno del reintento tras refrescar el token. */
  isRetry?: boolean;
}

/**
 * Único punto de salida a la red. Todo lo demas del cliente pasa por aquí, de
 * modo que el reintento por token caducado y el formato de error estan escritos
 * una sola vez.
 */
async function requestEnvelope<T>(path: string, options: RequestOptions): Promise<Envelope<T>> {
  // getSession() refresca por su cuenta si el token esta a punto de caducar.
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  let response: Response;

  try {
    response = await fetch(`${env.apiUrl}/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch {
    // fetch solo lanza cuando no hubo respuesta: sin red, servidor caido o URL
    // mal configurada. Es el error más comun en desarrollo con un movil fisico.
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con el servidor. Revisa tu conexión.',
    });
  }

  // 204 (DELETE) no trae cuerpo.
  if (response.status === 204) {
    return { data: undefined as T };
  }

  const payload: unknown = await response.json().catch(() => null);

  if (response.ok) {
    return payload as Envelope<T>;
  }

  const body = payload as {
    error?: { code?: ErrorCode; message?: string; details?: ApiErrorDetail[] };
    request_id?: string;
  } | null;

  const code = body?.error?.code ?? ERROR_CODES.INTERNAL_ERROR;

  // Un token caducado se reintenta UNA vez: si el refresco también falla, la
  // sesión esta muerta y insistir solo retrasaría el envio al login.
  if (response.status === 401 && code === ERROR_CODES.AUTH_TOKEN_EXPIRED && !options.isRetry) {
    const { error: refreshError } = await supabase.auth.refreshSession();

    if (!refreshError) {
      return requestEnvelope<T>(path, { ...options, isRetry: true });
    }

    // onAuthStateChange lo recoge y el gate de rutas lleva al login.
    await supabase.auth.signOut();
  }

  throw new ApiError({
    status: response.status,
    code,
    message: body?.error?.message ?? 'Ha ocurrido un error inesperado',
    ...(body?.error?.details ? { details: body.error.details } : {}),
    ...(body?.request_id ? { requestId: body.request_id } : {}),
  });
}

export const api = {
  get: async <T>(path: string): Promise<T> => (await requestEnvelope<T>(path, {})).data,

  post: async <T>(path: string, body: unknown): Promise<T> =>
    (await requestEnvelope<T>(path, { method: 'POST', body })).data,

  patch: async <T>(path: string, body: unknown): Promise<T> =>
    (await requestEnvelope<T>(path, { method: 'PATCH', body })).data,

  delete: async (path: string): Promise<void> => {
    await requestEnvelope<void>(path, { method: 'DELETE' });
  },

  /** Para los listados: devuelve los elementos junto a su cursor. */
  paginated: async <T>(path: string): Promise<Paginated<T>> => {
    const envelope = await requestEnvelope<T[]>(path, {});

    return {
      items: envelope.data,
      nextCursor: envelope.meta?.next_cursor ?? null,
      hasMore: envelope.meta?.has_more ?? false,
    };
  },
};
