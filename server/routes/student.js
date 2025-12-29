const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, isStudent } = require('../middleware/auth');

// All routes require authentication and student role
router.use(verifyToken, isStudent);

router.get('/dashboard', studentController.getDashboard);
router.get('/fees', studentController.getFees);
router.get('/exam-results', studentController.getExamResults);
router.get('/upcoming-exams', studentController.getUpcomingExams);
router.get('/holidays', studentController.getHolidays);

module.exports = router;
