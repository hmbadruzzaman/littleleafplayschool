require('dotenv').config();
const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB();
const TABLE_NAME = 'LittleLeaf_Expenditures';

async function createExpendituresTable() {
    console.log('🔍 Checking if LittleLeaf_Expenditures table exists...\n');

    try {
        // Check if table exists
        const existingTables = await dynamodb.listTables().promise();

        if (existingTables.TableNames.includes(TABLE_NAME)) {
            console.log(`✅ Table "${TABLE_NAME}" already exists!\n`);

            // Describe the table
            const tableDescription = await dynamodb.describeTable({ TableName: TABLE_NAME }).promise();
            console.log('📊 Table Details:');
            console.log(`   Status: ${tableDescription.Table.TableStatus}`);
            console.log(`   Items: ${tableDescription.Table.ItemCount}`);
            console.log(`   Size: ${(tableDescription.Table.TableSizeBytes / 1024).toFixed(2)} KB\n`);

            return;
        }

        console.log(`📝 Table "${TABLE_NAME}" does not exist. Creating it...\n`);

        const params = {
            TableName: TABLE_NAME,
            KeySchema: [
                { AttributeName: 'expenditureId', KeyType: 'HASH' }  // Partition key
            ],
            AttributeDefinitions: [
                { AttributeName: 'expenditureId', AttributeType: 'S' }
            ],
            BillingMode: 'PAY_PER_REQUEST'  // On-demand billing
        };

        const result = await dynamodb.createTable(params).promise();

        console.log(`✅ Table "${TABLE_NAME}" created successfully!`);
        console.log(`   Status: ${result.TableDescription.TableStatus}`);
        console.log(`   ARN: ${result.TableDescription.TableArn}\n`);

        console.log('⏳ Waiting for table to become active...');

        // Wait for table to become active
        await dynamodb.waitFor('tableExists', { TableName: TABLE_NAME }).promise();

        console.log('✅ Table is now active and ready to use!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    createExpendituresTable()
        .then(() => {
            console.log('🎉 Done!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { createExpendituresTable };
