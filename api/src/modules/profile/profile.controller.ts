import type { RequestHandler } from 'express';
import { getDb, getUser } from '../../middleware/requireAuth.js';
import { sendSuccess } from '../../shared/http/envelope.js';
import * as profileService from './profile.service.js';

/**
 * Traduce HTTP <-> dominio. No conoce Supabase ni reglas de negocio.
 *
 * Express 5 reenvia solo las promesas rechazadas al manejador de errores, asi
 * que no hace falta try/catch ni un wrapper tipo asyncHandler.
 */
export const getMe: RequestHandler = async (req, res) => {
  const data = await profileService.getMe(getDb(req), getUser(req));
  sendSuccess(res, data);
};
