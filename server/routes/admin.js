const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(verifyToken, isAdmin);

// Student management
router.post('/students', adminController.createStudent);
router.get('/students', adminController.getAllStudents);
router.put('/students/:studentId', adminController.updateStudent);
router.delete('/students/:studentId', adminController.deleteStudent);

// Teacher management
router.post('/teachers', adminController.createTeacher);
router.get('/teachers', adminController.getAllTeachers);
router.put('/teachers/:teacherId', adminController.updateTeacher);

// Fee management
router.post('/fees', adminController.createFee);
router.put('/fees/:feeId/payment', adminController.recordPayment);
router.get('/students/:studentId/fees', adminController.getStudentFees);

// Exam management
router.post('/exams', adminController.createExam);
router.get('/exams', adminController.getAllExams);

// Holiday management
router.post('/holidays', adminController.addHoliday);
router.get('/holidays', adminController.getAllHolidays);

// Expenditure management
router.post('/expenditures', adminController.createExpenditure);
router.get('/expenditures', adminController.getAllExpenditures);

// Reports
router.get('/reports/earnings', adminController.getEarningsReport);
router.get('/reports/expenditure', adminController.getExpenditureReport);
router.get('/reports/students', adminController.getStudentCountReport);

// School info
router.get('/school-info', adminController.getSchoolInfo);
router.put('/school-info', adminController.updateSchoolInfo);

module.exports = router;
