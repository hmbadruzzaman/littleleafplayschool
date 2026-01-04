const { docClient, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

class StudentModel {
    // Create a new student
    static async create(studentData) {
        const studentId = `STU#${uuidv4()}`;
        const student = {
            studentId,
            ...studentData,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const params = {
            TableName: TABLES.STUDENTS,
            Item: student
        };

        await docClient.put(params).promise();
        return student;
    }

    // Find student by ID
    static async findById(studentId) {
        const params = {
            TableName: TABLES.STUDENTS,
            Key: { studentId }
        };

        const result = await docClient.get(params).promise();
        return result.Item;
    }

    // Find student by roll number
    static async findByRollNumber(rollNumber) {
        const params = {
            TableName: TABLES.STUDENTS,
            IndexName: 'rollNumber-index',
            KeyConditionExpression: 'rollNumber = :rollNumber',
            ExpressionAttributeValues: {
                ':rollNumber': rollNumber
            }
        };

        const result = await docClient.query(params).promise();
        return result.Items[0];
    }

    // Get all students
    static async getAll() {
        const params = {
            TableName: TABLES.STUDENTS
        };

        const result = await docClient.scan(params).promise();
        return result.Items;
    }

    // Get students by class
    static async getByClass(className) {
        const params = {
            TableName: TABLES.STUDENTS,
            FilterExpression: '#class = :class AND #status = :status',
            ExpressionAttributeNames: {
                '#class': 'class',
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':class': className,
                ':status': 'ACTIVE'
            }
        };

        const result = await docClient.scan(params).promise();
        return result.Items;
    }

    // Update student
    static async update(studentId, updates) {
        console.log('=== Student.update() DEBUG ===');
        console.log('Received studentId:', studentId);
        console.log('Received updates:', updates);

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
            TableName: TABLES.STUDENTS,
            Key: { studentId },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };

        console.log('DynamoDB update params:', JSON.stringify(params, null, 2));

        const result = await docClient.update(params).promise();
        console.log('DynamoDB update result:', JSON.stringify(result, null, 2));
        return result.Attributes;
    }

    // Delete student (soft delete by setting status to INACTIVE)
    static async delete(studentId) {
        return await this.update(studentId, { status: 'INACTIVE' });
    }

    // Get student count
    static async getCount() {
        const params = {
            TableName: TABLES.STUDENTS,
            Select: 'COUNT',
            FilterExpression: '#status = :status',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': 'ACTIVE'
            }
        };

        const result = await docClient.scan(params).promise();
        return result.Count;
    }
}

module.exports = StudentModel;
