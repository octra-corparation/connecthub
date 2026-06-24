import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'MODERATOR'));

router.get('/analytics', adminController.getAnalyticsOverview);
router.get('/users', adminController.listUsers);
router.put('/users/:userId/suspend', adminController.suspendUser);
router.put('/users/:userId/reinstate', adminController.reinstateUser);
router.put(
  '/users/:userId/role',
  requireRole('ADMIN'),
  [body('role').isIn(['USER', 'ADMIN', 'MODERATOR'])],
  validate,
  adminController.changeUserRole
);

router.get('/reports', adminController.listReports);
router.put('/reports/:reportId/resolve', adminController.resolveReport);

export default router;
