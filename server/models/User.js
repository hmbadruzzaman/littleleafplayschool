const { docClient, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

class UserModel {
    // Create a new user
    static async create(userData) {
        const userId = `USER#${uuidv4()}`;
        const user = {
            userId,
            ...userData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const params = {
            TableName: TABLES.USERS,
            Item: user
        };

        await docClient.put(params).promise();
        return user;
    }

    // Find user by userId
    static async findById(userId) {
        const params = {
            TableName: TABLES.USERS,
            Key: { userId }
        };

        const result = await docClient.get(params).promise();
        return result.Item;
    }

    // Find user by roll number (for students)
    static async findByRollNumber(rollNumber) {
        const params = {
            TableName: TABLES.USERS,
            IndexName: 'rollNumber-index',
            KeyConditionExpression: 'rollNumber = :rollNumber',
            ExpressionAttributeValues: {
                ':rollNumber': rollNumber
            }
        };

        const result = await docClient.query(params).promise();
        return result.Items[0];
    }

    // Find user by teacher ID
    static async findByTeacherId(teacherId) {
        const params = {
            TableName: TABLES.USERS,
            IndexName: 'teacherId-index',
            KeyConditionExpression: 'teacherId = :teacherId',
            ExpressionAttributeValues: {
                ':teacherId': teacherId
            }
        };

        const result = await docClient.query(params).promise();
        return result.Items[0];
    }

    // Find user by admin ID
    static async findByAdminId(adminId) {
        const params = {
            TableName: TABLES.USERS,
            IndexName: 'adminId-index',
            KeyConditionExpression: 'adminId = :adminId',
            ExpressionAttributeValues: {
                ':adminId': adminId
            }
        };

        const result = await docClient.query(params).promise();
        return result.Items[0];
    }

    // Get all users by type
    static async findByType(userType) {
        const params = {
            TableName: TABLES.USERS,
            IndexName: 'userType-index',
            KeyConditionExpression: 'userType = :userType',
            ExpressionAttributeValues: {
                ':userType': userType
            }
        };

        const result = await docClient.query(params).promise();
        return result.Items;
    }

    // Update user
    static async update(userId, updates) {
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
            TableName: TABLES.USERS,
            Key: { userId },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };

        const result = await docClient.update(params).promise();
        return result.Attributes;
    }

    // Delete user
    static async delete(userId) {
        const params = {
            TableName: TABLES.USERS,
            Key: { userId }
        };

        await docClient.delete(params).promise();
        return true;
    }
}

module.exports = UserModel;
