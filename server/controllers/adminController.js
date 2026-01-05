const UserModel = require('../models/User');
const StudentModel = require('../models/Student');
const TeacherModel = require('../models/Teacher');
const FeeModel = require('../models/Fee');
const ExamModel = require('../models/Exam');
const ExpenditureModel = require('../models/Expenditure');
const { docClient, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');
const { hashPassword, generateRollNumber, generateTeacherId, successResponse, errorResponse } = require('../utils/helpers');
const { calculatePendingFeesForStudent } = require('../utils/feeCalculations');

// Student Management
exports.createStudent = async (req, res) => {
    try {
        const { fullName, dateOfBirth, parentName, parentPhone, parentEmail, address, class: className, password, transportEnabled, transportStartMonth, admissionDate } = req.body;

        if (!fullName || !parentPhone || !className || !password) {
            return res.status(400).json(errorResponse('Missing required fields'));
        }

        const rollNumber = await generateRollNumber(className);
        const hashedPassword = await hashPassword(password);

        // Create user account
        const user = await UserModel.create({
            userType: 'STUDENT',
            rollNumber,
            password: hashedPassword,
            email: parentEmail || '',
            phone: parentPhone,
            fullName,
            isActive: true
        });

        // Create student profile with transport data
        const studentData = {
            rollNumber,
            fullName,
            dateOfBirth,
            parentName,
            parentPhone,
            parentEmail: parentEmail || '',
            address,
            class: className,
            admissionDate: admissionDate || new Date().toISOString().split('T')[0]
        };

        // Add transport fields if enabled
        if (transportEnabled) {
            studentData.transportEnabled = true;
            studentData.transportStartMonth = transportStartMonth;
        } else {
            studentData.transportEnabled = false;
        }

        // Add excludeAdmissionFee field
        studentData.excludeAdmissionFee = req.body.excludeAdmissionFee || false;

        // Store plain password for admin reference
        studentData.plainPassword = password;

        const student = await StudentModel.create(studentData);

        res.status(201).json(successResponse({ user, student, rollNumber }, `Student created successfully with roll number: ${rollNumber}`));
    } catch (error) {
        console.error('Create student error:', error);
        res.status(500).json(errorResponse('Failed to create student', error));
    }
};

exports.getAllStudents = async (req, res) => {
    try {
        const students = await StudentModel.getAll();
        res.status(200).json(successResponse(students, 'Students retrieved successfully'));
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json(errorResponse('Failed to retrieve students', error));
    }
};

exports.updateStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        const updates = req.body;

        // Handle password change if provided
        if (updates.password && updates.password.trim() !== '') {
            // Get student to find their roll number
            const student = await StudentModel.findById(studentId);
            if (!student) {
                return res.status(404).json(errorResponse('Student not found'));
            }

            // Update password in user account
            const hashedPassword = await hashPassword(updates.password);
            await UserModel.updateByRollNumber(student.rollNumber, { password: hashedPassword });

            // Store plain password in student record for admin reference
            updates.plainPassword = updates.password;

            // Remove password from student updates (hashed version is stored in User table)
            delete updates.password;
        }

        // Update student profile
        const student = await StudentModel.update(studentId, updates);
        res.status(200).json(successResponse(student, 'Student updated successfully'));
    } catch (error) {
        console.error('Update student error:', error);
        res.status(500).json(errorResponse('Failed to update student', error));
    }
};

