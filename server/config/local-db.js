// In-memory database for local development (no AWS required)
// This simulates DynamoDB tables using JavaScript objects

const inMemoryDB = {
    users: new Map(),
    students: new Map(),
    teachers: new Map(),
    fees: new Map(),
    feeStructure: new Map(),
    exams: new Map(),
    examResults: new Map(),
    holidays: new Map(),
    media: new Map(),
    schoolInfo: new Map(),
    notifications: new Map(),
    expenditures: new Map()
};

// Table name mapping
const TABLES = {
    USERS: 'users',
    STUDENTS: 'students',
    TEACHERS: 'teachers',
    FEES: 'fees',
    FEE_STRUCTURE: 'feeStructure',
    EXAMS: 'exams',
    EXAM_RESULTS: 'examResults',
    HOLIDAYS: 'holidays',
    MEDIA: 'media',
    SCHOOL_INFO: 'schoolInfo',
    NOTIFICATIONS: 'notifications',
    EXPENDITURES: 'expenditures'
};

// Simulated DynamoDB DocumentClient
class LocalDocClient {
    put(params) {
        return {
            promise: async () => {
                const table = inMemoryDB[params.TableName];
                const item = params.Item;

                // Determine the key based on table
                let key;
                if (item.userId) key = item.userId;
                else if (item.studentId) key = item.studentId;
                else if (item.teacherId) key = item.teacherId;
                else if (item.feeId) key = item.feeId;
                else if (item.feeStructureId) key = item.feeStructureId;
                else if (item.examId) key = item.examId;
                else if (item.resultId) key = item.resultId;
                else if (item.holidayId) key = item.holidayId;
                else if (item.mediaId) key = item.mediaId;
                else if (item.infoId) key = item.infoId;
                else if (item.notificationId) key = item.notificationId;
                else if (item.expenditureId) key = item.expenditureId;

                table.set(key, item);
                return { Attributes: item };
            }
        };
    }

    get(params) {
        return {
            promise: async () => {
                const table = inMemoryDB[params.TableName];
                const keyValue = Object.values(params.Key)[0];
                const item = table.get(keyValue);
                return { Item: item };
            }
        };
    }

    query(params) {
        return {
            promise: async () => {
                const table = inMemoryDB[params.TableName];
                let items = Array.from(table.values());

                // Simple filtering based on KeyConditionExpression
                if (params.KeyConditionExpression) {
                    const expression = params.KeyConditionExpression;
                    const values = params.ExpressionAttributeValues;

                    items = items.filter(item => {
                        // Parse simple expressions like "userType = :userType"
                        for (const [, value] of Object.entries(values)) {
                            const field = expression.split('=')[0].trim().replace('#', '');
                            if (item[field] !== value) return false;
                        }
                        return true;
                    });
                }

                // Apply FilterExpression
                if (params.FilterExpression) {
                    const values = params.ExpressionAttributeValues;
                    items = items.filter(item => {
                        for (const [, value] of Object.entries(values)) {
                            const field = Object.keys(values)[0].replace(':', '');
                            if (params.FilterExpression.includes('>=') || params.FilterExpression.includes('BETWEEN')) {
                                // Simple date comparison
                                continue;
                            }
                            if (item[field] !== value) return false;
                        }
                        return true;
                    });
                }

                return { Items: items };
            }
        };
    }

    scan(params) {
        return {
            promise: async () => {
                const table = inMemoryDB[params.TableName];
                let items = Array.from(table.values());

                // Apply FilterExpression
                if (params.FilterExpression) {
                    const values = params.ExpressionAttributeValues || {};
                    const names = params.ExpressionAttributeNames || {};

                    items = items.filter(item => {
                        for (const [, value] of Object.entries(values)) {
                            const field = Object.keys(values)[0].replace(':', '');
                            const actualField = names[`#${field}`] || field;

                            if (params.FilterExpression.includes('>=')) {
                                if (!(item[actualField] >= value)) return false;
                            } else if (params.FilterExpression.includes('=')) {
                                if (item[actualField] !== value) return false;
                            }
                        }
                        return true;
                    });
                }

                return {
                    Items: items,
                    Count: items.length
                };
            }
        };
    }

    update(params) {
        return {
            promise: async () => {
                const table = inMemoryDB[params.TableName];
                const keyValue = Object.values(params.Key)[0];
                const item = table.get(keyValue);

                if (!item) {
                    throw new Error('Item not found');
                }

                // Apply updates
                const values = params.ExpressionAttributeValues;
                const names = params.ExpressionAttributeNames || {};

                for (const [placeholder, value] of Object.entries(values)) {
                    const field = placeholder.replace(':', '');
                    const actualField = names[`#${field}`] || field;
                    item[actualField] = value;
                }

                table.set(keyValue, item);
                return { Attributes: item };
            }
        };
    }

    delete(params) {
        return {
            promise: async () => {
                const table = inMemoryDB[params.TableName];
                const keyValue = Object.values(params.Key)[0];
                table.delete(keyValue);
                return {};
            }
        };
    }
}

// Mock DynamoDB for table creation (no-op)
const dynamodb = {
    createTable: () => ({
        promise: () => Promise.resolve({ TableDescription: { TableStatus: 'ACTIVE' } })
    }),
    waitFor: () => ({
        promise: () => Promise.resolve()
    })
};

const docClient = new LocalDocClient();

module.exports = {
    dynamodb,
    docClient,
    TABLES,
    // Export for testing/debugging
    getInMemoryDB: () => inMemoryDB,
    clearInMemoryDB: () => {
        Object.values(inMemoryDB).forEach(table => table.clear());
    }
};
