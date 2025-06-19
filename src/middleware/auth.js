import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const protect = async (req, res, next) => {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized, no token'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, user not found'
            });
        }

        // Add user to request object
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Not authorized, token failed'
        });
    }
};

// Middleware to check user roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Not authorized',
                error: 'User not authenticated'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Not authorized',
                error: 'User role is not authorized to access this resource'
            });
        }

        next();
    };
};

export { protect, authorize }; 