const { docClient, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

class ExamModel {
    static async create(examData) {
        const examId = `EXAM#${uuidv4()}`;
        const exam = {
            examId,
            ...examData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await docClient.put({ TableName: TABLES.EXAMS, Item: exam }).promise();
        return exam;
    }

    static async findById(examId) {
        const result = await docClient.get({
            TableName: TABLES.EXAMS,
            Key: { examId }
        }).promise();
        return result.Item;
    }

    static async getByClass(className) {
        const params = {
            TableName: TABLES.EXAMS,
            IndexName: 'class-examDate-index',
            KeyConditionExpression: '#class = :class',
            ExpressionAttributeNames: { '#class': 'class' },
            ExpressionAttributeValues: { ':class': className },
            ScanIndexForward: false
        };

        const result = await docClient.query(params).promise();
        return result.Items;
    }

    static async getUpcoming(className) {
        const today = new Date().toISOString().split('T')[0];
        const params = {
            TableName: TABLES.EXAMS,
            IndexName: 'class-examDate-index',
            KeyConditionExpression: '#class = :class AND examDate >= :today',
            ExpressionAttributeNames: { '#class': 'class' },
            ExpressionAttributeValues: {
                ':class': className,
                ':today': today
            }
        };

        const result = await docClient.query(params).promise();
        return result.Items;
    }

    static async getAll() {
        const result = await docClient.scan({ TableName: TABLES.EXAMS }).promise();
        return result.Items;
    }

    static async update(examId, updates) {
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
            TableName: TABLES.EXAMS,
            Key: { examId },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };

        const result = await docClient.update(params).promise();
        return result.Attributes;
    }

    static async delete(examId) {
        await docClient.delete({
            TableName: TABLES.EXAMS,
            Key: { examId }
        }).promise();
        return true;
    }
}

module.exports = ExamModel;
