const StudentModel = require('../models/Student');
const FeeModel = require('../models/Fee');
const ExamModel = require('../models/Exam');
const ExamResultModel = require('../models/ExamResult');
const { docClient, TABLES } = require('../config/dynamodb');
const { successResponse, errorResponse } = require('../utils/helpers');
const { calculatePendingFeesForStudent } = require('../utils/feeCalculations');

// Get student dashboard data
exports.getDashboard = async (req, res) => {
    try {
        const { userId } = req.user;

        // Get user to find student ID
        const userResult = await docClient.get({
            TableName: TABLES.USERS,
            Key: { userId }
        }).promise();

        const rollNumber = userResult.Item.rollNumber;

        // Get student details
        const student = await StudentModel.findByRollNumber(rollNumber);

        if (!student) {
            return res.status(404).json(errorResponse('Student not found'));
        }

        // Get paid fees
        const allFees = await FeeModel.getByStudentId(student.studentId);
        const paidFees = allFees.filter(f => f.paymentStatus === 'PAID');
        const totalPaid = paidFees.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);

        // Calculate pending fees using the utility function
        const pendingData = await calculatePendingFeesForStudent(student);
        const totalPending = pendingData.totalPending;
        const pendingBreakdown = pendingData.breakdown;

        // Get exam results
        const examResults = await ExamResultModel.getByStudentId(student.studentId);

        // Get upcoming exams
        const upcomingExams = await ExamModel.getUpcoming(student.class);

        // Get holidays
        const today = new Date().toISOString().split('T')[0];
        const holidaysResult = await docClient.scan({
            TableName: TABLES.HOLIDAYS,
            FilterExpression: 'holidayDate >= :today',
            ExpressionAttributeValues: { ':today': today }
        }).promise();

        const dashboardData = {
            student,
            fees: {
                paid: paidFees,
                totalPending: totalPending,
                totalPaid: totalPaid,
                pendingBreakdown: pendingBreakdown
            },
            exams: {
                results: examResults,
                upcoming: upcomingExams
            },
            holidays: holidaysResult.Items
        };

        res.status(200).json(successResponse(dashboardData, 'Dashboard data retrieved successfully'));
    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json(errorResponse('Failed to retrieve dashboard data', error));
    }
};

// Get student fees
exports.getFees = async (req, res) => {
    try {
        const { userId } = req.user;

        const userResult = await docClient.get({
            TableName: TABLES.USERS,
            Key: { userId }
        }).promise();

        const rollNumber = userResult.Item.rollNumber;
        const student = await StudentModel.findByRollNumber(rollNumber);

        const fees = await FeeModel.getByStudentId(student.studentId);

        res.status(200).json(successResponse(fees, 'Fees retrieved successfully'));
    } catch (error) {
        console.error('Get fees error:', error);
        res.status(500).json(errorResponse('Failed to retrieve fees', error));
    }
};

// Get student exam results
exports.getExamResults = async (req, res) => {
    try {
        const { userId } = req.user;

        const userResult = await docClient.get({
            TableName: TABLES.USERS,
            Key: { userId }
        }).promise();

        const rollNumber = userResult.Item.rollNumber;
        const student = await StudentModel.findByRollNumber(rollNumber);

        const results = await ExamResultModel.getByStudentId(student.studentId);

        res.status(200).json(successResponse(results, 'Exam results retrieved successfully'));
    } catch (error) {
        console.error('Get exam results error:', error);
        res.status(500).json(errorResponse('Failed to retrieve exam results', error));
    }
};

// Get upcoming exams
exports.getUpcomingExams = async (req, res) => {
    try {
        const { userId } = req.user;

        const userResult = await docClient.get({
            TableName: TABLES.USERS,
            Key: { userId }
        }).promise();

        const rollNumber = userResult.Item.rollNumber;
        const student = await StudentModel.findByRollNumber(rollNumber);

        const upcomingExams = await ExamModel.getUpcoming(student.class);

        res.status(200).json(successResponse(upcomingExams, 'Upcoming exams retrieved successfully'));
    } catch (error) {
        console.error('Get upcoming exams error:', error);
        res.status(500).json(errorResponse('Failed to retrieve upcoming exams', error));
    }
};

// Get holidays
exports.getHolidays = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const result = await docClient.scan({
            TableName: TABLES.HOLIDAYS,
            FilterExpression: 'holidayDate >= :today',
            ExpressionAttributeValues: { ':today': today }
        }).promise();

        res.status(200).json(successResponse(result.Items, 'Holidays retrieved successfully'));
    } catch (error) {
        console.error('Get holidays error:', error);
        res.status(500).json(errorResponse('Failed to retrieve holidays', error));
    }
};
