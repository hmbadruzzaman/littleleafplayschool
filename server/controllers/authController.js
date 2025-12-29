const UserModel = require('../models/User');
const { generateToken, comparePassword, successResponse, errorResponse } = require('../utils/helpers');

// Login controller
exports.login = async (req, res) => {
    try {
        const { userType, identifier, password } = req.body;

        // Validate input
        if (!userType || !identifier || !password) {
            return res.status(400).json(
                errorResponse('User type, identifier, and password are required')
            );
        }

        let user;

        // Find user based on type
        if (userType === 'STUDENT') {
            user = await UserModel.findByRollNumber(identifier);
        } else if (userType === 'TEACHER') {
            user = await UserModel.findByTeacherId(identifier);
        } else if (userType === 'ADMIN') {
            user = await UserModel.findByAdminId(identifier);
        } else {
            return res.status(400).json(
                errorResponse('Invalid user type')
            );
        }

        // Check if user exists
        if (!user) {
            return res.status(401).json(
                errorResponse('Invalid credentials')
            );
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json(
                errorResponse('Invalid credentials')
            );
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json(
                errorResponse('Account is inactive. Please contact administrator.')
            );
        }

        // Generate JWT token
        const token = generateToken({
            userId: user.userId,
            userType: user.userType,
            identifier: userType === 'STUDENT' ? user.rollNumber :
                        userType === 'TEACHER' ? user.teacherId :
                        user.adminId
        });

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        res.status(200).json(
            successResponse(
                {
                    token,
                    user: userWithoutPassword
                },
                'Login successful'
            )
        );
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json(
            errorResponse('Login failed', error)
        );
    }
};

// Get current user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.userId);

        if (!user) {
            return res.status(404).json(
                errorResponse('User not found')
            );
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        res.status(200).json(
            successResponse(userWithoutPassword, 'Profile retrieved successfully')
        );
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json(
            errorResponse('Failed to retrieve profile', error)
        );
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json(
                errorResponse('Current password and new password are required')
            );
        }

        if (newPassword.length < 6) {
            return res.status(400).json(
                errorResponse('New password must be at least 6 characters long')
            );
        }

        const user = await UserModel.findById(req.user.userId);

        // Verify current password
        const isPasswordValid = await comparePassword(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json(
                errorResponse('Current password is incorrect')
            );
        }

        // Hash and update new password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await UserModel.update(req.user.userId, { password: hashedPassword });

        res.status(200).json(
            successResponse(null, 'Password changed successfully')
        );
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json(
            errorResponse('Failed to change password', error)
        );
    }
};
