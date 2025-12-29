# Little Leaf Play School Management System

A comprehensive, enterprise-level web application for managing playschool operations with separate portals for Students, Teachers, and Administrators.

## 🚀 Quick Start - Choose Your Mode

### ⚡ Local Mode (NO AWS Required!) - Recommended for Testing

**Run everything on your computer with dummy data - zero configuration!**

```bash
cd server && npm install && npm run local
```

Then in a new terminal:
```bash
cd client && npm install && npm start
```

**Login:** Admin ID: `ADM001` | Password: `password123`

📖 Details: [LOCAL_SETUP.md](LOCAL_SETUP.md)

### ☁️ AWS Mode (For Production)

**Uses AWS DynamoDB for persistent data**

```bash
cd server && npm install && npm run setup-with-data && npm run dev
```

Then in a new terminal:
```bash
cd client && npm install && npm start
```

📖 Details: [QUICKSTART_WITH_DUMMY_DATA.md](QUICKSTART_WITH_DUMMY_DATA.md)

## Features

### Public Landing Page
- School information display (address, contact, brochure)
- Image and video gallery
- Upcoming holidays
- Login portal for all user types

### Student Portal
- View fees paid and pending
- Check exam results and marks
- View upcoming exam dates
- Access holiday calendar
- Personal profile information

### Teacher Portal
- View all student profiles (except fee information)
- Upload and manage exam papers
- Enter exam marks for students
- Bulk upload marks functionality
- View assigned classes

### Admin Portal
- **Student Management**: Create, update, and manage student profiles
- **Teacher Management**: Create and manage teacher accounts
- **Exam Management**: Create exam schedules and manage assessments
- **Fee Management**:
  - Create fee structures (Admission, Monthly Tuition, Misc)
  - Record fee payments
  - Send SMS reminders for pending fees
- **Holiday Management**: Add and manage school holidays
- **Reports**:
  - Earnings reports (distributed by fee type)
  - Student count reports
  - Class-wise distribution
- **Media Management**: Upload photos and videos to gallery
- **School Info Management**: Update school details

## Technology Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: AWS DynamoDB (NoSQL)
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: AWS S3 (for media files)
- **Security**: bcryptjs for password hashing

### Frontend
- **Framework**: React 18
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **State Management**: React Context API
- **Styling**: Custom CSS with modern design

## Project Structure

```
littleleafplayschool/
├── server/                      # Backend application
│   ├── config/                  # Configuration files
│   │   ├── dynamodb.js         # DynamoDB configuration
│   │   └── s3.js               # S3 configuration
│   ├── controllers/            # Request handlers
│   │   ├── authController.js   # Authentication logic
│   │   ├── studentController.js
│   │   ├── teacherController.js
│   │   ├── adminController.js
│   │   └── publicController.js
│   ├── models/                 # Data models
│   │   ├── User.js
│   │   ├── Student.js
│   │   ├── Teacher.js
│   │   ├── Fee.js
│   │   ├── Exam.js
│   │   └── ExamResult.js
│   ├── routes/                 # API routes
│   │   ├── auth.js
│   │   ├── student.js
│   │   ├── teacher.js
│   │   ├── admin.js
│   │   └── public.js
│   ├── middleware/             # Custom middleware
│   │   └── auth.js            # Authentication middleware
│   ├── scripts/               # Setup scripts
│   │   ├── create-tables.js   # Create DynamoDB tables
│   │   └── seed-admin.js      # Seed default admin user
│   ├── utils/                 # Utility functions
│   │   └── helpers.js
│   ├── .env.example           # Environment variables template
│   ├── package.json
│   └── server.js              # Entry point
│
├── client/                     # Frontend application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   │   ├── LandingPage.js
│   │   │   ├── LoginPage.js
│   │   │   ├── StudentDashboard.js
│   │   │   ├── TeacherDashboard.js
│   │   │   └── AdminDashboard.js
│   │   ├── context/           # React Context
│   │   │   └── AuthContext.js
│   │   ├── services/          # API services
│   │   │   └── api.js
│   │   ├── assets/            # Static assets
│   │   ├── App.js             # Main app component
│   │   ├── index.js           # Entry point
│   │   └── index.css          # Global styles
│   └── package.json
│
├── DATABASE_SCHEMA.md          # Database schema documentation
└── README.md                   # This file
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- AWS Account with:
  - DynamoDB access
  - S3 bucket (for media storage)
  - IAM credentials

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=5000
NODE_ENV=development

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

S3_BUCKET_NAME=littleleaf-playschool-media

JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:3000
```

