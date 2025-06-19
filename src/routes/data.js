import express from 'express';
import dataController from '../controllers/dataController.js';
import { protect } from '../middleware/auth.js';
import upload, { handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// Protected routes
router.use(protect);

// Upload Excel file with error handling
router.post('/upload', upload.single('file'), handleUploadError, dataController.uploadExcel);

// Fetch uploaded data
router.get('/file/:fileId', dataController.getFileData);

// Generate chart
router.post('/generate-chart', dataController.generateChart);

// Fetch chart
router.get('/chart/:chartId', dataController.getChart);

// Analysis history
router.get('/history', dataController.getHistory);

// Test route for debugging
router.get('/test-insights/:fileId', (req, res) => {
    console.log('Test insights route hit:', req.params);
    res.json({ success: true, message: 'Test route working', fileId: req.params.fileId });
});

// AI Insights
router.get('/insights/:fileId', (req, res, next) => {
    console.log('Insights route hit:', { fileId: req.params.fileId, userId: req.user?.id });
    next();
}, dataController.getInsights);

// Download report
router.get('/download/:reportId', dataController.downloadReport);

// Delete file
router.delete('/file/:fileId', dataController.deleteFile);

// Catch-all route for debugging
router.get('*', (req, res) => {
    console.log('Catch-all route hit:', req.url);
    res.status(404).json({ success: false, message: `Route ${req.url} not found in data routes` });
});

export default router; 