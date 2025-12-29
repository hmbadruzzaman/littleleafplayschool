const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

// Verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.'
        });
    }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user.userType !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
};

// Check if user is teacher
const isTeacher = (req, res, next) => {
    if (req.user.userType !== 'TEACHER') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Teacher privileges required.'
        });
    }
    next();
};

// Check if user is student
const isStudent = (req, res, next) => {
    if (req.user.userType !== 'STUDENT') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Student privileges required.'
        });
    }
    next();
};

// Check if user is admin or teacher
const isAdminOrTeacher = (req, res, next) => {
    if (req.user.userType !== 'ADMIN' && req.user.userType !== 'TEACHER') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin or Teacher privileges required.'
        });
    }
    next();
};

module.exports = {
    verifyToken,
    isAdmin,
    isTeacher,
    isStudent,
    isAdminOrTeacher
};
