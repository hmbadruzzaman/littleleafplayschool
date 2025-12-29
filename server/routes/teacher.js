const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { verifyToken, isTeacher, isAdminOrTeacher } = require('../middleware/auth');

// Routes requiring teacher or admin role
router.get('/students', verifyToken, isAdminOrTeacher, teacherController.getAllStudents);
router.get('/students/class/:className', verifyToken, isAdminOrTeacher, teacherController.getStudentsByClass);
router.get('/exams', verifyToken, isAdminOrTeacher, teacherController.getAllExams);
router.get('/marks/:studentId', verifyToken, isAdminOrTeacher, teacherController.getStudentMarks);
router.post('/marks', verifyToken, isAdminOrTeacher, teacherController.uploadMarks);
router.get('/exams/:examId/results', verifyToken, isAdminOrTeacher, teacherController.getExamResults);

// Routes requiring teacher role only
router.use(verifyToken, isTeacher);

router.get('/assigned-classes', teacherController.getAssignedClasses);
router.post('/exams', teacherController.createExam);
router.post('/marks/bulk', teacherController.bulkUploadMarks);

module.exports = router;
