const AWS = require('aws-sdk');

/**
 * Script to check S3 bucket CORS configuration
 * Usage: node scripts/check-s3-cors.js
 */

AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();
const bucketName = 'little-leaf';

async function checkCORS() {
    console.log(`\n📋 Checking CORS configuration for bucket: ${bucketName}\n`);

    try {
        const cors = await s3.getBucketCors({ Bucket: bucketName }).promise();

        console.log('✅ CORS Configuration found:');
        console.log(JSON.stringify(cors.CORSRules, null, 2));

        // Validate CORS rules
        const hasGetMethod = cors.CORSRules.some(rule =>
            rule.AllowedMethods.includes('GET')
        );
        const hasWildcardOrigin = cors.CORSRules.some(rule =>
            rule.AllowedOrigins.includes('*')
        );

        console.log('\n✅ Validation:');
        console.log(`   GET method allowed: ${hasGetMethod ? '✓' : '✗'}`);
        console.log(`   Wildcard origin (*): ${hasWildcardOrigin ? '✓' : '✗'}`);

        if (!hasGetMethod || !hasWildcardOrigin) {
            console.log('\n⚠️  Warning: CORS may not be configured correctly for image loading');
        }

    } catch (error) {
        if (error.code === 'NoSuchCORSConfiguration') {
            console.log('❌ No CORS configuration found!');
            console.log('\nYou need to add CORS configuration in S3 Console:');
            console.log('1. Go to S3 → little-leaf → Permissions');
            console.log('2. Scroll to "Cross-origin resource sharing (CORS)"');
            console.log('3. Add the CORS policy\n');
        } else {
            console.error('❌ Error checking CORS:', error.message);
        }
    }

    // Check bucket policy
    console.log('\n📋 Checking Bucket Policy...\n');
    try {
        const policy = await s3.getBucketPolicy({ Bucket: bucketName }).promise();
        const policyObj = JSON.parse(policy.Policy);

        console.log('✅ Bucket Policy found:');
        console.log(JSON.stringify(policyObj, null, 2));

    } catch (error) {
        if (error.code === 'NoSuchBucketPolicy') {
            console.log('❌ No bucket policy found!');
            console.log('You need to add public read policy in S3 Console\n');
        } else {
            console.error('❌ Error checking bucket policy:', error.message);
        }
    }
}

checkCORS();