exports.deleteStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        console.log('Delete student request for studentId:', studentId);

        // Get student details first
        const student = await StudentModel.findById(studentId);
        console.log('Student found:', student ? 'Yes' : 'No');
        if (!student) {
            return res.status(404).json(errorResponse('Student not found'));
        }

        // Delete all related data
        // 1. Delete all fee records
        console.log('Deleting fees...');
        const fees = await FeeModel.getByStudentId(studentId);
        console.log(`Found ${fees.length} fee records`);
        for (const fee of fees) {
            await docClient.delete({
                TableName: TABLES.FEES,
                Key: { feeId: fee.feeId }
            }).promise();
        }

        // 2. Delete all exam results
        console.log('Deleting exam results...');
        const ExamResultModel = require('../models/ExamResult');
        const examResults = await ExamResultModel.getByStudentId(studentId);
        console.log(`Found ${examResults.length} exam results`);
        for (const result of examResults) {
            await docClient.delete({
                TableName: TABLES.EXAM_RESULTS,
                Key: { resultId: result.resultId }
            }).promise();
        }

        // 3. Delete all attendance records (if attendance table exists)
        console.log('Deleting attendance records...');
        if (TABLES.ATTENDANCE) {
            const attendanceParams = {
                TableName: TABLES.ATTENDANCE,
                FilterExpression: 'studentId = :studentId',
                ExpressionAttributeValues: {
                    ':studentId': studentId
                }
            };
            const attendanceResult = await docClient.scan(attendanceParams).promise();
            console.log(`Found ${attendanceResult.Items.length} attendance records`);
            for (const attendance of attendanceResult.Items) {
                await docClient.delete({
                    TableName: TABLES.ATTENDANCE,
                    Key: { attendanceId: attendance.attendanceId }
                }).promise();
            }
        } else {
            console.log('Attendance table not defined, skipping...');
        }

        // 4. Delete user account
        console.log('Deleting user account...');
        await docClient.delete({
            TableName: TABLES.USERS,
            Key: { userId: `USER#${student.rollNumber}` }
        }).promise();

        // 5. Finally, delete the student record
        console.log('Deleting student record...');
        await docClient.delete({
            TableName: TABLES.STUDENTS,
            Key: { studentId: studentId }
        }).promise();

        res.status(200).json(successResponse(null, 'Student and all related data deleted successfully'));
    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json(errorResponse('Failed to delete student', error));
    }
};

// Teacher Management
exports.createTeacher = async (req, res) => {
    try {
        const { fullName, email, phone, qualification, assignedClasses, password } = req.body;

        if (!fullName || !email || !phone || !password) {
            return res.status(400).json(errorResponse('Missing required fields'));
        }

        const teacherCount = await TeacherModel.getCount();
        const employeeId = generateTeacherId(teacherCount);
        const hashedPassword = await hashPassword(password);

        // Create user account
        const user = await UserModel.create({
            userType: 'TEACHER',
            teacherId: employeeId,
            password: hashedPassword,
            email,
            phone,
            fullName,
            isActive: true
        });

        // Create teacher profile
        const teacher = await TeacherModel.create({
            employeeId,
            fullName,
            email,
            phone,
            qualification: qualification || '',
            joiningDate: new Date().toISOString().split('T')[0],
            assignedClasses: assignedClasses || []
        });

        res.status(201).json(successResponse({ user, teacher }, 'Teacher created successfully'));
    } catch (error) {
        console.error('Create teacher error:', error);
        res.status(500).json(errorResponse('Failed to create teacher', error));
    }
};

exports.getAllTeachers = async (req, res) => {
    try {
        const teachers = await TeacherModel.getAll();
        res.status(200).json(successResponse(teachers, 'Teachers retrieved successfully'));
    } catch (error) {
        console.error('Get teachers error:', error);
        res.status(500).json(errorResponse('Failed to retrieve teachers', error));
    }
};

exports.updateTeacher = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const updates = req.body;

        const teacher = await TeacherModel.update(teacherId, updates);
        res.status(200).json(successResponse(teacher, 'Teacher updated successfully'));
    } catch (error) {
        console.error('Update teacher error:', error);
        res.status(500).json(errorResponse('Failed to update teacher', error));
    }
};

// Fee Management
exports.createFee = async (req, res) => {
    try {
        const {
            studentId,
            rollNumber,
            feeType,
            amount,
            dueDate,
            month,
            academicYear,
            paymentStatus,
            paymentMethod,
            paymentDate,
            transactionId,
            remarks
        } = req.body;

        if (!studentId || !feeType || !amount || !dueDate) {
            return res.status(400).json(errorResponse('Missing required fields'));
        }

        const feeData = {
            studentId,
            rollNumber,
            feeType,
            amount,
            dueDate,
            paymentStatus: paymentStatus || 'PENDING',
            remarks: remarks || ''
        };

        // Add optional fields if provided
        if (month) feeData.month = month;
        if (academicYear) feeData.academicYear = academicYear;
        if (paymentMethod) feeData.paymentMethod = paymentMethod;
        if (paymentDate) feeData.paymentDate = paymentDate;
        if (transactionId) feeData.transactionId = transactionId;

        const fee = await FeeModel.create(feeData);

        res.status(201).json(successResponse(fee, 'Fee created successfully'));
    } catch (error) {
        console.error('Create fee error:', error);
        res.status(500).json(errorResponse('Failed to create fee', error));
    }
};

