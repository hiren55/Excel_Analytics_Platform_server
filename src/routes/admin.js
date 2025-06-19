import express from 'express';
import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getPlatformStats,
    getDataAnalytics,
    exportAdminData
} from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import admin from '../middleware/admin.js';

const router = express.Router();

// All admin routes are protected and require admin privileges
router.use(protect);
router.use(admin);

// User management routes
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Analytics and statistics routes
router.get('/stats', getPlatformStats);
router.get('/analytics', getDataAnalytics);

router.get('/export', exportAdminData);

export default router; 