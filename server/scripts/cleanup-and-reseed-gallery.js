require('dotenv').config();
const { docClient, TABLES } = require('../config/dynamodb');

// S3 Configuration
const S3_BUCKET = 'little-leaf';
const S3_REGION = 'us-east-1';
const S3_FOLDER = 'little-leaf';

// Gallery images to keep
const galleryImages = [
    { filename: '482024118_641595932159568_5057828958709864332_n.jpg', title: 'Outdoor Play' },
    { filename: '488752846_666332839685877_5100881528460968927_n.jpg', title: 'Art & Craft' },
    { filename: '484647213_651967004455794_4891236331672288565_n.jpg', title: 'Music Class' },
    { filename: '482984368_647811638204664_1809616828097242959_n.jpg', title: 'Story Time' },
    { filename: '488860886_664489939870167_159869527106278868_n.jpg', title: 'Story Time' },
    { filename: '490284491_669740879345073_9063446704213731051_n.jpg', title: 'Writing Skills' },
    { filename: '498309359_698098083176019_4017212811704935595_n.jpg', title: 'Domino' },
    { filename: '575190124_847507738235052_2787003247675754461_n.jpg', title: 'Rock Climbing' },
    { filename: '577903510_847507661568393_6775151365504001435_n.jpg', title: 'Group Dance Time' },
    { filename: '588475239_864989829820176_583014678143335712_n.jpg', title: 'Game  Area' },
    { filename: '592899669_867235886262237_923506011769211655_n.jpg', title: 'Classroom' },
    { filename: '602014317_884987594487066_3264841948914476975_n.jpg', title: 'Group Activities' },
    { filename: '603782486_885845691067923_1104201118693561420_n.jpg', title: 'Yoga Session' },
    { filename: '582550974_854473637538462_2507455706788861389_n.jpg', title: 'Childrens day' },
    { filename: '533479426_775449852107508_6948868573039885579_n.jpg', title: 'Parents Visit' },
    { filename: '601976384_885845464401279_3542587321312513996_n.jpg', title: 'Drawing Class' },
    { filename: '604857421_885845797734579_8726563804733123317_n.jpg', title: 'Yoga Time' },
    { filename: '604648124_884987614487064_9086156736868569873_n.jpg', title: 'Annual Exam' },
    { filename: '592912116_868691749449984_3775227078397141494_n.jpg', title: 'Exercise' },
    { filename: '485080811_652731681045993_6873199319137558940_n.jpg', title: 'Cultural Program' },
    { filename: '601995981_884987557820403_7883252298860521952_n.jpg', title: 'Exam Time' },
    { filename: '581161430_854473690871790_3546726727841191247_n.jpg', title: 'Celebration Day' },
    { filename: '482322154_642774428708385_4231052374425887625_n.jpg', title: 'Graduation Day' }
];

async function cleanupAndReseedGallery() {
    console.log('🧹 Starting gallery cleanup and reseed...\n');

    try {
        // Step 1: Get all existing media items
        console.log('1️⃣  Fetching all existing media items...');
        const scanResult = await docClient.scan({
            TableName: TABLES.MEDIA
        }).promise();

        console.log(`   Found ${scanResult.Items.length} existing items\n`);

        // Step 2: Delete all existing items
        if (scanResult.Items.length > 0) {
            console.log('2️⃣  Deleting all existing media items...');

            for (const item of scanResult.Items) {
                await docClient.delete({
                    TableName: TABLES.MEDIA,
                    Key: { mediaId: item.mediaId }
                }).promise();
                console.log(`   ✓ Deleted: ${item.mediaId}`);
            }
            console.log(`\n   ✓ Total ${scanResult.Items.length} items deleted\n`);
        } else {
            console.log('2️⃣  No items to delete\n');
        }

        // Step 3: Add new gallery images
        console.log('3️⃣  Adding new gallery images...');

        let imageCount = 0;
        for (const image of galleryImages) {
            const mediaId = `MEDIA#${Date.now() + imageCount}`;
            const s3Url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${S3_FOLDER}/${image.filename}`;

            const mediaItem = {
                mediaId: mediaId,
                mediaType: 'PHOTO',
                category: 'SCHOOL_ACTIVITIES',
                title: image.title,
                description: `${image.title} at Little Leaf Play School`,
                s3Url: s3Url,
                thumbnailUrl: s3Url,
                uploadDate: new Date().toISOString(),
                uploadedBy: 'ADM001',
                isActive: true,
                createdAt: new Date().toISOString()
            };

            await docClient.put({
                TableName: TABLES.MEDIA,
                Item: mediaItem
            }).promise();

            imageCount++;
            console.log(`   ✓ Added: ${image.title}`);
        }

        console.log(`\n   ✓ Total ${imageCount} gallery images added\n`);

        // Summary
        console.log('📊 Summary:');
        console.log(`   • Deleted: ${scanResult.Items.length} old items`);
        console.log(`   • Added: ${imageCount} new gallery images`);
        console.log('\n✅ Gallery cleanup and reseed completed successfully!');

    } catch (error) {
        console.error('❌ Error during cleanup and reseed:', error);
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    cleanupAndReseedGallery()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { cleanupAndReseedGallery };
