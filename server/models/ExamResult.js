const { docClient, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');
const { calculateGrade } = require('../utils/helpers');

class ExamResultModel {
    static async create(resultData) {
        const resultId = `RESULT#${uuidv4()}`;
        const percentage = (resultData.marksObtained / resultData.totalMarks) * 100;
        const grade = calculateGrade(percentage);

        const result = {
            resultId,
            ...resultData,
            percentage: parseFloat(percentage.toFixed(2)),
            grade,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await docClient.put({ TableName: TABLES.EXAM_RESULTS, Item: result }).promise();
        return result;
    }

    static async getByStudentId(studentId) {
        const params = {
            TableName: TABLES.EXAM_RESULTS,
            IndexName: 'studentId-examId-index',
            KeyConditionExpression: 'studentId = :studentId',
            ExpressionAttributeValues: { ':studentId': studentId }
        };

        const result = await docClient.query(params).promise();
        return result.Items;
    }

    static async getByExamId(examId) {
        const params = {
            TableName: TABLES.EXAM_RESULTS,
            IndexName: 'examId-index',
            KeyConditionExpression: 'examId = :examId',
            ExpressionAttributeValues: { ':examId': examId }
        };

        const result = await docClient.query(params).promise();
        return result.Items;
    }

    static async getByStudentAndExam(studentId, examId) {
        const params = {
            TableName: TABLES.EXAM_RESULTS,
            IndexName: 'studentId-examId-index',
            KeyConditionExpression: 'studentId = :studentId AND examId = :examId',
            ExpressionAttributeValues: {
                ':studentId': studentId,
                ':examId': examId
            }
        };

        const result = await docClient.query(params).promise();
        return result.Items[0];
    }

    static async update(resultId, updates) {
        if (updates.marksObtained && updates.totalMarks) {
            const percentage = (updates.marksObtained / updates.totalMarks) * 100;
            updates.percentage = parseFloat(percentage.toFixed(2));
            updates.grade = calculateGrade(percentage);
        }

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
            TableName: TABLES.EXAM_RESULTS,
            Key: { resultId },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };

        const result = await docClient.update(params).promise();
        return result.Attributes;
    }
}

module.exports = ExamResultModel;
