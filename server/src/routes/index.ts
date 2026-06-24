import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import postRoutes from './post.routes';
import commentRoutes from './comment.routes';
import messageRoutes from './message.routes';
import notificationRoutes from './notification.routes';
import searchRoutes from './search.routes';
import adminRoutes from './admin.routes';
import reportRoutes from './report.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);
router.use('/search', searchRoutes);
router.use('/admin', adminRoutes);
router.use('/reports', reportRoutes);

router.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

export default router;
