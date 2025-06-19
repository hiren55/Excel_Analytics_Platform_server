import express from 'express';
import { protect } from '../middleware/auth.js';
import { getUserHistory } from '../controllers/historyController.js';
const router = express.Router();

// All routes are protected
router.use(protect);

// History routes
router.get('/', getUserHistory);

export default router; 