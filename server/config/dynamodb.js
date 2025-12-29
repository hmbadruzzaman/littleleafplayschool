// Check if using local database (no AWS required)
if (process.env.USE_LOCAL_DB === 'true') {
    console.log('🔧 Using LOCAL in-memory database (no AWS required)');
    module.exports = require('./local-db');
} else {
    console.log('☁️  Using AWS DynamoDB');
    const AWS = require('aws-sdk');

    // Configure AWS SDK
    AWS.config.update({
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    const dynamodb = new AWS.DynamoDB();
    const docClient = new AWS.DynamoDB.DocumentClient();

    // Table names
    const TABLES = {
        USERS: 'LittleLeaf_Users',
        STUDENTS: 'LittleLeaf_Students',
        TEACHERS: 'LittleLeaf_Teachers',
        FEES: 'LittleLeaf_Fees',
        FEE_STRUCTURE: 'LittleLeaf_FeeStructure',
        EXAMS: 'LittleLeaf_Exams',
        EXAM_RESULTS: 'LittleLeaf_ExamResults',
        HOLIDAYS: 'LittleLeaf_Holidays',
        MEDIA: 'LittleLeaf_Media',
        SCHOOL_INFO: 'LittleLeaf_SchoolInfo',
        NOTIFICATIONS: 'LittleLeaf_Notifications',
        INQUIRIES: 'LittleLeaf_Inquiries'
    };

    module.exports = {
        dynamodb,
        docClient,
        TABLES
    };
}
