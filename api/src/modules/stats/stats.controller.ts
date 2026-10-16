import type { RequestHandler } from 'express';
import { getDb, getUser } from '../../middleware/requireAuth.js';
import { sendSuccess } from '../../shared/http/envelope.js';
import * as statsService from './stats.service.js';

export const getSummary: RequestHandler = async (req, res) => {
  const summary = await statsService.getSummary(getDb(req), getUser(req).id);

  sendSuccess(res, summary);
};