exports.recordPayment = async (req, res) => {
    try {
        const { feeId } = req.params;
        const { paymentMethod, transactionId } = req.body;

        const fee = await FeeModel.update(feeId, {
            paymentStatus: 'PAID',
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: paymentMethod || 'CASH',
            transactionId: transactionId || ''
        });

        res.status(200).json(successResponse(fee, 'Payment recorded successfully'));
    } catch (error) {
        console.error('Record payment error:', error);
        res.status(500).json(errorResponse('Failed to record payment', error));
    }
};

exports.getStudentFees = async (req, res) => {
    try {
        const { studentId } = req.params;
        const fees = await FeeModel.getByStudentId(studentId);
        res.status(200).json(successResponse(fees, 'Fees retrieved successfully'));
    } catch (error) {
        console.error('Get student fees error:', error);
        res.status(500).json(errorResponse('Failed to retrieve fees', error));
    }
};

// Fee Structure Management
exports.createFeeStructure = async (req, res) => {
    try {
        const { feeType, amount, frequency } = req.body;

        if (!feeType || !amount || !frequency) {
            return res.status(400).json(errorResponse('Fee type, amount, and frequency are required'));
        }

        const feeStructure = {
            feeStructureId: `FEE_STRUCTURE#${feeType}`,
            feeType,
            amount: parseFloat(amount),
            frequency, // ONE_TIME or MONTHLY
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await docClient.put({
            TableName: TABLES.FEE_STRUCTURE,
            Item: feeStructure
        }).promise();

        res.status(201).json(successResponse(feeStructure, 'Fee structure created successfully'));
    } catch (error) {
        console.error('Create fee structure error:', error);
        res.status(500).json(errorResponse('Failed to create fee structure', error));
    }
};

exports.getAllFeeStructures = async (req, res) => {
    try {
        const result = await docClient.scan({
            TableName: TABLES.FEE_STRUCTURE
        }).promise();

        res.status(200).json(successResponse(result.Items, 'Fee structures retrieved successfully'));
    } catch (error) {
        console.error('Get fee structures error:', error);
        res.status(500).json(errorResponse('Failed to retrieve fee structures', error));
    }
};

exports.updateFeeStructure = async (req, res) => {
    try {
        const { feeStructureId } = req.params;
        const { amount, frequency } = req.body;

        if (!amount || !frequency) {
            return res.status(400).json(errorResponse('Amount and frequency are required'));
        }

        // Only update amount and frequency, NOT feeType (since feeStructureId is based on feeType)
        const updateExpression = 'SET amount = :amount, frequency = :frequency, updatedAt = :updatedAt';
        const expressionAttributeValues = {
            ':amount': parseFloat(amount),
            ':frequency': frequency,
            ':updatedAt': new Date().toISOString()
        };

        const result = await docClient.update({
            TableName: TABLES.FEE_STRUCTURE,
            Key: { feeStructureId },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        }).promise();

        res.status(200).json(successResponse(result.Attributes, 'Fee structure updated successfully'));
    } catch (error) {
        console.error('Update fee structure error:', error);
        res.status(500).json(errorResponse('Failed to update fee structure', error));
    }
};

// Calculate pending fees for a student based on fee structure
exports.calculatePendingFees = async (req, res) => {
    try {
        const { studentId } = req.params;
        console.log('Calculating pending fees for student:', studentId);

        // Get student
        const student = await StudentModel.findById(studentId);
        if (!student) {
            return res.status(404).json(errorResponse('Student not found'));
        }

        // Use the utility function for consistent calculation
        const result = await calculatePendingFeesForStudent(student);

        console.log('Calculation complete. Total pending:', result.totalPending);
        console.log('Breakdown items:', result.breakdown.length);

        res.status(200).json(successResponse({
            studentId: result.studentId,
            totalPending: result.totalPending,
            breakdown: result.breakdown
        }, 'Pending fees calculated successfully'));
    } catch (error) {
        console.error('Calculate pending fees error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json(errorResponse('Failed to calculate pending fees', error.message));
    }
};

// Exam Management
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

// Holiday Management
exports.addHoliday = async (req, res) => {
    try {
        const { holidayName, holidayDate, holidayType, description } = req.body;

        if (!holidayName || !holidayDate) {
            return res.status(400).json(errorResponse('Holiday name and date are required'));
        }

        const holidayId = `HOLIDAY#${uuidv4()}`;
        const holiday = {
            holidayId,
            holidayName,
            holidayDate,
            holidayType: holidayType || 'SCHOOL',
            description: description || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await docClient.put({
            TableName: TABLES.HOLIDAYS,
            Item: holiday
        }).promise();

        res.status(201).json(successResponse(holiday, 'Holiday added successfully'));
    } catch (error) {
        console.error('Add holiday error:', error);
        res.status(500).json(errorResponse('Failed to add holiday', error));
    }
};

exports.getAllHolidays = async (req, res) => {
    try {
        const result = await docClient.scan({ TableName: TABLES.HOLIDAYS }).promise();
        res.status(200).json(successResponse(result.Items, 'Holidays retrieved successfully'));
    } catch (error) {
        console.error('Get holidays error:', error);
        res.status(500).json(errorResponse('Failed to retrieve holidays', error));
    }
};

exports.updateHoliday = async (req, res) => {
    try {
        const { holidayId } = req.params;
        const { holidayName, holidayDate, holidayType, description } = req.body;

        if (!holidayName || !holidayDate || !holidayType) {
            return res.status(400).json(errorResponse('Holiday name, date, and type are required'));
        }

        const updateExpression = 'SET holidayName = :holidayName, holidayDate = :holidayDate, holidayType = :holidayType, description = :description, updatedAt = :updatedAt';
        const expressionAttributeValues = {
            ':holidayName': holidayName,
            ':holidayDate': holidayDate,
            ':holidayType': holidayType,
            ':description': description || '',
            ':updatedAt': new Date().toISOString()
        };

        const result = await docClient.update({
            TableName: TABLES.HOLIDAYS,
            Key: { holidayId },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        }).promise();

        res.status(200).json(successResponse(result.Attributes, 'Holiday updated successfully'));
    } catch (error) {
        console.error('Update holiday error:', error);
        res.status(500).json(errorResponse('Failed to update holiday', error));
    }
};

// Reports
exports.getEarningsReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end = endDate || new Date().toISOString().split('T')[0];

        const report = await FeeModel.getEarningsReport(start, end);

        res.status(200).json(successResponse(report, 'Earnings report generated successfully'));
    } catch (error) {
        console.error('Get earnings report error:', error);
        res.status(500).json(errorResponse('Failed to generate earnings report', error));
    }
};

exports.getStudentCountReport = async (req, res) => {
    try {
        const totalStudents = await StudentModel.getCount();
        const allStudents = await StudentModel.getAll();

        const byClass = {};
        allStudents.filter(s => s.status === 'ACTIVE').forEach(student => {
            byClass[student.class] = (byClass[student.class] || 0) + 1;
        });

        const report = {
            totalStudents,
            activeStudents: allStudents.filter(s => s.status === 'ACTIVE').length,
            byClass
        };

        res.status(200).json(successResponse(report, 'Student count report generated successfully'));
    } catch (error) {
        console.error('Get student count report error:', error);
        res.status(500).json(errorResponse('Failed to generate student count report', error));
    }
};

// School Info Management
exports.getSchoolInfo = async (req, res) => {
    try {
        const result = await docClient.get({
            TableName: TABLES.SCHOOL_INFO,
            Key: { infoId: 'INFO#SCHOOL' }
        }).promise();

        res.status(200).json(successResponse(result.Item || {}, 'School info retrieved successfully'));
    } catch (error) {
        console.error('Get school info error:', error);
        res.status(500).json(errorResponse('Failed to retrieve school info', error));
    }
};

exports.updateSchoolInfo = async (req, res) => {
    try {
        const updates = req.body;
        const updateExpression = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        Object.keys(updates).forEach((key) => {
            updateExpression.push(`#${key} = :${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:${key}`] = updates[key];
        });

        updateExpression.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();

        const params = {
            TableName: TABLES.SCHOOL_INFO,
            Key: { infoId: 'INFO#SCHOOL' },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };

        const result = await docClient.update(params).promise();

        res.status(200).json(successResponse(result.Attributes, 'School info updated successfully'));
    } catch (error) {
        console.error('Update school info error:', error);
        res.status(500).json(errorResponse('Failed to update school info', error));
    }
};

// Expenditure Management
exports.createExpenditure = async (req, res) => {
    try {
        const { expenseType, amount, date, comment } = req.body;

        if (!expenseType || !amount || !date) {
            return res.status(400).json(errorResponse('Expense type, amount, and date are required'));
        }

        const expenditure = await ExpenditureModel.create({
            expenseType,
            amount: parseFloat(amount),
            date,
            comment: comment || ''
        });

        res.status(201).json(successResponse(expenditure, 'Expenditure added successfully'));
    } catch (error) {
        console.error('Create expenditure error:', error);
        res.status(500).json(errorResponse('Failed to add expenditure', error));
    }
};

exports.getAllExpenditures = async (req, res) => {
    try {
        const expenditures = await ExpenditureModel.getAll();
        res.status(200).json(successResponse(expenditures, 'Expenditures retrieved successfully'));
    } catch (error) {
        console.error('Get expenditures error:', error);
        res.status(500).json(errorResponse('Failed to retrieve expenditures', error));
    }
};

exports.getExpenditureReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end = endDate || new Date().toISOString().split('T')[0];

        const report = await ExpenditureModel.getExpenditureReport(start, end);

        res.status(200).json(successResponse(report, 'Expenditure report generated successfully'));
    } catch (error) {
        console.error('Get expenditure report error:', error);
        res.status(500).json(errorResponse('Failed to generate expenditure report', error));
    }
};

