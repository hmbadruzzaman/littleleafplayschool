const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
};

// Hash password
const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// Generate roll number for students
const generateRollNumber = (year = new Date().getFullYear()) => {
    const timestamp = Date.now().toString().slice(-6);
    return `STU${year}${timestamp}`;
};

// Generate employee ID for teachers
const generateTeacherId = (count) => {
    const paddedCount = String(count + 1).padStart(3, '0');
    return `TCH${paddedCount}`;
};

// Calculate grade based on percentage
const calculateGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
};

// Format date to YYYY-MM-DD
const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Check if fee is overdue
const isFeeOverdue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    return today > due;
};

// Success response
const successResponse = (data, message = 'Success') => {
    return {
        success: true,
        message,
        data
    };
};

// Error response
const errorResponse = (message = 'Error occurred', error = null) => {
    const response = {
        success: false,
        message
    };
    if (error && process.env.NODE_ENV === 'development') {
        response.error = error.message;
    }
    return response;
};

module.exports = {
    generateToken,
    hashPassword,
    comparePassword,
    generateRollNumber,
    generateTeacherId,
    calculateGrade,
    formatDate,
    isFeeOverdue,
    successResponse,
    errorResponse
};
