import express from 'express';
import { protect } from '../middleware/auth.js';
import { upload, getAll, getById, deleteFile } from '../controllers/excelController.js';
const router = express.Router();

// All routes are protected
router.post('/upload', protect, upload);
router.get('/', protect, getAll);
router.get('/:id', protect, getById);
router.delete('/:id', protect, deleteFile);

export default router; 