import User from '../models/User.js';

// @desc    Admin middleware - check if user is admin
// @access  Private
const admin = async (req, res, next) => {
    try {
        // Check if user exists and is admin
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in admin middleware'
        });
    }
};

export default admin; 