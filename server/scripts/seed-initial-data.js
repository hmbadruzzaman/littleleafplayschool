require('dotenv').config();
const { docClient, TABLES } = require('../config/dynamodb');
const bcrypt = require('bcryptjs');

// Configuration
const S3_BUCKET = 'little-leaf';
const S3_REGION = 'us-east-1';
const S3_FOLDER = 'little-leaf';

async function seedInitialData() {
    console.log('🌱 Starting initial data seeding...\n');

    try {
        // 1. Create Admin User
        console.log('1️⃣  Creating Admin User...');
        const adminPassword = await bcrypt.hash('password123', 10);

        const adminUser = {
            userId: 'USER#ADM001',
            userType: 'ADMIN',
            adminId: 'ADM001',
            name: 'Admin User',
            email: 'admin@littleleaf.com',
            phone: '+91 9876543210',
            password: adminPassword,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await docClient.put({
            TableName: TABLES.USERS,
            Item: adminUser
        }).promise();

        console.log('   ✓ Admin user created: ADM001 / password123\n');

        // 2. Create School Info
        console.log('2️⃣  Creating School Information...');

        const schoolInfo = {
            infoId: 'INFO#SCHOOL',
            schoolName: 'Little Leaf Play School',
            principalName: 'Mr. H M Kamruzzaman',
            address: 'Malda, Kaliachak, India, 732201',
            phone: '+91 94763 74336',
            email: 'info@littleleafplayschool.com',
            website: 'www.littleleafplayschool.com',
            foundedYear: '2024',
            description: 'A nurturing environment for early childhood education, focusing on holistic development through play-based learning.',
            timings: 'Monday to Friday: 8:00 AM - 1:00 PM',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await docClient.put({
            TableName: TABLES.SCHOOL_INFO,
            Item: schoolInfo
        }).promise();

        console.log('   ✓ School information created\n');

        // 3. Add Gallery Images from S3
        console.log('3️⃣  Adding Gallery Images...');

        const galleryImages = [
            { filename: '482024118_641595932159568_5057828958709864332_n.jpg', title: 'Outdoor Play Area' },
            { filename: '482024265_641595928826235_8125155493632326882_n.jpg', title: 'Classroom Activities' },
            { filename: '482067740_641595915492903_1953693062293513613_n.jpg', title: 'Learning Environment' },
            { filename: '482082436_641595982159563_8267125933264029169_n.jpg', title: 'Creative Time' },
            { filename: '482090265_641595978826230_7359524071867668165_n.jpg', title: 'Group Activities' },
            { filename: '482261091_641595918826236_2992859999859394635_n.jpg', title: 'Reading Corner' },
            { filename: '482265668_641595925492902_3651867664789093166_n.jpg', title: 'Art and Craft' },
            { filename: '482291062_641595912159570_4902287607869326104_n.jpg', title: 'Music Session' },
            { filename: '482381264_641595908826237_8935039094265267577_n.jpg', title: 'Play Time' },
            { filename: '482555661_641595895492905_5723863726318084265_n.jpg', title: 'Story Time' },
            { filename: '483097621_641595902159571_4875827341113089493_n.jpg', title: 'Learning Through Play' },
            { filename: '490284491_669740879345073_9063446704213731051_n.jpg', title: 'Outdoor Fun' },
            { filename: '490299260_669740882678406_4988606562949644803_n.jpg', title: 'Garden Activities' },
            { filename: '490334084_669740886011739_2095733651046851634_n.jpg', title: 'Nature Exploration' },
            { filename: '490392479_669740889345072_7961606768014054074_n.jpg', title: 'Sports Day' },
            { filename: '490537398_669740892678405_6659831967125892931_n.jpg', title: 'Physical Activities' },
            { filename: '490573717_669740896011738_7085267569654734076_n.jpg', title: 'Team Games' },
            { filename: '490652959_669740899345071_5988092859652639091_n.jpg', title: 'Circle Time' },
            { filename: '490821848_669740872678407_6959652085089653838_n.jpg', title: 'Indoor Activities' },
            { filename: '491023056_669740876011740_6736039090046009673_n.jpg', title: 'Learning Station' },
            { filename: '491251729_669740869345074_3116485850612870651_n.jpg', title: 'Classroom Fun' },
            { filename: '491279082_669740902678404_3353732730394253050_n.jpg', title: 'Creative Corner' },
            { filename: '491292926_669740906011737_6088098518098154783_n.jpg', title: 'Happy Learning' }
        ];

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
        console.log('   • Admin User: 1 (ADM001 / password123)');
        console.log('   • School Info: 1 record');
        console.log(`   • Gallery Images: ${imageCount} photos`);
        console.log('\n✅ Initial data seeding completed successfully!');
        console.log('\n🔑 Login Credentials:');
        console.log('   URL: http://localhost:3000/login');
        console.log('   ID: ADM001');
        console.log('   Password: password123');

    } catch (error) {
        console.error('❌ Error seeding initial data:', error);
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    seedInitialData()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { seedInitialData };
