require('dotenv').config();
const { dynamodb, TABLES } = require('../config/dynamodb');

// Table definitions
const tableDefinitions = [
    {
        TableName: TABLES.USERS,
        KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'userId', AttributeType: 'S' },
            { AttributeName: 'userType', AttributeType: 'S' },
            { AttributeName: 'rollNumber', AttributeType: 'S' },
            { AttributeName: 'teacherId', AttributeType: 'S' },
            { AttributeName: 'adminId', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'userType-index',
                KeySchema: [{ AttributeName: 'userType', KeyType: 'HASH' }],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
            },
            {
                IndexName: 'rollNumber-index',
                KeySchema: [{ AttributeName: 'rollNumber', KeyType: 'HASH' }],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
            },
            {
                IndexName: 'teacherId-index',
                KeySchema: [{ AttributeName: 'teacherId', KeyType: 'HASH' }],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
            },
            {
                IndexName: 'adminId-index',
                KeySchema: [{ AttributeName: 'adminId', KeyType: 'HASH' }],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
            }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
        TableName: TABLES.STUDENTS,
        KeySchema: [
            { AttributeName: 'studentId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'studentId', AttributeType: 'S' },
            { AttributeName: 'rollNumber', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'rollNumber-index',
                KeySchema: [{ AttributeName: 'rollNumber', KeyType: 'HASH' }],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
            }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
        TableName: TABLES.TEACHERS,
        KeySchema: [
            { AttributeName: 'teacherId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'teacherId', AttributeType: 'S' }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
        TableName: TABLES.FEES,
        KeySchema: [
            { AttributeName: 'feeId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'feeId', AttributeType: 'S' },
            { AttributeName: 'studentId', AttributeType: 'S' },
            { AttributeName: 'dueDate', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'studentId-dueDate-index',
                KeySchema: [
                    { AttributeName: 'studentId', KeyType: 'HASH' },
                    { AttributeName: 'dueDate', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
            }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
        TableName: TABLES.FEE_STRUCTURE,
        KeySchema: [
            { AttributeName: 'feeStructureId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'feeStructureId', AttributeType: 'S' }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
        TableName: TABLES.EXAMS,
        KeySchema: [
            { AttributeName: 'examId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'examId', AttributeType: 'S' },
            { AttributeName: 'examDate', AttributeType: 'S' },
            { AttributeName: 'class', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'examDate-index',
                KeySchema: [{ AttributeName: 'examDate', KeyType: 'HASH' }],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
            },
            {
                IndexName: 'class-examDate-index',
                KeySchema: [
                    { AttributeName: 'class', KeyType: 'HASH' },
                    { AttributeName: 'examDate', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
            }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
        TableName: TABLES.EXAM_RESULTS,
        KeySchema: [
            { AttributeName: 'resultId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'resultId', AttributeType: 'S' },
            { AttributeName: 'studentId', AttributeType: 'S' },
            { AttributeName: 'examId', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'studentId-examId-index',
                KeySchema: [
                    { AttributeName: 'studentId', KeyType: 'HASH' },
                    { AttributeName: 'examId', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
            },
            {
                IndexName: 'examId-index',
                KeySchema: [{ AttributeName: 'examId', KeyType: 'HASH' }],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
            }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
        TableName: TABLES.HOLIDAYS,
        KeySchema: [
            { AttributeName: 'holidayId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'holidayId', AttributeType: 'S' },
            { AttributeName: 'holidayDate', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'holidayDate-index',
                KeySchema: [{ AttributeName: 'holidayDate', KeyType: 'HASH' }],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
            }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
        TableName: TABLES.MEDIA,
        KeySchema: [
            { AttributeName: 'mediaId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'mediaId', AttributeType: 'S' },
            { AttributeName: 'mediaType', AttributeType: 'S' },
            { AttributeName: 'uploadDate', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'mediaType-uploadDate-index',
                KeySchema: [
                    { AttributeName: 'mediaType', KeyType: 'HASH' },
                    { AttributeName: 'uploadDate', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
            }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
        TableName: TABLES.SCHOOL_INFO,
        KeySchema: [
            { AttributeName: 'infoId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'infoId', AttributeType: 'S' }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
        TableName: TABLES.NOTIFICATIONS,
        KeySchema: [
            { AttributeName: 'notificationId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'notificationId', AttributeType: 'S' },
            { AttributeName: 'studentId', AttributeType: 'S' },
            { AttributeName: 'sentDate', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'studentId-sentDate-index',
                KeySchema: [
                    { AttributeName: 'studentId', KeyType: 'HASH' },
                    { AttributeName: 'sentDate', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
            }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    }
];

async function createTable(tableDefinition) {
    try {
        console.log(`Creating table: ${tableDefinition.TableName}...`);
        await dynamodb.createTable(tableDefinition).promise();
        console.log(`✓ Table ${tableDefinition.TableName} created successfully`);

        // Wait for table to be active
        await dynamodb.waitFor('tableExists', { TableName: tableDefinition.TableName }).promise();
        console.log(`✓ Table ${tableDefinition.TableName} is now active`);
    } catch (error) {
        if (error.code === 'ResourceInUseException') {
            console.log(`⚠ Table ${tableDefinition.TableName} already exists`);
        } else {
            console.error(`✗ Error creating table ${tableDefinition.TableName}:`, error.message);
            throw error;
        }
    }
}

async function createAllTables() {
    console.log('Starting DynamoDB table creation...\n');

    for (const tableDef of tableDefinitions) {
        await createTable(tableDef);
        console.log('');
    }

    console.log('All tables created successfully!');
}

// Run if executed directly
if (require.main === module) {
    createAllTables()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { createAllTables };
