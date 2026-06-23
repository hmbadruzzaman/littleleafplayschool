const UserModel = require('../models/User');
const StudentModel = require('../models/Student');
const TeacherModel = require('../models/Teacher');
const FeeModel = require('../models/Fee');
const ExamModel = require('../models/Exam');
const ExamResultModel = require('../models/ExamResult');
const ExpenditureModel = require('../models/Expenditure');
const { docClient, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');
const { hashPassword, generateRollNumber, generateTeacherId, successResponse, errorResponse } = require('../utils/helpers');
const { calculatePendingFeesForStudent } = require('../utils/feeCalculations');
const { getPendingUnits, computePendingForStudents } = require('../utils/feeCalculations');
const { allocate } = require('../utils/allocatePayment');
const { groupItemCharges } = require('../utils/itemCharges');

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

        // Allow-list of editable fields on the Teacher row. Excludes employeeId
        // (system-generated) and password (lives on the linked User row).
        const allowed = ['fullName', 'email', 'phone', 'address', 'qualification', 'experience', 'joiningDate', 'assignedClasses', 'status'];
        const updates = {};
        for (const k of allowed) {
            if (req.body[k] !== undefined) updates[k] = req.body[k];
        }

        const newPassword = typeof req.body.password === 'string' && req.body.password.length > 0
            ? req.body.password
            : null;

        if (Object.keys(updates).length === 0 && !newPassword) {
            return res.status(400).json(errorResponse('No editable fields supplied'));
        }

        // Update the Teacher row if anything changed there.
        let teacher;
        if (Object.keys(updates).length > 0) {
            teacher = await TeacherModel.update(teacherId, updates);
        } else {
            teacher = await TeacherModel.findById(teacherId);
        }

        // Sync the linked User row (login state and/or password).
        if (teacher?.employeeId && (updates.status || newPassword)) {
            try {
                const user = await UserModel.findByTeacherId(teacher.employeeId);
                if (user && user.userId) {
                    const userUpdates = {};
                    if (updates.status) userUpdates.isActive = updates.status === 'ACTIVE';
                    if (newPassword)    userUpdates.password = await hashPassword(newPassword);
                    if (Object.keys(userUpdates).length > 0) {
                        await UserModel.update(user.userId, userUpdates);
                    }
                }
            } catch (syncErr) {
                console.error('Failed to sync user row for teacher:', syncErr);
                // Don't fail the whole request — the teacher row was updated.
            }
        }

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

// Preview a lump-sum allocation across a student's pending dues (no writes)
exports.quickPayPreview = async (req, res) => {
    try {
        const { studentId } = req.params;
        const amount = parseFloat(req.body.amount);
        if (!amount || amount <= 0) {
            return res.status(400).json(errorResponse('A valid amount is required'));
        }
        const student = await StudentModel.findById(studentId);
        if (!student) {
            return res.status(404).json(errorResponse('Student not found'));
        }
        const units = await getPendingUnits(student);
        const result = allocate(units, amount, { rollNumber: student.rollNumber });
        res.status(200).json(successResponse({
            studentId: student.studentId,
            amount,
            totalPending: result.totalPending,
            allocated: result.allocated,
            leftover: result.leftover,
            allocations: result.allocations
        }, 'Allocation preview computed'));
    } catch (error) {
        console.error('Quick pay preview error:', error);
        res.status(500).json(errorResponse('Failed to compute allocation', error.message));
    }
};

// Commit a lump-sum payment: recompute authoritatively and write PAID fee rows
exports.quickPay = async (req, res) => {
    try {
        const { studentId } = req.params;
        const amount = parseFloat(req.body.amount);
        const { paymentMethod, paymentDate, remarks } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json(errorResponse('A valid amount is required'));
        }
        const student = await StudentModel.findById(studentId);
        if (!student) {
            return res.status(404).json(errorResponse('Student not found'));
        }

        // Recompute from scratch — never trust client-sent line items.
        const units = await getPendingUnits(student);
        const result = allocate(units, amount, {
            rollNumber: student.rollNumber,
            paymentMethod: paymentMethod || 'CASH',
            paymentDate: paymentDate || new Date().toISOString().split('T')[0],
            remarks: remarks || ''
        });

        if (result.allocations.length === 0) {
            return res.status(400).json(errorResponse('No pending dues to apply this payment to'));
        }

        for (const a of result.allocations) {
            if (a.kind === 'ITEM') {
                // Record a dated PAID income row for this item payment...
                await FeeModel.create({
                    studentId: student.studentId,
                    rollNumber: student.rollNumber,
                    feeType: 'OTHER',
                    itemId: a.itemId,
                    itemName: a.itemName,
                    amount: a.amount,
                    dueDate: a.dueDate,
                    paymentStatus: 'PAID',
                    paymentMethod: a.paymentMethod,
                    paymentDate: a.paymentDate,
                    remarks: a.remarks
                });
                // ...and shrink (or clear) the owed PENDING row.
                if (a.itemRemainingAfter > 0) {
                    await FeeModel.update(a.feeId, { amount: a.itemRemainingAfter });
                } else {
                    await FeeModel.delete(a.feeId);
                }
            } else {
                await FeeModel.create({
                    studentId: student.studentId,
                    rollNumber: student.rollNumber,
                    feeType: a.feeType,
                    amount: a.amount,
                    month: a.month || '',
                    academicYear: a.academicYear || '',
                    dueDate: a.dueDate,
                    paymentStatus: a.paymentStatus,
                    paymentMethod: a.paymentMethod,
                    paymentDate: a.paymentDate,
                    remarks: a.remarks
                });
            }
        }

        res.status(201).json(successResponse({
            studentId: student.studentId,
            allocated: result.allocated,
            leftover: result.leftover,
            count: result.allocations.length,
            allocations: result.allocations
        }, `Recorded ${result.allocations.length} payment(s)`));
    } catch (error) {
        console.error('Quick pay error:', error);
        res.status(500).json(errorResponse('Failed to record payment', error.message));
    }
};

