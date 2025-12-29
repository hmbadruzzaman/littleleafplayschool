const AWS = require('aws-sdk');

// Configure S3
const s3 = new AWS.S3({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const S3_BUCKET = process.env.S3_BUCKET_NAME || 'littleleaf-playschool-media';

module.exports = {
    s3,
    S3_BUCKET
};
