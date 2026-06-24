import { Router } from 'express';
import * as messageController from '../controllers/message.controller';
import { requireAuth } from '../middleware/auth';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();

router.get('/conversations', requireAuth, messageController.getConversations);
router.get('/conversations/with/:userId', requireAuth, messageController.getOrCreateDirectConversation);
router.get('/conversations/:conversationId/messages', requireAuth, messageController.getMessages);
router.post(
  '/conversations/:conversationId/messages',
  requireAuth,
  [body('content').isLength({ min: 1, max: 4000 })],
  validate,
  messageController.sendMessage
);
router.post('/conversations/:conversationId/read', requireAuth, messageController.markConversationRead);

export default router;
