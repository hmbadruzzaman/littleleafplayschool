require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { docClient, TABLES } = require('../config/dynamodb');

async function seedAdmin() {
    try {
        console.log('Seeding default admin user...\n');

        // Generate admin ID
        const adminId = `ADM#${uuidv4()}`;
        const employeeId = 'ADM001';

        // Hash password
        const password = 'admin123'; // Change this in production
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin user
        const adminUser = {
            userId: adminId,
            userType: 'ADMIN',
            adminId: employeeId,
            password: hashedPassword,
            email: 'admin@littleleafplayschool.com',
            phone: '+1234567890',
            fullName: 'System Administrator',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
        };

        await docClient.put({
            TableName: TABLES.USERS,
            Item: adminUser,
            ConditionExpression: 'attribute_not_exists(userId)'
        }).promise();

        console.log('✓ Admin user created successfully');
        console.log('\nDefault Admin Credentials:');
        console.log('Admin ID: ADM001');
        console.log('Password: admin123');
        console.log('\n⚠ IMPORTANT: Change the password after first login!\n');

        // Create school info
        const schoolInfo = {
            infoId: 'INFO#SCHOOL',
            schoolName: 'Little Leaf Play School',
            address: '123 Education Lane, City, State, ZIP',
            phone: '+1234567890',
            email: 'info@littleleafplayschool.com',
            website: 'www.littleleafplayschool.com',
            brochureUrl: '',
            principalName: 'To be updated',
            foundedYear: 2024,
            socialMedia: {
                facebook: '',
                instagram: '',
                twitter: ''
            },
            updatedAt: new Date().toISOString()
        };

        await docClient.put({
            TableName: TABLES.SCHOOL_INFO,
            Item: schoolInfo,
            ConditionExpression: 'attribute_not_exists(infoId)'
        }).promise();

        console.log('✓ School info created successfully\n');

    } catch (error) {
        if (error.code === 'ConditionalCheckFailedException') {
            console.log('⚠ Admin user or school info already exists\n');
        } else {
            console.error('✗ Error seeding admin:', error.message);
            throw error;
        }
    }
}

// Run if executed directly
if (require.main === module) {
    seedAdmin()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { seedAdmin };