// Get all inquiries
exports.getAllInquiries = async (req, res) => {
    try {
        const result = await docClient.scan({
            TableName: TABLES.INQUIRIES
        }).promise();

        // Sort by submission date (newest first)
        const sortedInquiries = (result.Items || []).sort((a, b) =>
            new Date(b.submittedAt) - new Date(a.submittedAt)
        );

        res.status(200).json(successResponse(sortedInquiries, 'Inquiries retrieved successfully'));
    } catch (error) {
        console.error('Get inquiries error:', error);
        res.status(500).json(errorResponse('Failed to retrieve inquiries', error));
    }
};

// Update inquiry status
exports.updateInquiryStatus = async (req, res) => {
    try {
        const { inquiryId } = req.params;
        const { status, comment } = req.body;

        if (!['NEW', 'IN_PROGRESS', 'FOLLOWED_UP', 'ENROLLED', 'REJECTED'].includes(status)) {
            return res.status(400).json(errorResponse('Invalid status'));
        }

        // Get current inquiry to append to history
        const currentInquiry = await docClient.get({
            TableName: TABLES.INQUIRIES,
            Key: { inquiryId }
        }).promise();

        if (!currentInquiry.Item) {
            return res.status(404).json(errorResponse('Inquiry not found'));
        }

        // Build follow-up history
        const followUpHistory = currentInquiry.Item.followUpHistory || [];

        // Add new follow-up entry if comment is provided or status is being updated
        if (comment || status === 'FOLLOWED_UP' || status === 'IN_PROGRESS') {
            followUpHistory.push({
                timestamp: new Date().toISOString(),
                status: status,
                comment: comment || '',
                adminAction: status === 'FOLLOWED_UP' ? 'Marked as Followed Up' : status === 'IN_PROGRESS' ? 'Marked as In Progress' : 'Updated'
            });
        }

        const updateExpression = 'SET #status = :status, followedUpAt = :followedUpAt, updatedAt = :updatedAt, followUpHistory = :followUpHistory';
        const expressionAttributeNames = {
            '#status': 'status'
        };
        const expressionAttributeValues = {
            ':status': status,
            ':followedUpAt': (status === 'FOLLOWED_UP' || status === 'IN_PROGRESS') ? new Date().toISOString() : currentInquiry.Item.followedUpAt,
            ':updatedAt': new Date().toISOString(),
            ':followUpHistory': followUpHistory
        };

        await docClient.update({
            TableName: TABLES.INQUIRIES,
            Key: { inquiryId },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues
        }).promise();

        res.status(200).json(successResponse(null, 'Inquiry status updated successfully'));
    } catch (error) {
        console.error('Update inquiry status error:', error);
        res.status(500).json(errorResponse('Failed to update inquiry status', error));
    }
};
