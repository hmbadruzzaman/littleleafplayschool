const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Public routes - no authentication required
router.get('/school-info', publicController.getSchoolInfo);
router.get('/gallery', publicController.getMediaGallery);
router.get('/holidays', publicController.getUpcomingHolidays);
router.post('/contact', publicController.submitContactForm);
router.post('/inquiry', publicController.submitInquiry);

module.exports = router;
