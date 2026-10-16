import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import * as statsController from './stats.controller.js';

export const statsRouter = Router();

statsRouter.use(requireAuth);

statsRouter.get('/summary', statsController.getSummary);