// List a student's item charges (books, dress, etc.), grouped by itemId
exports.getItemCharges = async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await StudentModel.findById(studentId);
        if (!student) {
            return res.status(404).json(errorResponse('Student not found'));
        }
        const fees = await FeeModel.getByStudentId(studentId);
        res.status(200).json(successResponse({ items: groupItemCharges(fees) }, 'Item charges fetched'));
    } catch (error) {
        console.error('Get item charges error:', error);
        res.status(500).json(errorResponse('Failed to fetch item charges', error.message));
    }
};

// Add an item charge: optional dated PAID income row + optional owed PENDING row
exports.createItemCharge = async (req, res) => {
    try {
        const { studentId } = req.params;
        const itemName = (req.body.itemName || '').trim();
        const amountPaid = parseFloat(req.body.amountPaid) || 0;
        const amountPending = parseFloat(req.body.amountPending) || 0;
        const paymentMethod = req.body.paymentMethod || 'CASH';

        if (!itemName) {
            return res.status(400).json(errorResponse('Item name is required'));
        }
        if (amountPaid <= 0 && amountPending <= 0) {
            return res.status(400).json(errorResponse('Enter a paid and/or pending amount'));
        }

        const student = await StudentModel.findById(studentId);
        if (!student) {
            return res.status(404).json(errorResponse('Student not found'));
        }

        const itemId = `ITEM#${uuidv4()}`;
        const today = new Date().toISOString().split('T')[0];

        if (amountPaid > 0) {
            await FeeModel.create({
                studentId: student.studentId,
                rollNumber: student.rollNumber,
                feeType: 'OTHER',
                itemId,
                itemName,
                amount: amountPaid,
                dueDate: today,
                paymentStatus: 'PAID',
                paymentMethod,
                paymentDate: today
            });
        }
        if (amountPending > 0) {
            await FeeModel.create({
                studentId: student.studentId,
                rollNumber: student.rollNumber,
                feeType: 'OTHER',
                itemId,
                itemName,
                amount: amountPending,
                dueDate: today,
                paymentStatus: 'PENDING'
            });
        }

        res.status(201).json(successResponse({ itemId, itemName }, 'Item charge added'));
    } catch (error) {
        console.error('Create item charge error:', error);
        res.status(500).json(errorResponse('Failed to add item charge', error.message));
    }
};

