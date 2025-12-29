const { docClient, TABLES } = require('../config/dynamodb');
const { successResponse, errorResponse } = require('../utils/helpers');

// Get school information for landing page
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

// Get public media gallery (photos and videos)
exports.getMediaGallery = async (req, res) => {
    try {
        const { mediaType } = req.query;

        let params = {
            TableName: TABLES.MEDIA,
            FilterExpression: 'isPublic = :isPublic',
            ExpressionAttributeValues: {
                ':isPublic': true
            }
        };

        if (mediaType) {
            params.FilterExpression += ' AND mediaType = :mediaType';
            params.ExpressionAttributeValues[':mediaType'] = mediaType.toUpperCase();
        }

        const result = await docClient.scan(params).promise();

        // Sort by upload date descending
        const sortedItems = result.Items.sort((a, b) =>
            new Date(b.uploadDate) - new Date(a.uploadDate)
        );

        res.status(200).json(successResponse(sortedItems, 'Media gallery retrieved successfully'));
    } catch (error) {
        console.error('Get media gallery error:', error);
        res.status(500).json(errorResponse('Failed to retrieve media gallery', error));
    }
};

// Get upcoming holidays (public)
exports.getUpcomingHolidays = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const result = await docClient.scan({
            TableName: TABLES.HOLIDAYS,
            FilterExpression: 'holidayDate >= :today',
            ExpressionAttributeValues: {
                ':today': today
            }
        }).promise();

        // Sort by date
        const sortedHolidays = result.Items.sort((a, b) =>
            new Date(a.holidayDate) - new Date(b.holidayDate)
        );

        res.status(200).json(successResponse(sortedHolidays, 'Holidays retrieved successfully'));
    } catch (error) {
        console.error('Get holidays error:', error);
        res.status(500).json(errorResponse('Failed to retrieve holidays', error));
    }
};

// Contact form submission (optional - could send email or store in DB)
exports.submitContactForm = async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json(errorResponse('Name, email, and message are required'));
        }

        // Here you could:
        // 1. Send an email to admin
        // 2. Store in a contacts table
        // 3. Both
        // For now, we'll just return success

        console.log('Contact form submission:', { name, email, phone, message });

        res.status(200).json(successResponse(null, 'Thank you for contacting us! We will get back to you soon.'));
    } catch (error) {
        console.error('Submit contact form error:', error);
        res.status(500).json(errorResponse('Failed to submit contact form', error));
    }
};
