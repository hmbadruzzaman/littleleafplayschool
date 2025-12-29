require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { docClient, TABLES } = require('../config/dynamodb');

// Dummy data
const classes = ['Pre-KG A', 'Pre-KG B', 'LKG A', 'LKG B', 'UKG A'];
const subjects = ['English', 'Mathematics', 'General Knowledge', 'Hindi', 'Art & Craft'];

const studentNames = [
    'Aarav Sharma', 'Vivaan Patel', 'Aditya Kumar', 'Vihaan Singh', 'Arjun Reddy',
    'Sai Gupta', 'Arnav Mehta', 'Ayaan Khan', 'Krishna Rao', 'Ishaan Verma',
    'Ananya Iyer', 'Diya Nair', 'Aadhya Joshi', 'Pihu Desai', 'Sara Ali',
    'Myra Bansal', 'Aanya Kapoor', 'Navya Malhotra', 'Ira Sinha', 'Kiara Agarwal',
    'Reyansh Bose', 'Advait Pillai', 'Kabir Chawla', 'Atharv Saxena', 'Shaurya Yadav'
];

const teacherNames = [
    { name: 'Priya Sharma', email: 'priya.sharma@littleleaf.com' },
    { name: 'Neha Patel', email: 'neha.patel@littleleaf.com' },
    { name: 'Anjali Kumar', email: 'anjali.kumar@littleleaf.com' },
    { name: 'Kavita Singh', email: 'kavita.singh@littleleaf.com' },
    { name: 'Sunita Reddy', email: 'sunita.reddy@littleleaf.com' }
];

const parentNames = [
    'Rajesh Sharma', 'Amit Patel', 'Suresh Kumar', 'Vijay Singh', 'Ramesh Reddy',
    'Mukesh Gupta', 'Anil Mehta', 'Sanjay Khan', 'Prakash Rao', 'Deepak Verma',
    'Santosh Iyer', 'Ganesh Nair', 'Mahesh Joshi', 'Dinesh Desai', 'Ashok Ali',
    'Ravi Bansal', 'Mohan Kapoor', 'Sunil Malhotra', 'Rakesh Sinha', 'Ajay Agarwal',
    'Vinod Bose', 'Kiran Pillai', 'Manoj Chawla', 'Pankaj Saxena', 'Naveen Yadav'
];

