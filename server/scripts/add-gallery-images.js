const { docClient, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

/**
 * Script to add gallery images from S3 to DynamoDB MEDIA table
 * 
 * INSTRUCTIONS:
 * 1. Update the S3_BUCKET_NAME with your bucket name
 * 2. Update the IMAGE_FILES array with your 24 image filenames
 * 3. Run: node scripts/add-gallery-images.js
 */

// TODO: Replace with your S3 bucket name
const S3_BUCKET_NAME = 'your-bucket-name';

// TODO: Replace with your actual image filenames (24 images)
const IMAGE_FILES = [
    'image1.jpg',
    'image2.jpg',
    'image3.jpg',
    'image4.jpg',
    'image5.jpg',
    'image6.jpg',
    'image7.jpg',
    'image8.jpg',
    'image9.jpg',
    'image10.jpg',
    'image11.jpg',
    'image12.jpg',
    'image13.jpg',
    'image14.jpg',
    'image15.jpg',
    'image16.jpg',
    'image17.jpg',
    'image18.jpg',
    'image19.jpg',
    'image20.jpg',
    'image21.jpg',
    'image22.jpg',
    'image23.jpg',
    'image24.jpg'
];

async function addGalleryImages() {
    console.log('🖼️  Adding Gallery Images to DynamoDB...\n');

    const uploadDate = new Date().toISOString();
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < IMAGE_FILES.length; i++) {
        const filename = IMAGE_FILES[i];
        const mediaId = `MEDIA#${uuidv4()}`;
        
        // Construct S3 URL
        const s3Url = `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${filename}`;

        const mediaItem = {
            mediaId,
            mediaType: 'PHOTO',
            title: `Gallery Image ${i + 1}`,
            description: `School gallery photo ${i + 1}`,
            s3Url,
            thumbnailUrl: s3Url, // Same as original for now
            s3Key: filename,
            s3Bucket: S3_BUCKET_NAME,
            isPublic: true, // Make visible on landing page
            uploadDate,
            uploadedBy: 'ADMIN',
            category: 'GENERAL', // No specific category
            tags: ['school', 'gallery'],
            createdAt: uploadDate,
            updatedAt: uploadDate
        };

        try {
            await docClient.put({
                TableName: TABLES.MEDIA,
                Item: mediaItem
            }).promise();

            console.log(`✅ Added: ${filename}`);
            successCount++;
        } catch (error) {
            console.error(`❌ Failed to add ${filename}:`, error.message);
            errorCount++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Successfully added: ${successCount} images`);
    if (errorCount > 0) {
        console.log(`❌ Failed: ${errorCount} images`);
    }
    console.log('='.repeat(50));
}

// Run if executed directly
if (require.main === module) {
    addGalleryImages()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { addGalleryImages };
