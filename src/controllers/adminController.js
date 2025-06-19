import User from '../models/User.js';
import ExcelFile from '../models/ExcelFile.js';
import Analysis from '../models/Analysis.js';
import { Parser } from 'json2csv';

// @desc    Get all users (admin only)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');

        // Get additional data for each user
        const usersWithStats = await Promise.all(users.map(async (user) => {
            const filesCount = await ExcelFile.countDocuments({ user: user._id });
            const analysesCount = await Analysis.countDocuments({ user: user._id });

            // Calculate storage used by this user
            const userFiles = await ExcelFile.find({ user: user._id });
            const storageUsed = userFiles.reduce((sum, file) => sum + (file.size || 0), 0);

            // Get last activity (most recent file upload or analysis)
            const lastFile = await ExcelFile.findOne({ user: user._id }).sort({ createdAt: -1 });
            const lastAnalysis = await Analysis.findOne({ user: user._id }).sort({ createdAt: -1 });

            let lastActive = user.updatedAt;
            if (lastFile && lastFile.createdAt > lastActive) lastActive = lastFile.createdAt;
            if (lastAnalysis && lastAnalysis.createdAt > lastActive) lastActive = lastAnalysis.createdAt;

            return {
                ...user.toObject(),
                filesUploaded: filesCount,
                analysesCount: analysesCount,
                storageUsed: `${(storageUsed / (1024 * 1024 * 1024)).toFixed(2)} GB`,
                lastActive: lastActive
            };
        }));

        res.json({
            success: true,
            data: usersWithStats
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get users',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching users'
        });
    }
};

// @desc    Get user by ID (admin only)
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user's files and analyses
        const files = await ExcelFile.find({ user: user._id }).sort({ createdAt: -1 });
        const analyses = await Analysis.find({ user: user._id }).sort({ createdAt: -1 });

        const userData = {
            ...user.toObject(),
            files: files,
            analyses: analyses,
            totalFiles: files.length,
            totalAnalyses: analyses.length,
            totalStorage: `${(files.reduce((sum, file) => sum + (file.size || 0), 0) / (1024 * 1024 * 1024)).toFixed(2)} GB`
        };

        res.json({
            success: true,
            data: userData
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching user'
        });
    }
};

// @desc    Update user (admin only)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
    try {
        const { name, email, role, status } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if email is being changed and if it's already in use
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already in use'
                });
            }
        }

        // Update user fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (role) user.role = role;
        if (status) user.status = status;

        await user.save();

        // Remove password from response
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt
        };

        res.json({
            success: true,
            message: 'User updated successfully',
            data: userResponse
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while updating user'
        });
    }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete user's files and analyses
        await ExcelFile.deleteMany({ user: user._id });
        await Analysis.deleteMany({ user: user._id });

        // Delete user
        await User.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while deleting user'
        });
    }
};

// @desc    Get platform statistics (admin only)
// @route   GET /api/admin/stats
// @access  Private/Admin
const getPlatformStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ status: 'active' });
        const totalFiles = await ExcelFile.countDocuments();
        const totalAnalyses = await Analysis.countDocuments();

        // Calculate total storage used
        const files = await ExcelFile.find({});
        const totalStorage = files.reduce((sum, file) => sum + (file.size || 0), 0);

        // Get recent activity (last 24 hours)
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const recentUsers = await User.find({ createdAt: { $gte: last24Hours } })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('-password');

        const recentFiles = await ExcelFile.find({ createdAt: { $gte: last24Hours } })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name email');

        const recentAnalyses = await Analysis.find({ createdAt: { $gte: last24Hours } })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name email');

        // Get activity in last 7 days
        const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: last7Days } });
        const newFilesThisWeek = await ExcelFile.countDocuments({ createdAt: { $gte: last7Days } });
        const newAnalysesThisWeek = await Analysis.countDocuments({ createdAt: { $gte: last7Days } });

        res.json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                totalFiles,
                totalAnalyses,
                totalStorage: `${(totalStorage / (1024 * 1024 * 1024)).toFixed(2)} GB`,
                recentUsers,
                recentFiles,
                recentAnalyses,
                weeklyStats: {
                    newUsers: newUsersThisWeek,
                    newFiles: newFilesThisWeek,
                    newAnalyses: newAnalysesThisWeek
                }
            }
        });
    } catch (error) {
        console.error('Get platform stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get platform statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching statistics'
        });
    }
};

// @desc    Get data usage analytics (admin only)
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getDataAnalytics = async (req, res) => {
    try {
        const { period = '7d' } = req.query;

        let dateFilter = {};
        const now = new Date();

        switch (period) {
            case '7d':
                dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
                break;
            case '30d':
                dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
                break;
            case '90d':
                dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
                break;
        }

        // Get file uploads over time
        const fileUploads = await ExcelFile.aggregate([
            { $match: { createdAt: dateFilter } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 },
                    totalSize: { $sum: "$size" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Get user registrations over time
        const userRegistrations = await User.aggregate([
            { $match: { createdAt: dateFilter } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Get analysis creation over time
        const analysisCreation = await Analysis.aggregate([
            { $match: { createdAt: dateFilter } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Get top active users
        const topUsers = await User.aggregate([
            {
                $lookup: {
                    from: 'excelfiles',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'files'
                }
            },
            {
                $lookup: {
                    from: 'analyses',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'analyses'
                }
            },
            {
                $addFields: {
                    totalFiles: { $size: '$files' },
                    totalAnalyses: { $size: '$analyses' },
                    totalActivity: { $add: [{ $size: '$files' }, { $size: '$analyses' }] }
                }
            },
            { $sort: { totalActivity: -1 } },
            { $limit: 10 },
            {
                $project: {
                    name: 1,
                    email: 1,
                    role: 1,
                    status: 1,
                    totalFiles: 1,
                    totalAnalyses: 1,
                    totalActivity: 1
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                fileUploads,
                userRegistrations,
                analysisCreation,
                topUsers
            }
        });
    } catch (error) {
        console.error('Get data analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get analytics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching analytics'
        });
    }
};

const exportAdminData = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        const format = req.query.format || 'csv';

        if (format === 'json') {
            res.setHeader('Content-Disposition', 'attachment; filename=users.json');
            res.json(users);
        } else {
            // Default: CSV
            const fields = ['_id', 'name', 'email', 'role', 'status', 'createdAt', 'updatedAt'];
            const parser = new Parser({ fields });
            const csv = parser.parse(users);
            res.header('Content-Type', 'text/csv');
            res.attachment('users.csv');
            res.send(csv);
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to export data' });
    }
};

export {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getPlatformStats,
    getDataAnalytics,
    exportAdminData
}; 