// Delete an item charge (all rows sharing the itemId for this student)
exports.deleteItemCharge = async (req, res) => {
    try {
        const { studentId, itemId } = req.params;
        const fees = await FeeModel.getByStudentId(studentId);
        const rows = fees.filter(f => f.feeType === 'OTHER' && f.itemId === itemId);
        if (rows.length === 0) {
            return res.status(404).json(errorResponse('Item charge not found'));
        }
        for (const row of rows) {
            await FeeModel.delete(row.feeId);
        }
        res.status(200).json(successResponse({ itemId, deleted: rows.length }, 'Item charge deleted'));
    } catch (error) {
        console.error('Delete item charge error:', error);
        res.status(500).json(errorResponse('Failed to delete item charge', error.message));
    }
};

// Exam Management
// Validate that every subject carries a YYYY-MM-DD examDate; return the
// earliest as the derived exam-level date (denormalized for the
// class-examDate-index GSI). Returns { ok, message?, derivedExamDate? }.
function validateAndDeriveExamDate(subjects) {
    if (!Array.isArray(subjects) || subjects.length === 0) {
        return { ok: false, message: 'At least one subject is required.' };
    }
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const dates = [];
    for (const s of subjects) {
        if (!s.examDate || !datePattern.test(s.examDate)) {
            return { ok: false, message: `Subject "${s.name || '(unnamed)'}" needs a date (YYYY-MM-DD).` };
        }
        dates.push(s.examDate);
    }
    dates.sort();
    return { ok: true, derivedExamDate: dates[0] };
}

exports.createExam = async (req, res) => {
    try {
        const { examName, examType, class: className, subject, totalMarks, passingMarks, subjects } = req.body;

        if (!examName || !className) {
            return res.status(400).json(errorResponse('Missing required fields'));
        }

        const check = validateAndDeriveExamDate(subjects);
        if (!check.ok) {
            return res.status(400).json(errorResponse(check.message));
        }

        const exam = await ExamModel.create({
            examName,
            examType: examType || 'MONTHLY',
            class: className,
            subject: subject || '',
            examDate: check.derivedExamDate,
            totalMarks: totalMarks || 0,
            passingMarks: passingMarks || 0,
            subjects: subjects,
            createdBy: req.user.userId
        });

        res.status(201).json(successResponse(exam, 'Exam created successfully'));
    } catch (error) {
        console.error('Create exam error:', error);
        res.status(500).json(errorResponse('Failed to create exam', error));
    }
};

// Get all exams (with optional class filter). Each exam is annotated with
// `hasResults` so the admin UI can lock subject edits and disable delete
// once any student has marks recorded.
exports.getAllExams = async (req, res) => {
    try {
        const { class: className } = req.query;

        const exams = className
            ? await ExamModel.getByClass(className)
            : await ExamModel.getAll();

        // One scan of EXAM_RESULTS projecting just examId, build a count map,
        // attach hasResults + resultCount to each exam. Cheaper than N queries
        // to the GSI.
        const resultsScan = await docClient.scan({
            TableName: TABLES.EXAM_RESULTS,
            ProjectionExpression: 'examId'
        }).promise();
        const countByExamId = (resultsScan.Items || []).reduce((acc, r) => {
            acc[r.examId] = (acc[r.examId] || 0) + 1;
            return acc;
        }, {});

        const enriched = (exams || []).map(e => {
            const resultCount = countByExamId[e.examId] || 0;
            return { ...e, hasResults: resultCount > 0, resultCount };
        });

        res.status(200).json(successResponse(enriched, 'Exams retrieved successfully'));
    } catch (error) {
        console.error('Get exams error:', error);
        res.status(500).json(errorResponse('Failed to retrieve exams', error));
    }
};