async function seedDummyData() {
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║     Seeding Dummy Data for Testing           ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        const createdStudents = [];
        const createdTeachers = [];
        const createdExams = [];

        // 1. Create Admin User
        console.log('1️⃣  Creating Admin User...');
        const adminId = `ADM#${uuidv4()}`;
        const adminUser = {
            userId: adminId,
            userType: 'ADMIN',
            adminId: 'ADM001',
            password: hashedPassword,
            email: 'admin@littleleafplayschool.com',
            phone: '+91-9876543210',
            fullName: 'Principal Admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
        };

        await docClient.put({
            TableName: TABLES.USERS,
            Item: adminUser
        }).promise();
        console.log('   ✓ Admin created - ID: ADM001, Password: password123\n');

        // 2. Create School Info
        console.log('2️⃣  Creating School Information...');
        const schoolInfo = {
            infoId: 'INFO#SCHOOL',
            schoolName: 'Little Leaf Play School',
            address: 'Malda, Kaliachak, India, 732201',
            phone: '+91 94763 74336',
            email: 'info@littleleafplayschool.com',
            website: 'www.littleleafplayschool.com',
            brochureUrl: 'https://example.com/brochure.pdf',
            principalName: 'Mr. H M Kamruzzaman',
            foundedYear: 2022,
            socialMedia: {
                facebook: 'facebook.com/littleleafplayschool',
                instagram: 'instagram.com/littleleafplayschool',
                twitter: 'twitter.com/littleleafps'
            },
            updatedAt: new Date().toISOString()
        };

        await docClient.put({
            TableName: TABLES.SCHOOL_INFO,
            Item: schoolInfo
        }).promise();
        console.log('   ✓ School information created\n');

        // 3. Create Teachers
        console.log('3️⃣  Creating Teachers...');
        for (let i = 0; i < teacherNames.length; i++) {
            const teacherId = `TCH#${uuidv4()}`;
            const employeeId = `TCH${String(i + 1).padStart(3, '0')}`;

            // Create teacher user
            const teacherUser = {
                userId: `USER#${uuidv4()}`,
                userType: 'TEACHER',
                teacherId: employeeId,
                password: hashedPassword,
                email: teacherNames[i].email,
                phone: `+91-98765${String(43211 + i).padStart(5, '0')}`,
                fullName: teacherNames[i].name,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true
            };

            await docClient.put({
                TableName: TABLES.USERS,
                Item: teacherUser
            }).promise();

            // Create teacher profile
            const teacher = {
                teacherId,
                employeeId,
                fullName: teacherNames[i].name,
                email: teacherNames[i].email,
                phone: teacherUser.phone,
                qualification: 'B.Ed in Early Childhood Education',
                joiningDate: '2023-01-01',
                assignedClasses: [classes[i % classes.length]],
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await docClient.put({
                TableName: TABLES.TEACHERS,
                Item: teacher
            }).promise();

            createdTeachers.push(teacher);
            console.log(`   ✓ Teacher ${i + 1}: ${employeeId} - ${teacherNames[i].name}`);
        }
        console.log('');

        // 4. Create Students
        console.log('4️⃣  Creating Students...');
        for (let i = 0; i < studentNames.length; i++) {
            const studentId = `STU#${uuidv4()}`;
            const rollNumber = `STU2024${String(i + 1).padStart(3, '0')}`;
            const className = classes[i % classes.length];

            // Create student user
            const studentUser = {
                userId: `USER#${uuidv4()}`,
                userType: 'STUDENT',
                rollNumber,
                password: hashedPassword,
                email: `${rollNumber.toLowerCase()}@student.littleleaf.com`,
                phone: `+91-98000${String(10001 + i).padStart(5, '0')}`,
                fullName: studentNames[i],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true
            };

            await docClient.put({
                TableName: TABLES.USERS,
                Item: studentUser
            }).promise();

            // Create student profile
            const student = {
                studentId,
                rollNumber,
                fullName: studentNames[i],
                dateOfBirth: `201${5 + (i % 5)}-${String((i % 12) + 1).padStart(2, '0')}-15`,
                parentName: parentNames[i],
                parentPhone: `+91-98100${String(10001 + i).padStart(5, '0')}`,
                parentEmail: `${parentNames[i].toLowerCase().replace(' ', '.')}@gmail.com`,
                address: `${i + 1}/234, Sector ${i + 1}, Mumbai, Maharashtra - 400${String(i + 1).padStart(3, '0')}`,
                admissionDate: '2024-01-01',
                class: className,
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await docClient.put({
                TableName: TABLES.STUDENTS,
                Item: student
            }).promise();

            createdStudents.push(student);
            console.log(`   ✓ Student ${i + 1}: ${rollNumber} - ${studentNames[i]} (${className})`);
        }
        console.log('');

        // 5. Create Fee Structure
        console.log('5️⃣  Creating Fee Structure...');
        const feeStructures = [
            { feeType: 'ADMISSION', feeName: 'Admission Fee', amount: 10000 },
            { feeType: 'MONTHLY_TUITION', feeName: 'Monthly Tuition Fee', amount: 3000 },
            { feeType: 'MISC', feeName: 'Annual Day Celebration', amount: 1500 },
            { feeType: 'MISC', feeName: 'Sports Day Fee', amount: 500 }
        ];

        for (const feeStruct of feeStructures) {
            const feeStructureId = `FEESTRUCT#${uuidv4()}`;
            const structure = {
                feeStructureId,
                ...feeStruct,
                applicableClass: 'ALL',
                isActive: true,
                effectiveFrom: '2024-01-01',
                effectiveTo: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await docClient.put({
                TableName: TABLES.FEE_STRUCTURE,
                Item: structure
            }).promise();

            console.log(`   ✓ Fee Structure: ${feeStruct.feeName} - ₹${feeStruct.amount}`);
        }
        console.log('');

        // 6. Create Fees for Students
        console.log('6️⃣  Creating Fee Records...');
        let feeCount = 0;
        for (const student of createdStudents) {
            // Admission fee (paid)
            const admissionFee = {
                feeId: `FEE#${uuidv4()}`,
                studentId: student.studentId,
                rollNumber: student.rollNumber,
                feeType: 'ADMISSION',
                amount: 10000,
                dueDate: '2024-01-15',
                paymentDate: '2024-01-10',
                paymentStatus: 'PAID',
                paymentMethod: 'CARD',
                transactionId: `TXN${Date.now()}${feeCount++}`,
                remarks: 'Admission fee for 2024',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await docClient.put({
                TableName: TABLES.FEES,
                Item: admissionFee
            }).promise();

            // Monthly fees (some paid, some pending)
            for (let month = 1; month <= 6; month++) {
                const isPaid = month <= 4; // First 4 months paid
                const monthlyFee = {
                    feeId: `FEE#${uuidv4()}`,
                    studentId: student.studentId,
                    rollNumber: student.rollNumber,
                    feeType: 'MONTHLY_TUITION',
                    amount: 3000,
                    dueDate: `2024-${String(month).padStart(2, '0')}-05`,
                    paymentDate: isPaid ? `2024-${String(month).padStart(2, '0')}-03` : null,
                    paymentStatus: isPaid ? 'PAID' : 'PENDING',
                    paymentMethod: isPaid ? (month % 2 === 0 ? 'CARD' : 'CASH') : null,
                    transactionId: isPaid ? `TXN${Date.now()}${feeCount++}` : null,
                    remarks: `Tuition fee for ${new Date(2024, month - 1).toLocaleString('default', { month: 'long' })} 2024`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await docClient.put({
                    TableName: TABLES.FEES,
                    Item: monthlyFee
                }).promise();
            }
        }
        console.log(`   ✓ Created fee records for ${createdStudents.length} students\n`);

        // 7. Create Exams with Subjects
        console.log('7️⃣  Creating Exams...');
        const examTypes = ['MONTHLY', 'QUARTERLY', 'ANNUAL'];
        let examCount = 0;

        // Define subject configurations for different exam types
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
            'ANNUAL': [
                { name: 'English', maxMarks: '30' },
                { name: 'Mathematics', maxMarks: '30' },
                { name: 'General Knowledge', maxMarks: '20' },
                { name: 'Hindi', maxMarks: '20' }
            ]
        };

        for (const className of classes) {
            for (let i = 0; i < 3; i++) {
                const examId = `EXAM#${uuidv4()}`;
                const examType = examTypes[i];
                const examSubjects = examSubjectConfigs[examType];
                const totalMarks = examSubjects.reduce((sum, s) => sum + parseInt(s.maxMarks), 0);

                const exam = {
                    examId,
                    examName: `${examType} Assessment - ${className}`,
                    examType: examType,
                    class: className,
                    subject: '', // Legacy field, can be empty now
                    examDate: `2024-0${3 + i * 3}-15`,
                    totalMarks: totalMarks,
                    passingMarks: Math.floor(totalMarks * 0.4),
                    subjects: examSubjects,
                    createdBy: adminId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await docClient.put({
                    TableName: TABLES.EXAMS,
                    Item: exam
                }).promise();

                createdExams.push(exam);
                examCount++;
                console.log(`   ✓ Exam ${examCount}: ${exam.examName} (${exam.examDate}) - ${examSubjects.length} subjects`);
            }
        }
        console.log('');

        // 8. Create Exam Results with Subject-wise Marks
        console.log('8️⃣  Creating Exam Results...');
        let resultCount = 0;

        for (const exam of createdExams) {
            // Find students in this exam's class
            const classStudents = createdStudents.filter(s => s.class === exam.class);

            for (const student of classStudents) {
                // Generate subject-wise marks
                const subjectMarks = exam.subjects.map(subject => {
                    const maxMarks = parseInt(subject.maxMarks);
                    // Generate marks between 60-95% of max marks
                    const percentage = 60 + Math.random() * 35;
                    const marksObtained = Math.floor((percentage / 100) * maxMarks);

                    return {
                        name: subject.name,
                        maxMarks: subject.maxMarks,
                        marksObtained: marksObtained.toString()
                    };
                });

                // Calculate total marks
                const totalMarksObtained = subjectMarks.reduce((sum, s) => sum + parseInt(s.marksObtained), 0);
                const percentage = (totalMarksObtained / exam.totalMarks) * 100;
                const grade = percentage >= 90 ? 'A+' :
                             percentage >= 80 ? 'A' :
                             percentage >= 70 ? 'B+' :
                             percentage >= 60 ? 'B' : 'C';

                const result = {
                    resultId: `RESULT#${uuidv4()}`,
                    examId: exam.examId,
                    studentId: student.studentId,
                    rollNumber: student.rollNumber,
                    marksObtained: totalMarksObtained,
                    totalMarks: exam.totalMarks,
                    percentage: parseFloat(percentage.toFixed(2)),
                    grade,
                    subjects: subjectMarks,
                    remarks: grade === 'A+' ? 'Excellent!' : grade === 'A' ? 'Very Good' : 'Good',
                    uploadedBy: createdTeachers[0].teacherId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await docClient.put({
                    TableName: TABLES.EXAM_RESULTS,
                    Item: result
                }).promise();

                resultCount++;
            }
        }
        console.log(`   ✓ Created ${resultCount} exam results with subject-wise marks\n`);

        // 9. Create Holidays
        console.log('9️⃣  Creating Holidays...');
        const holidays = [
            { name: 'Republic Day', date: '2024-01-26', type: 'NATIONAL' },
            { name: 'Holi', date: '2024-03-25', type: 'NATIONAL' },
            { name: 'Good Friday', date: '2024-03-29', type: 'NATIONAL' },
            { name: 'Independence Day', date: '2024-08-15', type: 'NATIONAL' },
            { name: 'Diwali', date: '2024-10-31', type: 'NATIONAL' },
            { name: 'Christmas', date: '2024-12-25', type: 'NATIONAL' },
            { name: 'Summer Break Start', date: '2024-05-01', type: 'SCHOOL' },
            { name: 'Annual Day', date: '2024-11-15', type: 'SCHOOL' }
        ];

        for (const holiday of holidays) {
            const holidayId = `HOLIDAY#${uuidv4()}`;
            const holidayRecord = {
                holidayId,
                holidayName: holiday.name,
                holidayDate: holiday.date,
                holidayType: holiday.type,
                description: `${holiday.name} - School will be closed`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await docClient.put({
                TableName: TABLES.HOLIDAYS,
                Item: holidayRecord
            }).promise();

            console.log(`   ✓ Holiday: ${holiday.name} (${holiday.date})`);
        }
        console.log('');

        // 10. Create Sample Media (24 Gallery Images)
        console.log('🔟 Creating Media Gallery (24 Images)...');

        // TODO: Replace with your actual S3 bucket name
         // S3 Configuration
        const S3_BUCKET = 'little-leaf';
        const S3_REGION = 'us-east-1';
        const S3_FOLDER = 'little-leaf';

        // TODO: Replace with your actual image filenames
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

        for (let i = 0; i < galleryImages.length; i++) {
            const { filename, title } = galleryImages[i];
            const mediaId = `MEDIA#${uuidv4()}`;
            const s3Url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${S3_FOLDER}/${filename}`;

            const mediaRecord = {
                mediaId,
                mediaType: 'PHOTO',
                title,
                description: `${title} - Little Leaf Play School`,
                s3Url,
                thumbnailUrl: s3Url, // Same as original for now
                s3Key: filename,
                s3Bucket: S3_BUCKET,
                uploadDate: new Date(2024, i % 12, (i % 28) + 1).toISOString(),
                uploadedBy: adminId,
                category: 'GENERAL',
                tags: ['school', 'gallery', '2024'],
                isPublic: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await docClient.put({
                TableName: TABLES.MEDIA,
                Item: mediaRecord
            }).promise();

            console.log(`   ✓ Gallery Image ${i + 1}: ${title}`);
        }
        console.log('');

        // 11. Create Sample Inquiries
        console.log('1️⃣1️⃣  Creating Sample Inquiries...');

        const sampleInquiries = [
            {
                parentName: 'Rajesh Kumar',
                email: 'rajesh.kumar@example.com',
                phone: '+91 9876543210',
                studentName: 'Ananya Kumar',
                studentAge: 3,
                preferredClass: 'NURSERY',
                inquiry: 'I would like to know more about the admission process and fee structure for Nursery class. My daughter will turn 3 next month. What documents are required?',
                status: 'NEW',
                daysAgo: 2
            },
            {
                parentName: 'Priya Mehta',
                email: 'priya.mehta@example.com',
                phone: '+91 9123456789',
                studentName: 'Arjun Mehta',
                studentAge: 4,
                preferredClass: 'LKG',
                inquiry: 'We recently moved to the area and are looking for a good playschool. Could you please share information about your curriculum, teacher-student ratio, and school timings?',
                status: 'NEW',
                daysAgo: 1
            },
            {
                parentName: 'Amit Verma',
                email: 'amit.verma@example.com',
                phone: '+91 9988776655',
                studentName: 'Ishaan Verma',
                studentAge: 5,
                preferredClass: 'UKG',
                inquiry: 'My son is currently in LKG at another school. We are interested in transferring him to UKG here. Is mid-year admission possible? Also, do you provide transportation facility?',
                status: 'NEW',
                daysAgo: 0
            },
            {
                parentName: 'Sneha Desai',
                email: 'sneha.desai@example.com',
                phone: '+91 9765432108',
                studentName: 'Diya Desai',
                studentAge: 2,
                preferredClass: 'PRE-NURSERY',
                inquiry: 'My daughter will turn 3 in June. When does the admission process start for the next academic year? What is the age cutoff date?',
                status: 'FOLLOWED_UP',
                daysAgo: 7,
                followedUp: 5
            },
            {
                parentName: 'Vikram Singh',
                email: 'vikram.singh@example.com',
                phone: '+91 9554433221',
                studentName: 'Kavya Singh',
                studentAge: 4,
                preferredClass: 'LKG',
                inquiry: 'We visited your school last week and were impressed by the facilities. Could you please send me the admission form and fee details? We would like to enroll our daughter for the upcoming session.',
                status: 'FOLLOWED_UP',
                daysAgo: 10,
                followedUp: 8
            }
        ];

        for (const inq of sampleInquiries) {
            const inquiryId = `INQ#${Date.now() - (inq.daysAgo * 24 * 60 * 60 * 1000)}`;
            const submittedAt = new Date(Date.now() - (inq.daysAgo * 24 * 60 * 60 * 1000)).toISOString();
            const followedUpAt = inq.followedUp
                ? new Date(Date.now() - (inq.followedUp * 24 * 60 * 60 * 1000)).toISOString()
                : null;

            const inquiryData = {
                inquiryId,
                parentName: inq.parentName,
                email: inq.email,
                phone: inq.phone,
                studentName: inq.studentName,
                studentAge: inq.studentAge,
                preferredClass: inq.preferredClass,
                inquiry: inq.inquiry,
                status: inq.status,
                submittedAt,
                followedUpAt,
                createdAt: submittedAt,
                updatedAt: followedUpAt || submittedAt
            };

            await docClient.put({
                TableName: TABLES.INQUIRIES,
                Item: inquiryData
            }).promise();

            const statusIcon = inq.status === 'NEW' ? '🆕' : '✅';
            console.log(`   ${statusIcon} Inquiry from ${inq.parentName} (${inq.status})`);
        }
        console.log('');

        // Summary
        console.log('═'.repeat(48));
        console.log('\n✅ DUMMY DATA SEEDED SUCCESSFULLY!\n');
        console.log('📊 Summary:');
        console.log(`   • Admin Users: 1`);
        console.log(`   • Teachers: ${createdTeachers.length}`);
        console.log(`   • Students: ${createdStudents.length}`);
        console.log(`   • Exams: ${createdExams.length}`);
        console.log(`   • Exam Results: ${resultCount}`);
        console.log(`   • Holidays: ${holidays.length}`);
        console.log(`   • Gallery Images: ${galleryImages.length}`);
        console.log(`   • Fee Structures: ${feeStructures.length}`);
        console.log(`   • Inquiries: ${sampleInquiries.length} (3 pending, 2 followed up)`);
        console.log('');
        console.log('🔑 Login Credentials (All passwords: password123):');
        console.log('');
        console.log('   Admin:');
        console.log('   • ID: ADM001, Password: password123');
        console.log('');
        console.log('   Sample Teachers:');
        console.log('   • ID: TCH001, Password: password123 (Priya Sharma)');
        console.log('   • ID: TCH002, Password: password123 (Neha Patel)');
        console.log('');
        console.log('   Sample Students:');
        console.log('   • Roll: STU2024001, Password: password123 (Aarav Sharma)');
        console.log('   • Roll: STU2024002, Password: password123 (Vivaan Patel)');
        console.log('   • Roll: STU2024003, Password: password123 (Aditya Kumar)');
        console.log('');
        console.log('🚀 You can now start the application and login!\n');
        console.log('═'.repeat(48));

    } catch (error) {
        console.error('\n❌ Error seeding dummy data:', error);
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    seedDummyData()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { seedDummyData };
