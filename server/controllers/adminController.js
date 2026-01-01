const UserModel = require('../models/User');
const StudentModel = require('../models/Student');
const TeacherModel = require('../models/Teacher');
const FeeModel = require('../models/Fee');
const ExamModel = require('../models/Exam');
const ExpenditureModel = require('../models/Expenditure');
const { docClient, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');
const { hashPassword, generateRollNumber, generateTeacherId, successResponse, errorResponse } = require('../utils/helpers');

// Student Management
exports.createStudent = async (req, res) => {
    try {
        const { fullName, dateOfBirth, parentName, parentPhone, parentEmail, address, class: className, password } = req.body;

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

        // Create student profile
        const student = await StudentModel.create({
            rollNumber,
            fullName,
            dateOfBirth,
            parentName,
            parentPhone,
            parentEmail: parentEmail || '',
            address,
            class: className,
            admissionDate: new Date().toISOString().split('T')[0]
        });

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
        await StudentModel.delete(studentId);
        res.status(200).json(successResponse(null, 'Student deleted successfully'));
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

// Calculate pending fees for a student based on fee structure
exports.calculatePendingFees = async (req, res) => {
    try {
        const { studentId } = req.params;
        console.log('Calculating pending fees for student:', studentId);

        // Get fee structures
        console.log('Fetching fee structures from table:', TABLES.FEE_STRUCTURE);
        const feeStructuresResult = await docClient.scan({
            TableName: TABLES.FEE_STRUCTURE
        }).promise();
        const feeStructures = feeStructuresResult.Items || [];
        console.log('Found fee structures:', feeStructures.length);

        // Get student's fee records
        const studentFees = await FeeModel.getByStudentId(studentId);
        console.log('Found student fee records:', studentFees.length);
        console.log('Student fees:', JSON.stringify(studentFees, null, 2));

        // Get student admission date
        const studentResult = await docClient.get({
            TableName: TABLES.STUDENTS,
            Key: { studentId }
        }).promise();
        const student = studentResult.Item;

        if (!student) {
            return res.status(404).json(errorResponse('Student not found'));
        }

        // Parse admission date carefully to avoid timezone issues
        // For date-only strings like '2024-01-01', parse manually to avoid UTC conversion
        const admissionDateStr = student.admissionDate || student.createdAt || new Date().toISOString();
        let admissionDate;

        if (admissionDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Date-only format (YYYY-MM-DD), parse as local date
            const [year, month, day] = admissionDateStr.split('-').map(Number);
            admissionDate = new Date(year, month - 1, day); // month is 0-indexed
        } else {
            // ISO string with time, parse normally
            admissionDate = new Date(admissionDateStr);
        }

        console.log('Student admission date string:', admissionDateStr);
        console.log('Student admission date parsed:', admissionDate);
        console.log('Admission year:', admissionDate.getFullYear(), 'month:', admissionDate.getMonth());

        const today = new Date();
        let totalPending = 0;
        const pendingBreakdown = [];

        for (const structure of feeStructures) {
            if (structure.frequency === 'ONE_TIME') {
                // For one-time fees (Admission, Annual, etc.)
                // If ANY payment with status=PAID exists, consider it fully paid regardless of amount
                const paidFees = studentFees.filter(f =>
                    f.feeType === structure.feeType && f.paymentStatus === 'PAID'
                );

                if (paidFees.length > 0) {
                    // Has PAID status, so no pending regardless of amount
                    console.log(`${structure.feeType}: Status PAID found, no pending`);
                    continue;
                }

                // No PAID status found, calculate pending based on PENDING records
                const pendingFees = studentFees.filter(f =>
                    f.feeType === structure.feeType && f.paymentStatus === 'PENDING'
                );
                const totalPending_recorded = pendingFees.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);

                // Pending is the full structure amount minus any PENDING records
                const pending = structure.amount - totalPending_recorded;

                if (pending > 0) {
                    console.log(`${structure.feeType}: Pending amount = ${pending}`);
                    totalPending += pending;
                    pendingBreakdown.push({
                        feeType: structure.feeType,
                        structureAmount: structure.amount,
                        paidAmount: 0,
                        pendingAmount: pending,
                        frequency: 'ONE_TIME'
                    });
                }
            } else if (structure.frequency === 'MONTHLY') {
                // For monthly fees, calculate from admission date to current month
                const startMonth = new Date(admissionDate.getFullYear(), admissionDate.getMonth(), 1);
                const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

                console.log(`${structure.feeType}: Calculating from ${startMonth.toLocaleDateString()} to ${currentMonth.toLocaleDateString()}`);

                let monthPending = 0;
                const months = [];
                let monthCount = 0;

                // Loop through each month from admission to now
                for (let d = new Date(startMonth); d <= currentMonth; d.setMonth(d.getMonth() + 1)) {
                    monthCount++;
                    const monthName = d.toLocaleString('default', { month: 'long' });
                    const year = d.getFullYear();

                    // Find payments for this month and fee type
                    const monthPayments = studentFees.filter(f =>
                        f.feeType === structure.feeType &&
                        f.month === monthName &&
                        f.academicYear && f.academicYear.includes(year.toString())
                    );

                    const paidThisMonth = monthPayments
                        .filter(f => f.paymentStatus === 'PAID')
                        .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);

                    const pendingThisMonth = monthPayments
                        .filter(f => f.paymentStatus !== 'PAID')
                        .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);

                    const amountDue = structure.amount;
                    const totalRecorded = paidThisMonth + pendingThisMonth;

                    // Calculate pending for this month
                    let monthlyPending = 0;
                    if (paidThisMonth >= amountDue) {
                        // Fully paid
                        monthlyPending = 0;
                    } else if (totalRecorded < amountDue) {
                        // Not enough recorded (paid + pending), add the difference
                        monthlyPending = amountDue - paidThisMonth;
                    } else {
                        // Has pending records that cover the remaining
                        monthlyPending = pendingThisMonth;
                    }

                    if (monthlyPending > 0) {
                        monthPending += monthlyPending;
                        months.push(`${monthName} ${year}: ₹${monthlyPending}`);
                    }
                }

                console.log(`${structure.feeType}: Processed ${monthCount} months, total pending = ${monthPending}`);

                if (monthPending > 0) {
                    totalPending += monthPending;
                    pendingBreakdown.push({
                        feeType: structure.feeType,
                        structureAmount: structure.amount,
                        pendingAmount: monthPending,
                        frequency: 'MONTHLY',
                        months
                    });
                }
            }
        }

        console.log('Calculation complete. Total pending:', totalPending);
        console.log('Breakdown items:', pendingBreakdown.length);

        res.status(200).json(successResponse({
            studentId,
            totalPending,
            breakdown: pendingBreakdown
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
        const { status } = req.body;

        if (!['NEW', 'FOLLOWED_UP', 'ENROLLED', 'REJECTED'].includes(status)) {
            return res.status(400).json(errorResponse('Invalid status'));
        }

        const updateExpression = 'SET #status = :status, followedUpAt = :followedUpAt, updatedAt = :updatedAt';
        const expressionAttributeNames = {
            '#status': 'status'
        };
        const expressionAttributeValues = {
            ':status': status,
            ':followedUpAt': status === 'FOLLOWED_UP' ? new Date().toISOString() : null,
            ':updatedAt': new Date().toISOString()
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