// Update an exam. Subjects and totalMarks are locked once any student
// has marks recorded for this exam — the lock is enforced here, not just
// in the UI. Name/type/class/date remain editable.
exports.updateExam = async (req, res) => {
    try {
        const { examId } = req.params;

        const existing = await ExamModel.findById(examId);
        if (!existing) {
            return res.status(404).json(errorResponse('Exam not found'));
        }

        // examDate is derived from subjects, not directly editable.
        const allowed = ['examName', 'examType', 'class', 'subjects', 'totalMarks'];
        const updates = {};
        for (const k of allowed) {
            if (req.body[k] !== undefined) updates[k] = req.body[k];
        }

        // Enforce the subject lock: if any results exist, strip subjects/totalMarks.
        const results = await ExamResultModel.getByExamId(examId);
        if (results && results.length > 0) {
            delete updates.subjects;
            delete updates.totalMarks;
        }

        // When subjects change, re-validate dates and re-derive exam.examDate.
        if (updates.subjects) {
            const check = validateAndDeriveExamDate(updates.subjects);
            if (!check.ok) {
                return res.status(400).json(errorResponse(check.message));
            }
            updates.examDate = check.derivedExamDate;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json(errorResponse('No editable fields supplied'));
        }

        const updated = await ExamModel.update(examId, updates);
        const hasResults = results && results.length > 0;
        res.status(200).json(successResponse({ ...updated, hasResults }, 'Exam updated successfully'));
    } catch (error) {
        console.error('Update exam error:', error);
        res.status(500).json(errorResponse('Failed to update exam', error));
    }
};

// Delete an exam. Blocked with 409 if marks exist for it, unless the caller
// opts in with ?cascade=true — in which case all associated ExamResult rows
// are deleted first, then the exam.
exports.deleteExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const cascade = req.query.cascade === 'true';

        const existing = await ExamModel.findById(examId);
        if (!existing) {
            return res.status(404).json(errorResponse('Exam not found'));
        }

        const results = await ExamResultModel.getByExamId(examId);
        const resultCount = results ? results.length : 0;

        if (resultCount > 0 && !cascade) {
            return res.status(409).json(errorResponse(
                `Cannot delete: ${resultCount} student${resultCount === 1 ? ' has' : 's have'} marks recorded for this exam. Pass ?cascade=true to delete the marks too.`
            ));
        }

        let deletedMarks = 0;
        if (resultCount > 0) {
            deletedMarks = await ExamResultModel.deleteByExamId(examId);
        }

        await ExamModel.delete(examId);
        res.status(200).json(successResponse(
            { examId, deletedMarks },
            deletedMarks > 0
                ? `Exam deleted along with ${deletedMarks} mark${deletedMarks === 1 ? '' : 's'} record${deletedMarks === 1 ? '' : 's'}.`
                : 'Exam deleted'
        ));
    } catch (error) {
        console.error('Delete exam error:', error);
        res.status(500).json(errorResponse('Failed to delete exam', error));
    }
};

