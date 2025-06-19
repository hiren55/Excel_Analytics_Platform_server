import express from 'express';
import { protect } from '../middleware/auth.js';
import { createAnalysis, getAllAnalyses, getAnalysisById, generateChart, generateInsights } from '../controllers/analysisController.js';
const router = express.Router();

// All routes are protected
router.use(protect);

// Analysis routes
router.get('/', getAllAnalyses);
router.post('/', createAnalysis);
router.get('/:id', getAnalysisById);

// Generation routes
router.post('/generate/chart', generateChart);
router.post('/generate/insights', generateInsights);

export default router; 