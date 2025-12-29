const { docClient, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

class TeacherModel {
    static async create(teacherData) {
        const teacherId = `TCH#${uuidv4()}`;
        const teacher = {
            teacherId,
            ...teacherData,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await docClient.put({ TableName: TABLES.TEACHERS, Item: teacher }).promise();
        return teacher;
    }

    static async findById(teacherId) {
        const result = await docClient.get({
            TableName: TABLES.TEACHERS,
            Key: { teacherId }
        }).promise();
        return result.Item;
    }

    static async getAll() {
        const result = await docClient.scan({ TableName: TABLES.TEACHERS }).promise();
        return result.Items;
    }

    static async getActive() {
        const params = {
            TableName: TABLES.TEACHERS,
            FilterExpression: '#status = :status',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':status': 'ACTIVE' }
        };

        const result = await docClient.scan(params).promise();
        return result.Items;
    }

    static async update(teacherId, updates) {
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
            TableName: TABLES.TEACHERS,
            Key: { teacherId },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };

        const result = await docClient.update(params).promise();
        return result.Attributes;
    }

    static async delete(teacherId) {
        return await this.update(teacherId, { status: 'INACTIVE' });
    }

    static async getCount() {
        const params = {
            TableName: TABLES.TEACHERS,
            Select: 'COUNT',
            FilterExpression: '#status = :status',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':status': 'ACTIVE' }
        };

        const result = await docClient.scan(params).promise();
        return result.Count;
    }
}

module.exports = TeacherModel;
