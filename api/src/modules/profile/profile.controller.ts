import type { RequestHandler } from 'express';
import { updateProfileSchema } from '@wheel-vault/shared';
import { getDb, getUser } from '../../middleware/requireAuth.js';
import { validated } from '../../middleware/validate.js';
import { sendSuccess } from '../../shared/http/envelope.js';
import * as profileService from './profile.service.js';

/**
 * Traduce HTTP <-> dominio. No conoce Supabase ni reglas de negocio.
 *
 * Express 5 reenvia solo las promesas rechazadas al manejador de errores, así
 * que no hace falta try/catch ni un wrapper tipo asyncHandler.
 */

export const getMe: RequestHandler = async (req, res) => {
  const data = await profileService.getMe(getDb(req), getUser(req));
  sendSuccess(res, data);
};

export const getProfile: RequestHandler = async (req, res) => {
  const profile = await profileService.getProfile(getDb(req), getUser(req).id);
  sendSuccess(res, profile);
};

export const updateProfile: RequestHandler = async (req, res) => {
  const body = validated(req, 'body', updateProfileSchema);

  const profile = await profileService.updateProfile(getDb(req), getUser(req).id, body);

  sendSuccess(res, profile);
};