// Delete a single exam result row (one student's marks for one exam).
exports.deleteExamResult = async (req, res) => {
    try {
        const { resultId } = req.params;
        await ExamResultModel.delete(resultId);
        res.status(200).json(successResponse({ resultId }, 'Marks deleted'));
    } catch (error) {
        console.error('Delete exam result error:', error);
        res.status(500).json(errorResponse('Failed to delete marks', error));
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

exports.updateExpenditure = async (req, res) => {
    try {
        const { expenditureId } = req.params;
        const { expenseType, amount, date, comment } = req.body;

        const updates = {};
        if (expenseType) updates.expenseType = expenseType;
        if (amount) updates.amount = parseFloat(amount);
        if (date) updates.date = date;
        if (comment !== undefined) updates.comment = comment;

        const expenditure = await ExpenditureModel.update(expenditureId, updates);

        res.status(200).json(successResponse(expenditure, 'Expenditure updated successfully'));
    } catch (error) {
        console.error('Update expenditure error:', error);
        res.status(500).json(errorResponse('Failed to update expenditure', error));
    }
};

exports.deleteExpenditure = async (req, res) => {
    try {
        const { expenditureId } = req.params;

        await ExpenditureModel.delete(expenditureId);

        res.status(200).json(successResponse({ expenditureId }, 'Expenditure deleted successfully'));
    } catch (error) {
        console.error('Delete expenditure error:', error);
        res.status(500).json(errorResponse('Failed to delete expenditure', error));
    }
};

// Get total pending fees across all students
exports.getTotalPendingFees = async (req, res) => {
    try {
        // Fetch the three datasets ONCE, then compute pending in memory — avoids a
        // fee-structure scan + a fees query per student (previously O(N) sequential
        // DB round-trips, the source of the slow page loads).
        const [students, structuresResult, allFees] = await Promise.all([
            StudentModel.getAll(),
            docClient.scan({ TableName: TABLES.FEE_STRUCTURE }).promise(),
            FeeModel.getAll()
        ]);
        const activeStudents = students.filter(s => s.status === 'ACTIVE');
        const feeStructures = structuresResult.Items || [];
        const pendingByStudent = computePendingForStudents({
            students: activeStudents,
            feeStructures,
            allFees: allFees || [],
            today: new Date()
        });

        let totalPending = 0;
        const studentsWithPending = [];

        for (const student of activeStudents) {
            const pendingResult = pendingByStudent.get(student.studentId);

            if (pendingResult && pendingResult.totalPending > 0) {
                studentsWithPending.push({
                    studentId: student.studentId,
                    studentName: student.fullName,
                    rollNumber: student.rollNumber,
                    class: student.class,
                    parentName: student.parentName,
                    phone: student.parentPhone,
                    totalPending: pendingResult.totalPending,
                    pendingBreakdown: pendingResult.breakdown
                });
                totalPending += pendingResult.totalPending;
            }
        }

        // Sort by pending amount (highest first)
        studentsWithPending.sort((a, b) => b.totalPending - a.totalPending);

        res.status(200).json(successResponse({
            totalPending,
            studentCount: studentsWithPending.length,
            students: studentsWithPending
        }, 'Total pending fees calculated successfully'));
    } catch (error) {
        console.error('Get total pending fees error:', error);
        res.status(500).json(errorResponse('Failed to calculate total pending fees', error));
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

        if (!['NEW', 'IN_PROGRESS', 'FOLLOWED_UP', 'ENROLLED', 'REJECTED', 'ADMITTED'].includes(status)) {
            return res.status(400).json(errorResponse('Invalid status'));
        }

        const currentInquiry = await docClient.get({
            TableName: TABLES.INQUIRIES,
            Key: { inquiryId }
        }).promise();

        if (!currentInquiry.Item) {
            return res.status(404).json(errorResponse('Inquiry not found'));
        }

        const followUpHistory = currentInquiry.Item.followUpHistory || [];

        if (comment || status === 'FOLLOWED_UP' || status === 'IN_PROGRESS' || (status === 'ADMITTED' && !currentInquiry.Item.admissionDate)) {
            followUpHistory.push({
                timestamp: new Date().toISOString(),
                status: status,
                comment: comment || '',
                adminAction: status === 'FOLLOWED_UP'
                    ? 'Marked as Followed Up'
                    : status === 'IN_PROGRESS'
                        ? 'Marked as In Progress'
                        : status === 'ADMITTED'
                            ? 'Marked as Admitted'
                            : 'Updated'
            });
        }

        let updateExpression = 'SET #status = :status, updatedAt = :updatedAt, followUpHistory = :followUpHistory';
        const expressionAttributeNames = { '#status': 'status' };
        const expressionAttributeValues = {
            ':status': status,
            ':updatedAt': new Date().toISOString(),
            ':followUpHistory': followUpHistory
        };

        // Only touch followedUpAt when actively marking a follow-up; otherwise
        // leave the existing value alone. DynamoDB rejects undefined in
        // ExpressionAttributeValues, so we can't pass `currentInquiry.Item.followedUpAt`
        // unconditionally — it's undefined for inquiries that were never followed up.
        if (status === 'FOLLOWED_UP' || status === 'IN_PROGRESS') {
            updateExpression += ', followedUpAt = :followedUpAt';
            expressionAttributeValues[':followedUpAt'] = new Date().toISOString();
        }

        if (status === 'ADMITTED' && !currentInquiry.Item.admissionDate) {
            updateExpression += ', admissionDate = :admissionDate';
            expressionAttributeValues[':admissionDate'] = new Date().toISOString().split('T')[0];
        }

        await docClient.update({
            TableName: TABLES.INQUIRIES,
            Key: { inquiryId },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues
        }).promise();

        const updatedInquiry = await docClient.get({
            TableName: TABLES.INQUIRIES,
            Key: { inquiryId },
            ConsistentRead: true
        }).promise();

        res.status(200).json(successResponse(updatedInquiry.Item, 'Inquiry status updated successfully'));
    } catch (error) {
        console.error('Update inquiry status error:', error);
        res.status(500).json(errorResponse('Failed to update inquiry status', error));
    }
};
