require('dotenv').config();
const { docClient, TABLES } = require('../config/dynamodb');

// Default subject configurations for different exam types
const examSubjectConfigs = {
    'MONTHLY': [
        { name: 'English', maxMarks: '25' },
        { name: 'Mathematics', maxMarks: '25' },
        { name: 'General Knowledge', maxMarks: '20' },
        { name: 'Hindi', maxMarks: '20' },
        { name: 'Art & Craft', maxMarks: '10' }
    ],
    'QUARTERLY': [
        { name: 'English', maxMarks: '30' },
        { name: 'Mathematics', maxMarks: '30' },
        { name: 'General Knowledge', maxMarks: '20' },
        { name: 'Hindi', maxMarks: '20' }
    ],
    'HALF_YEARLY': [
        { name: 'English', maxMarks: '30' },
        { name: 'Mathematics', maxMarks: '30' },
        { name: 'General Knowledge', maxMarks: '20' },
        { name: 'Hindi', maxMarks: '20' }
    ],
    'ANNUAL': [
        { name: 'English', maxMarks: '30' },
        { name: 'Mathematics', maxMarks: '30' },
        { name: 'General Knowledge', maxMarks: '20' },
        { name: 'Hindi', maxMarks: '20' }
    ]
};

async function addSubjectsToExams() {
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║     Adding Subjects to Existing Exams        ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    try {
        // Get all exams
        console.log('1️⃣  Fetching all exams...');
        const result = await docClient.scan({ TableName: TABLES.EXAMS }).promise();
        const exams = result.Items;
        console.log(`   ✓ Found ${exams.length} exams\n`);

        let updatedCount = 0;
        let skippedCount = 0;

        console.log('2️⃣  Updating exams with subjects...');
        for (const exam of exams) {
            // Skip if exam already has subjects
            if (exam.subjects && exam.subjects.length > 0) {
                console.log(`   ⊘ Skipped: ${exam.examName} (already has subjects)`);
                skippedCount++;
                continue;
            }

            // Get default subjects based on exam type
            const subjects = examSubjectConfigs[exam.examType] || examSubjectConfigs['MONTHLY'];
            const totalMarks = subjects.reduce((sum, s) => sum + parseInt(s.maxMarks), 0);

            // Update exam with subjects
            await docClient.update({
                TableName: TABLES.EXAMS,
                Key: { examId: exam.examId },
                UpdateExpression: 'SET subjects = :subjects, totalMarks = :totalMarks, passingMarks = :passingMarks, updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                    ':subjects': subjects,
                    ':totalMarks': totalMarks,
                    ':passingMarks': Math.floor(totalMarks * 0.4),
                    ':updatedAt': new Date().toISOString()
                }
            }).promise();

            console.log(`   ✓ Updated: ${exam.examName} (${exam.examType}) - ${subjects.length} subjects`);
            updatedCount++;
        }

        console.log('');
        console.log('═'.repeat(48));
        console.log('\n✅ MIGRATION COMPLETED!\n');
        console.log('📊 Summary:');
        console.log(`   • Total Exams: ${exams.length}`);
        console.log(`   • Updated: ${updatedCount}`);
        console.log(`   • Skipped (already had subjects): ${skippedCount}`);
        console.log('');
        console.log('🚀 All exams now have subjects configured!\n');
        console.log('═'.repeat(48));

    } catch (error) {
        console.error('\n❌ Error updating exams:', error);
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    addSubjectsToExams()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { addSubjectsToExams };
