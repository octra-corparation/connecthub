import { Router } from 'express';
import * as postController from '../controllers/post.controller';
import * as commentController from '../controllers/comment.controller';
import * as engagementController from '../controllers/engagement.controller';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { uploadImage } from '../middleware/upload';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();

router.get('/feed', requireAuth, postController.getFeed);
router.get('/explore', optionalAuth, postController.getExplore);
router.get('/bookmarks', requireAuth, engagementController.getBookmarks);
router.get('/user/:username', optionalAuth, postController.getUserPosts);
router.get('/:postId', optionalAuth, postController.getPostById);

router.post(
  '/',
  requireAuth,
  uploadImage.array('images', 4),
  [body('content').optional().isLength({ max: 2000 })],
  validate,
  postController.createPost
);
router.put(
  '/:postId',
  requireAuth,
  [body('content').isLength({ min: 1, max: 2000 })],
  validate,
  postController.updatePost
);
router.delete('/:postId', requireAuth, postController.deletePost);

router.post('/:postId/like', requireAuth, engagementController.likePost);
router.delete('/:postId/like', requireAuth, engagementController.unlikePost);
router.post('/:postId/repost', requireAuth, engagementController.repostPost);
router.delete('/:postId/repost', requireAuth, engagementController.undoRepost);
router.post('/:postId/bookmark', requireAuth, engagementController.bookmarkPost);
router.delete('/:postId/bookmark', requireAuth, engagementController.removeBookmark);

router.get('/:postId/comments', commentController.getComments);
router.post(
  '/:postId/comments',
  requireAuth,
  [body('content').isLength({ min: 1, max: 1000 })],
  validate,
  commentController.createComment
);

export default router;
