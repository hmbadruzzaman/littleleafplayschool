const { docClient, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

class ExpenditureModel {
    // Create a new expenditure record
    static async create(expenditureData) {
        const expenditureId = `EXP#${uuidv4()}`;
        const expenditure = {
            expenditureId,
            ...expenditureData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const params = {
            TableName: TABLES.EXPENDITURES,
            Item: expenditure
        };

        await docClient.put(params).promise();
        return expenditure;
    }

    // Get all expenditures
    static async getAll() {
        const params = {
            TableName: TABLES.EXPENDITURES
        };

        const result = await docClient.scan(params).promise();
        return result.Items;
    }

    // Get expenditures by date range
    static async getByDateRange(startDate, endDate) {
        const params = {
            TableName: TABLES.EXPENDITURES,
            FilterExpression: '#date BETWEEN :startDate AND :endDate',
            ExpressionAttributeNames: {
                '#date': 'date'
            },
            ExpressionAttributeValues: {
                ':startDate': startDate,
                ':endDate': endDate
            }
        };

        const result = await docClient.scan(params).promise();
        return result.Items;
    }

    // Get expenditure report
    static async getExpenditureReport(startDate, endDate) {
        const params = {
            TableName: TABLES.EXPENDITURES,
            FilterExpression: '#date BETWEEN :startDate AND :endDate',
            ExpressionAttributeNames: {
                '#date': 'date'
            },
            ExpressionAttributeValues: {
                ':startDate': startDate,
                ':endDate': endDate
            }
        };

        const result = await docClient.scan(params).promise();

        const report = {
            totalExpenditure: 0,
            salaryExpenses: 0,
            infrastructureExpenses: 0,
            utilitiesExpenses: 0,
            suppliesExpenses: 0,
            maintenanceExpenses: 0,
            miscExpenses: 0,
            transactionCount: result.Items.length,
            expenditures: result.Items
        };

        result.Items.forEach(exp => {
            const amount = parseFloat(exp.amount) || 0;
            report.totalExpenditure += amount;

            switch(exp.expenseType) {
                case 'SALARY':
                    report.salaryExpenses += amount;
                    break;
                case 'INFRASTRUCTURE':
                    report.infrastructureExpenses += amount;
                    break;
                case 'UTILITIES':
                    report.utilitiesExpenses += amount;
                    break;
                case 'SUPPLIES':
                    report.suppliesExpenses += amount;
                    break;
                case 'MAINTENANCE':
                    report.maintenanceExpenses += amount;
                    break;
                case 'MISC':
                    report.miscExpenses += amount;
                    break;
            }
        });

        return report;
    }

    // Update expenditure
    static async update(expenditureId, updates) {
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
            TableName: TABLES.EXPENDITURES,
            Key: { expenditureId },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };

        const result = await docClient.update(params).promise();
        return result.Attributes;
    }

    // Delete expenditure
    static async delete(expenditureId) {
        const params = {
            TableName: TABLES.EXPENDITURES,
            Key: { expenditureId }
        };

        await docClient.delete(params).promise();
        return { expenditureId };
    }
}

module.exports = ExpenditureModel;