5. Create DynamoDB tables:
```bash
npm run create-tables
```

6. Seed default admin user:
```bash
npm run seed-admin
```

This will create an admin user with:
- **Admin ID**: ADM001
- **Password**: admin123

**IMPORTANT**: Change this password after first login!

7. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (optional):
```bash
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

## API Endpoints

### Public Endpoints
- `GET /api/public/school-info` - Get school information
- `GET /api/public/gallery` - Get media gallery
- `GET /api/public/holidays` - Get upcoming holidays
- `POST /api/public/contact` - Submit contact form

### Authentication
- `POST /api/auth/login` - Login for all user types
- `GET /api/auth/profile` - Get current user profile (protected)
- `PUT /api/auth/change-password` - Change password (protected)

### Student Endpoints (Requires Student Authentication)
- `GET /api/student/dashboard` - Get student dashboard data
- `GET /api/student/fees` - Get student fees
- `GET /api/student/exam-results` - Get exam results
- `GET /api/student/upcoming-exams` - Get upcoming exams
- `GET /api/student/holidays` - Get holidays

### Teacher Endpoints (Requires Teacher Authentication)
- `GET /api/teacher/students` - Get all students
- `GET /api/teacher/students/class/:className` - Get students by class
- `GET /api/teacher/assigned-classes` - Get assigned classes
- `POST /api/teacher/exams` - Create exam
- `GET /api/teacher/exams` - Get all exams
- `POST /api/teacher/marks` - Upload marks for single student
- `POST /api/teacher/marks/bulk` - Bulk upload marks
- `GET /api/teacher/exams/:examId/results` - Get exam results

### Admin Endpoints (Requires Admin Authentication)
- **Students**:
  - `POST /api/admin/students` - Create student
  - `GET /api/admin/students` - Get all students
  - `PUT /api/admin/students/:studentId` - Update student
  - `DELETE /api/admin/students/:studentId` - Delete student
- **Teachers**:
  - `POST /api/admin/teachers` - Create teacher
  - `GET /api/admin/teachers` - Get all teachers
  - `PUT /api/admin/teachers/:teacherId` - Update teacher
- **Fees**:
  - `POST /api/admin/fees` - Create fee
  - `PUT /api/admin/fees/:feeId/payment` - Record payment
- **Exams**:
  - `POST /api/admin/exams` - Create exam
- **Holidays**:
  - `POST /api/admin/holidays` - Add holiday
  - `GET /api/admin/holidays` - Get all holidays
- **Reports**:
  - `GET /api/admin/reports/earnings` - Get earnings report
  - `GET /api/admin/reports/students` - Get student count report
- **School Info**:
  - `GET /api/admin/school-info` - Get school information
  - `PUT /api/admin/school-info` - Update school information

## Database Schema

The application uses DynamoDB with the following tables:
- `LittleLeaf_Users` - User authentication and profiles
- `LittleLeaf_Students` - Student information
- `LittleLeaf_Teachers` - Teacher information
- `LittleLeaf_Fees` - Fee records
- `LittleLeaf_FeeStructure` - Fee structure definitions
- `LittleLeaf_Exams` - Exam schedules
- `LittleLeaf_ExamResults` - Exam results
- `LittleLeaf_Holidays` - Holiday calendar
- `LittleLeaf_Media` - Media gallery
- `LittleLeaf_SchoolInfo` - School information
- `LittleLeaf_Notifications` - SMS notifications log

See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for detailed schema information.

## Default Login Credentials

After running the seed script, use these credentials to login:

**Admin Account**:
- User Type: Admin
- Admin ID: ADM001
- Password: admin123

## Security Features

- Password hashing using bcryptjs
- JWT-based authentication
- Role-based access control (Student, Teacher, Admin)
- Protected API routes with middleware
- Input validation
- CORS configuration

## Future Enhancements

- SMS integration for fee reminders (Twilio/AWS SNS)
- Email notifications
- Attendance tracking
- Parent portal
- Mobile app
- Advanced reporting and analytics
- Online fee payment integration
- Student performance graphs
- Teacher performance evaluation

## Development

### Running Tests
```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test
```

### Building for Production
```bash
# Build frontend
cd client
npm run build

# The build files will be in client/build/
```

### Deployment
The application can be deployed to:
- Backend: AWS EC2, AWS Elastic Beanstalk, or similar
- Frontend: AWS S3 + CloudFront, Netlify, Vercel
- Database: AWS DynamoDB (already cloud-based)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email: info@littleleafplayschool.com

## Author

HM Badruzzaman

---

**Happy Learning!** 🎓✨
