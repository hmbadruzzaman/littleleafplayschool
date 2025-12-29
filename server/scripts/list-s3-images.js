const AWS = require('aws-sdk');

/**
 * Helper script to list all images in your S3 bucket
 * This will help you generate the IMAGE_FILES array for add-gallery-images.js
 * 
 * Usage: node scripts/list-s3-images.js YOUR_BUCKET_NAME
 */

const bucketName = process.argv[2];

if (!bucketName) {
    console.error('❌ Error: Please provide bucket name');
    console.log('\nUsage: node scripts/list-s3-images.js YOUR_BUCKET_NAME');
    console.log('Example: node scripts/list-s3-images.js littleleaf-playschool-media\n');
    process.exit(1);
}

// Configure AWS
AWS.config.update({
    region: process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();

async function listImages() {
    console.log(`📂 Listing images in bucket: ${bucketName}\n`);

    try {
        const data = await s3.listObjectsV2({
            Bucket: bucketName,
            MaxKeys: 1000
        }).promise();

        if (!data.Contents || data.Contents.length === 0) {
            console.log('⚠️  No files found in bucket');
            return;
        }

        // Filter for image files
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.JPG', '.JPEG', '.PNG'];
        const images = data.Contents.filter(obj => 
            imageExtensions.some(ext => obj.Key.endsWith(ext))
        );

        console.log(`Found ${images.length} images:\n`);

        // Generate JavaScript array format
        console.log('const IMAGE_FILES = [');
        images.forEach((img, index) => {
            const comma = index < images.length - 1 ? ',' : '';
            console.log(`    '${img.Key}'${comma}`);
        });
        console.log('];');

        console.log('\n' + '='.repeat(60));
        console.log('✅ Copy the array above and paste it into add-gallery-images.js');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Error listing S3 objects:', error.message);
        
        if (error.code === 'NoSuchBucket') {
            console.log('\n💡 Tip: Check that the bucket name is correct');
        } else if (error.code === 'AccessDenied') {
            console.log('\n💡 Tip: Check AWS credentials have S3 read permissions');
        }
    }
}

listImages();
