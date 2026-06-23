const { docClient, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

class FeeModel {
    // Create a new fee record
    static async create(feeData) {
        const feeId = `FEE#${uuidv4()}`;
        const fee = {
            feeId,
            ...feeData,
            paymentStatus: feeData.paymentStatus || 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const params = {
            TableName: TABLES.FEES,
            Item: fee
        };

        await docClient.put(params).promise();
        return fee;
    }

    // Get fees by student ID
    static async getByStudentId(studentId) {
        // Try query first (for AWS DynamoDB with index)
        // If it fails, fall back to scan (for local DB)
        try {
            const params = {
                TableName: TABLES.FEES,
                IndexName: 'studentId-dueDate-index',
                KeyConditionExpression: 'studentId = :studentId',
                ExpressionAttributeValues: {
                    ':studentId': studentId
                },
                ScanIndexForward: false
            };

            const result = await docClient.query(params).promise();
            return result.Items;
        } catch (error) {
            // Fallback to scan for local DB (no index support)
            const params = {
                TableName: TABLES.FEES,
                FilterExpression: 'studentId = :studentId',
                ExpressionAttributeValues: {
                    ':studentId': studentId
                }
            };

            const result = await docClient.scan(params).promise();
            return result.Items || [];
        }
    }

    // Get pending fees by student ID
    static async getPendingFees(studentId) {
        const params = {
            TableName: TABLES.FEES,
            IndexName: 'studentId-dueDate-index',
            KeyConditionExpression: 'studentId = :studentId',
            FilterExpression: 'paymentStatus = :status',
            ExpressionAttributeValues: {
                ':studentId': studentId,
                ':status': 'PENDING'
            }
        };

        const result = await docClient.query(params).promise();
        return result.Items;
    }

    // Get paid fees by student ID
    static async getPaidFees(studentId) {
        const params = {
            TableName: TABLES.FEES,
            IndexName: 'studentId-dueDate-index',
            KeyConditionExpression: 'studentId = :studentId',
            FilterExpression: 'paymentStatus = :status',
            ExpressionAttributeValues: {
                ':studentId': studentId,
                ':status': 'PAID'
            }
        };

        const result = await docClient.query(params).promise();
        return result.Items;
    }

    // Update fee (for payment)
    static async update(feeId, updates) {
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
            TableName: TABLES.FEES,
            Key: { feeId },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };

        const result = await docClient.update(params).promise();
        return result.Attributes;
    }

    // Delete a fee row by id
    static async delete(feeId) {
        await docClient.delete({
            TableName: TABLES.FEES,
            Key: { feeId }
        }).promise();
    }

    // Get all fees (for admin reports)
    static async getAll() {
        const params = {
            TableName: TABLES.FEES
        };

        const result = await docClient.scan(params).promise();
        return result.Items;
    }

    // Get earnings report
    static async getEarningsReport(startDate, endDate) {
        // Scan the whole table and filter in JS. We deliberately avoid a
        // FilterExpression: the local-DB shim only understands single-condition
        // expressions, and we need to count money actually received — every fee with
        // a paymentDate in range whose status is PAID or PENDING. Partial Quick Pay
        // payments are stored PENDING (so their balance stays visible) but still carry
        // a paymentDate, so they count as income; unpaid PENDING/OVERDUE dues have no
        // paymentDate and are excluded.
        const scanResult = await docClient.scan({ TableName: TABLES.FEES }).promise();
        const receivedStatuses = new Set(['PAID', 'PENDING']);
        const items = (scanResult.Items || []).filter(fee =>
            fee.paymentDate &&
            fee.paymentDate >= startDate &&
            fee.paymentDate <= endDate &&
            receivedStatuses.has(fee.paymentStatus)
        );
        const result = { Items: items };

        const report = {
            totalEarnings: 0,
            admissionFees: 0,
            monthlyFees: 0,
            transportFees: 0,
            annualFees: 0,
            examFees: 0,
            miscFees: 0,
            transactionCount: result.Items.length,
            byMonth: {},
            byFeeType: {},
            fees: result.Items
        };

        result.Items.forEach(fee => {
            const amount = parseFloat(fee.amount) || 0;
            report.totalEarnings += amount;

            // By fee type
            switch(fee.feeType) {
                case 'ADMISSION_FEE':
                    report.admissionFees += amount;
                    break;
                case 'MONTHLY_FEE':
                    report.monthlyFees += amount;
                    break;
                case 'TRANSPORT_FEE':
                    report.transportFees += amount;
                    break;
                case 'ANNUAL_FEE':
                    report.annualFees += amount;
                    break;
                case 'EXAM_FEE':
                    report.examFees += amount;
                    break;
                case 'MISC':
                    report.miscFees += amount;
                    break;
                default:
                    report.miscFees += amount;
            }

            // Count by fee type
            report.byFeeType[fee.feeType] = (report.byFeeType[fee.feeType] || 0) + 1;

            // By month (for chart data)
            if (fee.paymentDate) {
                const monthKey = fee.paymentDate.substring(0, 7); // YYYY-MM
                report.byMonth[monthKey] = (report.byMonth[monthKey] || 0) + amount;
            }
        });

        return report;
    }
}

module.exports = FeeModel;
