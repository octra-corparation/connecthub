import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { uploadImage } from '../middleware/upload';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();

router.get('/suggested', requireAuth, userController.suggestedUsers);
router.get('/:username', optionalAuth, userController.getUserByUsername);
router.get('/:username/followers', userController.getFollowers);
router.get('/:username/following', userController.getFollowing);

router.put(
  '/me/profile',
  requireAuth,
  [
    body('bio').optional().isLength({ max: 280 }),
    body('website').optional().isURL().withMessage('Must be a valid URL'),
    body('location').optional().isLength({ max: 100 }),
    body('username').optional().isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_]+$/),
  ],
  validate,
  userController.updateProfile
);
router.post('/me/avatar', requireAuth, uploadImage.single('image'), userController.uploadAvatar);
router.post('/me/cover', requireAuth, uploadImage.single('image'), userController.uploadCover);

router.post('/:userId/follow', requireAuth, userController.followUser);
router.delete('/:userId/follow', requireAuth, userController.unfollowUser);

export default router;
