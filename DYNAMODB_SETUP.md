# DynamoDB Setup Guide

This guide explains how to create all required DynamoDB tables for the Little Leaf Play School Management System.

## Prerequisites

1. **AWS Account**: You need an active AWS account
2. **AWS Credentials**: Configure your AWS credentials with appropriate permissions
3. **Environment Variables**: Set up your `.env` file in the `server` directory

## Environment Configuration

Create a `.env` file in the `server` directory with the following variables:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key

# Database Mode (set to 'false' to use AWS DynamoDB)
USE_LOCAL_DB=false

# Server Configuration
PORT=5001
```

## Tables to be Created

The script will create the following 12 DynamoDB tables:

1. **LittleLeaf_Users** - User accounts (students, teachers, admins)
2. **LittleLeaf_Students** - Student information
3. **LittleLeaf_Teachers** - Teacher information
4. **LittleLeaf_Fees** - Fee payment records
5. **LittleLeaf_FeeStructure** - Fee structure configuration
6. **LittleLeaf_Exams** - Exam information
7. **LittleLeaf_ExamResults** - Student exam results
8. **LittleLeaf_Holidays** - Holiday calendar
9. **LittleLeaf_Media** - Gallery photos and videos
10. **LittleLeaf_SchoolInfo** - School information
11. **LittleLeaf_Notifications** - System notifications
12. **LittleLeaf_Inquiries** - Admission inquiries

## Creating Tables

### Step 1: Navigate to Server Directory

```bash
cd server
```

### Step 2: Install Dependencies (if not already done)

```bash
npm install
```

### Step 3: Run the Table Creation Script

```bash
node scripts/create-tables.js
```

### Expected Output

```
Starting DynamoDB table creation...

Creating table: LittleLeaf_Users...
✓ Table LittleLeaf_Users created successfully
✓ Table LittleLeaf_Users is now active

Creating table: LittleLeaf_Students...
✓ Table LittleLeaf_Students created successfully
✓ Table LittleLeaf_Students is now active

... (continues for all 12 tables)

All tables created successfully!
```

## Table Details

### Primary Keys and Indexes

Each table has been configured with:
- **Primary Key**: Unique identifier for each record
- **Global Secondary Indexes (GSI)**: For efficient querying by different attributes

#### Example: Inquiries Table
- **Primary Key**: `inquiryId`
- **GSI**: `status-submittedAt-index` (for filtering by status and sorting by submission date)

### Capacity Units

All tables are configured with:
- **Read Capacity Units**: 5
- **Write Capacity Units**: 5

These are provisioned capacity units suitable for development and small-scale production use.

## Cost Estimation

With the current configuration (5 RCU, 5 WCU per table):
- **Estimated Monthly Cost**: $3-5 USD for all 12 tables
- **Free Tier**: AWS Free Tier includes 25 GB storage and 25 RCU/WCU, which may cover your usage

## Verifying Table Creation

### Option 1: AWS Console
1. Go to [AWS DynamoDB Console](https://console.aws.amazon.com/dynamodb)
2. Select your region (e.g., us-east-1)
3. Click "Tables" in the left sidebar
4. You should see all 12 tables prefixed with `LittleLeaf_`

### Option 2: AWS CLI
```bash
aws dynamodb list-tables --region us-east-1
```

### Option 3: Check Specific Table
```bash
aws dynamodb describe-table --table-name LittleLeaf_Users --region us-east-1
```

## Troubleshooting

### Error: "ResourceInUseException"
**Meaning**: Table already exists
**Action**: This is normal if you've run the script before. The script will skip existing tables.

### Error: "UnrecognizedClientException"
**Meaning**: AWS credentials are incorrect or not configured
**Action**:
- Check your `.env` file
- Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
- Ensure credentials have DynamoDB permissions

### Error: "AccessDeniedException"
**Meaning**: Your IAM user/role doesn't have permission to create tables
**Action**: Ensure your IAM user has the following permissions:
- `dynamodb:CreateTable`
- `dynamodb:DescribeTable`

### Error: "LimitExceededException"
**Meaning**: You've exceeded your AWS account limits for DynamoDB tables
**Action**:
- Delete unused tables
- Request limit increase from AWS Support

## Next Steps

After creating tables, you can:

1. **Create Admin User**: Run the seed-admin.js script to create your first admin account
   ```bash
   node scripts/seed-admin.js
   ```

2. **Add School Information**: Use the admin dashboard to add school details

3. **Start the Server**:
   ```bash
   npm run dev
   ```

## Deleting Tables (Cleanup)

To delete all tables (use with caution):

```bash
# Delete individual table
aws dynamodb delete-table --table-name LittleLeaf_Users --region us-east-1

# Or create a cleanup script
node scripts/delete-tables.js  # (if you create one)
```

## Switching Between Local and AWS Database

### Use Local In-Memory Database (Development)
```env
USE_LOCAL_DB=true
```

### Use AWS DynamoDB (Production)
```env
USE_LOCAL_DB=false
```

## Important Notes

1. **No Dummy Data**: The create-tables.js script only creates empty tables. It does NOT add any dummy data.

2. **Schema Changes**: If you need to modify table schema:
   - DynamoDB doesn't support direct schema changes
   - You'll need to create new tables or add GSIs

3. **Backups**: Consider enabling Point-in-Time Recovery (PITR) for production:
   - Go to DynamoDB Console → Table → Backups → Enable PITR

4. **Cost Monitoring**: Set up AWS Budgets to monitor DynamoDB costs:
   - AWS Console → Billing → Budgets

## Support

For issues or questions:
- Check AWS DynamoDB documentation: https://docs.aws.amazon.com/dynamodb/
- Review error logs in the console
- Verify IAM permissions
