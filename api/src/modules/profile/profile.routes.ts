import { Router } from 'express';
import { updateProfileSchema } from '@wheel-vault/shared';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { writeRateLimit } from '../../middleware/rateLimit.js';
import * as profileController from './profile.controller.js';

/** GET /api/v1/me — identidad + perfil del usuario autenticado. */
export const meRouter = Router();

meRouter.get('/', requireAuth, profileController.getMe);

/** GET/PATCH /api/v1/profile — solo el perfil. */
export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get('/', profileController.getProfile);

profileRouter.patch(
  '/',
  writeRateLimit,
  validate({ body: updateProfileSchema }),
  profileController.updateProfile,
);
