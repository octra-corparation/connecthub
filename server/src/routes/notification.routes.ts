import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, notificationController.getNotifications);
router.get('/unread-count', requireAuth, notificationController.getUnreadCount);
router.put('/:notificationId/read', requireAuth, notificationController.markAsRead);
router.put('/read-all', requireAuth, notificationController.markAllAsRead);

export default router;
