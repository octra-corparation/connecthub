import { Router } from 'express';
import * as searchController from '../controllers/search.controller';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, searchController.search);
router.get('/trending', searchController.trendingHashtags);
router.get('/hashtags/:tag', optionalAuth, searchController.getPostsByHashtag);

export default router;
