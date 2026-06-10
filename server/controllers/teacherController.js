const StudentModel = require('../models/Student');
const ExamModel = require('../models/Exam');
const ExamResultModel = require('../models/ExamResult');
const { docClient, TABLES } = require('../config/dynamodb');
const { successResponse, errorResponse } = require('../utils/helpers');

// Bundle everything a printable mark sheet needs in one round-trip. Accepts
// one or more comma-separated exam IDs in the URL; returns the student and
// schoolInfo once and a sheets[] array — one { exam, result } pair per
// requested exam, preserving the requested order.
exports.getMarkSheetBundle = async (req, res) => {
    try {
        const { studentId, examIds } = req.params;

        const idList = (examIds || '').split(',').map(s => s.trim()).filter(Boolean);
        if (idList.length === 0) {
            return res.status(400).json(errorResponse('At least one examId is required'));
        }

        const student = await StudentModel.findById(studentId);
        if (!student) {
            return res.status(404).json(errorResponse('Student not found'));
        }

        let schoolInfo = {};
        try {
            const infoRes = await docClient.get({
                TableName: TABLES.SCHOOL_INFO,
                Key: { infoId: 'INFO#SCHOOL' }
            }).promise();
            schoolInfo = infoRes.Item || {};
        } catch (e) {
            // Treat missing/erroring school info as empty — the page falls back to defaults.
            console.warn('Could not load school info for mark sheet:', e?.message);
        }

        const sheets = [];
        for (const examId of idList) {
            const exam = await ExamModel.findById(examId);
            if (!exam) {
                return res.status(404).json(errorResponse(`Exam not found: ${examId}`));
            }
            const result = await ExamResultModel.getByStudentAndExam(studentId, examId);
            if (!result) {
                return res.status(404).json(errorResponse(`No marks found for exam: ${exam.examName || examId}`));
            }
            sheets.push({ exam, result });
        }

        // Drop the student's password if it's somehow there (defence in depth).
        const { password, ...safeStudent } = student;

        res.status(200).json(successResponse(
            { student: safeStudent, schoolInfo, sheets },
            'Mark sheet bundle retrieved'
        ));
    } catch (error) {
        console.error('Get mark sheet bundle error:', error);
        res.status(500).json(errorResponse('Failed to load mark sheet', error));
    }
};

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

// Upload exam marks for a student (with subjects, optionally with components).
// For each subject that carries components, the server recomputes the
// subject's marksObtained and maxMarks from the components — the client's
// totals are treated as a preview, not authoritative.
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

        // Normalize each subject: validate ranges, recompute totals from components when present.
        const normalizedSubjects = [];
        for (const s of subjects) {
            const hasComponents = Array.isArray(s.components) && s.components.length > 0;
            if (hasComponents) {
                let subjObtained = 0, subjMax = 0;
                const normComponents = [];
                for (const c of s.components) {
                    const obtained = parseFloat(c.marksObtained || 0);
                    const max      = parseFloat(c.maxMarks      || 0);
                    if (isNaN(obtained) || isNaN(max) || obtained < 0 || obtained > max) {
                        return res.status(400).json(errorResponse(
                            `Invalid marks for ${s.name} · ${c.name}: must be between 0 and ${max}.`
                        ));
                    }
                    subjObtained += obtained;
                    subjMax      += max;
                    normComponents.push({ name: c.name, marksObtained: obtained, maxMarks: max });
                }
                normalizedSubjects.push({
                    name: s.name,
                    marksObtained: subjObtained,
                    maxMarks: subjMax,
                    components: normComponents,
                });
            } else {
                const obtained = parseFloat(s.marksObtained || 0);
                const max      = parseFloat(s.maxMarks      || 0);
                if (isNaN(obtained) || isNaN(max) || obtained < 0 || obtained > max) {
                    return res.status(400).json(errorResponse(
                        `Invalid marks for ${s.name}: must be between 0 and ${max}.`
                    ));
                }
                normalizedSubjects.push({
                    name: s.name,
                    marksObtained: obtained,
                    maxMarks: max,
                });
            }
        }

        const totalMarksObtained = normalizedSubjects.reduce((sum, s) => sum + s.marksObtained, 0);
        const totalMaxMarks      = normalizedSubjects.reduce((sum, s) => sum + s.maxMarks,      0);

        // Check if result already exists
        const existingResult = await ExamResultModel.getByStudentAndExam(studentId, examId);

        const resultData = {
            marksObtained: totalMarksObtained,
            totalMarks: totalMaxMarks,
            subjects: normalizedSubjects,
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
