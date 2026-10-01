import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import * as profileController from './profile.controller.js';

/** GET /api/v1/me — identidad + perfil del usuario autenticado. */
export const meRouter = Router();

meRouter.get('/', requireAuth, profileController.getMe);

/**
 * GET/PATCH /api/v1/profile llegan en la fase 9. El router se crea aqui mismo
 * cuando toque, reutilizando el service y el repository de este modulo.
 */
