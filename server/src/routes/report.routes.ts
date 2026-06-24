import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { requireAuth } from '../middleware/auth';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();

// Any authenticated user can file a report; reviewing them is admin-only (see admin.routes.ts).
router.post(
  '/',
  requireAuth,
  [
    body('targetType').isIn(['POST', 'COMMENT', 'USER']),
    body('reason').isLength({ min: 1, max: 500 }),
  ],
  validate,
  adminController.createReport
);

export default router;
