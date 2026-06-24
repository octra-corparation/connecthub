import { Router } from 'express';
import * as commentController from '../controllers/comment.controller';
import * as engagementController from '../controllers/engagement.controller';
import { requireAuth } from '../middleware/auth';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();

router.get('/:commentId/replies', commentController.getReplies);
router.put(
  '/:commentId',
  requireAuth,
  [body('content').isLength({ min: 1, max: 1000 })],
  validate,
  commentController.updateComment
);
router.delete('/:commentId', requireAuth, commentController.deleteComment);
router.post('/:commentId/like', requireAuth, engagementController.likeComment);
router.delete('/:commentId/like', requireAuth, engagementController.unlikeComment);

export default router;
