const StudentModel = require('../models/Student');
const ExamModel = require('../models/Exam');
const ExamResultModel = require('../models/ExamResult');
const { docClient, TABLES } = require('../config/dynamodb');
const { successResponse, errorResponse } = require('../utils/helpers');

// Get all students (excluding fees information)
exports.getAllStudents = async (req, res) => {
    try {
        const students = await StudentModel.getAll();

        // Remove sensitive information if needed
        const studentsWithoutSensitiveData = students.map(({ ...student }) => student);

        res.status(200).json(successResponse(studentsWithoutSensitiveData, 'Students retrieved successfully'));
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json(errorResponse('Failed to retrieve students', error));
    }
};

// Get students by class
exports.getStudentsByClass = async (req, res) => {
    try {
        const { className } = req.params;
        const students = await StudentModel.getByClass(className);

        res.status(200).json(successResponse(students, 'Students retrieved successfully'));
    } catch (error) {
        console.error('Get students by class error:', error);
        res.status(500).json(errorResponse('Failed to retrieve students', error));
    }
};

// Create exam
exports.createExam = async (req, res) => {
    try {
        const { examName, examType, class: className, subject, examDate, totalMarks, passingMarks, subjects } = req.body;

        if (!examName || !className || !examDate) {
            return res.status(400).json(errorResponse('Missing required fields'));
        }

        const exam = await ExamModel.create({
            examName,
            examType: examType || 'MONTHLY',
            class: className,
            subject: subject || '',
            examDate,
            totalMarks: totalMarks || 0,
            passingMarks: passingMarks || 0,
            subjects: subjects || [],
            createdBy: req.user.userId
        });

        res.status(201).json(successResponse(exam, 'Exam created successfully'));
    } catch (error) {
        console.error('Create exam error:', error);
        res.status(500).json(errorResponse('Failed to create exam', error));
    }
};

// Get all exams (with optional class filter)
exports.getAllExams = async (req, res) => {
    try {
        const { class: className } = req.query;

        let exams;
        if (className) {
            exams = await ExamModel.getByClass(className);
        } else {
            exams = await ExamModel.getAll();
        }

        res.status(200).json(successResponse(exams, 'Exams retrieved successfully'));
    } catch (error) {
        console.error('Get exams error:', error);
        res.status(500).json(errorResponse('Failed to retrieve exams', error));
    }
};

// Upload exam marks for a student (with subjects)
exports.uploadMarks = async (req, res) => {
    try {
        const { examId, studentId, subjects } = req.body;

        if (!examId || !studentId || !subjects || !Array.isArray(subjects)) {
            return res.status(400).json(errorResponse('Missing required fields'));
        }

        // Get exam details
        const exam = await ExamModel.findById(examId);
        if (!exam) {
            return res.status(404).json(errorResponse('Exam not found'));
        }

        // Calculate total marks
        const totalMarksObtained = subjects.reduce((sum, s) => sum + parseFloat(s.marksObtained || 0), 0);
        const totalMaxMarks = subjects.reduce((sum, s) => sum + parseFloat(s.maxMarks || 0), 0);

        // Check if result already exists
        const existingResult = await ExamResultModel.getByStudentAndExam(studentId, examId);

        const resultData = {
            marksObtained: totalMarksObtained,
            totalMarks: totalMaxMarks,
            subjects: subjects,
            uploadedBy: req.user.userId
        };

        if (existingResult) {
            // Update existing result
            const result = await ExamResultModel.update(existingResult.resultId, resultData);
            return res.status(200).json(successResponse(result, 'Marks updated successfully'));
        }

        // Create new result
        const result = await ExamResultModel.create({
            examId,
            studentId,
            ...resultData
        });

        res.status(201).json(successResponse(result, 'Marks uploaded successfully'));
    } catch (error) {
        console.error('Upload marks error:', error);
        res.status(500).json(errorResponse('Failed to upload marks', error));
    }
};

// Get exam results for a specific exam
exports.getExamResults = async (req, res) => {
    try {
        const { examId } = req.params;

        const results = await ExamResultModel.getByExamId(examId);

        res.status(200).json(successResponse(results, 'Exam results retrieved successfully'));
    } catch (error) {
        console.error('Get exam results error:', error);
        res.status(500).json(errorResponse('Failed to retrieve exam results', error));
    }
};

// Get marks for a specific student
exports.getStudentMarks = async (req, res) => {
    try {
        const { studentId } = req.params;

        const results = await ExamResultModel.getByStudentId(studentId);

        res.status(200).json(successResponse(results, 'Student marks retrieved successfully'));
    } catch (error) {
        console.error('Get student marks error:', error);
        res.status(500).json(errorResponse('Failed to retrieve student marks', error));
    }
};

// Bulk upload marks for multiple students
exports.bulkUploadMarks = async (req, res) => {
    try {
        const { examId, results } = req.body;

        if (!examId || !Array.isArray(results) || results.length === 0) {
            return res.status(400).json(errorResponse('Invalid request data'));
        }

        const exam = await ExamModel.findById(examId);
        if (!exam) {
            return res.status(404).json(errorResponse('Exam not found'));
        }

        const uploadedResults = [];
        const errors = [];

        for (const resultData of results) {
            try {
                const { studentId, rollNumber, marksObtained, remarks } = resultData;

                const result = await ExamResultModel.create({
                    examId,
                    studentId,
                    rollNumber,
                    marksObtained,
                    totalMarks: exam.totalMarks,
                    remarks: remarks || '',
                    uploadedBy: req.user.userId
                });

                uploadedResults.push(result);
            } catch (error) {
                errors.push({
                    studentId: resultData.studentId,
                    error: error.message
                });
            }
        }

        res.status(200).json(successResponse(
            {
                uploaded: uploadedResults,
                errors
            },
            `${uploadedResults.length} results uploaded successfully, ${errors.length} errors`
        ));
    } catch (error) {
        console.error('Bulk upload marks error:', error);
        res.status(500).json(errorResponse('Failed to bulk upload marks', error));
    }
};

// Get teacher's assigned classes
exports.getAssignedClasses = async (req, res) => {
    try {
        const { userId } = req.user;

        const userResult = await docClient.get({
            TableName: TABLES.USERS,
            Key: { userId }
        }).promise();

        const teacherId = userResult.Item.teacherId;

        // Get teacher details to find assigned classes
        const teacherResult = await docClient.scan({
            TableName: TABLES.TEACHERS,
            FilterExpression: 'employeeId = :employeeId',
            ExpressionAttributeValues: { ':employeeId': teacherId }
        }).promise();

        const teacher = teacherResult.Items[0];

        res.status(200).json(successResponse(
            teacher?.assignedClasses || [],
            'Assigned classes retrieved successfully'
        ));
    } catch (error) {
        console.error('Get assigned classes error:', error);
        res.status(500).json(errorResponse('Failed to retrieve assigned classes', error));
    }
};
