# Little Leaf Play School - Database Schema

## DynamoDB Tables Design

### 1. Users Table
**Table Name:** `LittleLeaf_Users`
**Primary Key:** `userId` (String)
**GSI:** `userType-index` (userType as partition key)

```javascript
{
  userId: "USER#<UUID>",
  userType: "STUDENT" | "TEACHER" | "ADMIN",
  rollNumber: "STU2024001", // for students
  teacherId: "TCH001", // for teachers
  adminId: "ADM001", // for admins
  password: "<hashed_password>",
  email: "student@email.com",
  phone: "+1234567890",
  fullName: "John Doe",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  isActive: true
}
```

### 2. Students Table
**Table Name:** `LittleLeaf_Students`
**Primary Key:** `studentId` (String)
**GSI:** `rollNumber-index` (rollNumber as partition key)

```javascript
{
  studentId: "STU#<UUID>",
  rollNumber: "STU2024001",
  fullName: "John Doe",
  dateOfBirth: "2020-05-15",
  parentName: "Jane Doe",
  parentPhone: "+1234567890",
  parentEmail: "parent@email.com",
  address: "123 Main St, City, State",
  admissionDate: "2024-01-01",
  class: "Pre-KG A",
  status: "ACTIVE" | "INACTIVE",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
}
```

### 3. Teachers Table
**Table Name:** `LittleLeaf_Teachers`
**Primary Key:** `teacherId` (String)

```javascript
{
  teacherId: "TCH#<UUID>",
  employeeId: "TCH001",
  fullName: "Sarah Smith",
  email: "sarah@littleleaf.com",
  phone: "+1234567890",
  qualification: "B.Ed in Early Childhood Education",
  joiningDate: "2023-01-01",
  assignedClasses: ["Pre-KG A", "Pre-KG B"],
  status: "ACTIVE" | "INACTIVE",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
}
```

### 4. Fees Table
**Table Name:** `LittleLeaf_Fees`
**Primary Key:** `feeId` (String)
**GSI:** `studentId-index` (studentId as partition key, dueDate as sort key)

```javascript
{
  feeId: "FEE#<UUID>",
  studentId: "STU#<UUID>",
  rollNumber: "STU2024001",
  feeType: "ADMISSION" | "MONTHLY_TUITION" | "MISC",
  amount: 5000,
  dueDate: "2024-01-31",
  paymentDate: "2024-01-15", // null if unpaid
  paymentStatus: "PAID" | "PENDING" | "OVERDUE",
  paymentMethod: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER",
  transactionId: "TXN123456",
  remarks: "January 2024 tuition",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
}
```

### 5. Fee Structure Table
**Table Name:** `LittleLeaf_FeeStructure`
**Primary Key:** `feeStructureId` (String)

```javascript
{
  feeStructureId: "FEESTRUCT#<UUID>",
  feeType: "ADMISSION" | "MONTHLY_TUITION" | "MISC",
  feeName: "Monthly Tuition Fee",
  amount: 3000,
  applicableClass: "Pre-KG A" | "ALL",
  isActive: true,
  effectiveFrom: "2024-01-01",
  effectiveTo: "2024-12-31", // null for ongoing
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
}
```

### 6. Exams Table
**Table Name:** `LittleLeaf_Exams`
**Primary Key:** `examId` (String)
**GSI:** `examDate-index` (examDate as partition key)

```javascript
{
  examId: "EXAM#<UUID>",
  examName: "Monthly Assessment - January 2024",
  examType: "MONTHLY" | "QUARTERLY" | "ANNUAL",
  class: "Pre-KG A",
  subject: "English" | "Math" | "General Knowledge",
  examDate: "2024-01-25",
  totalMarks: 100,
  passingMarks: 40,
  createdBy: "TCH#<UUID>",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
}
```

### 7. Exam Results Table
**Table Name:** `LittleLeaf_ExamResults`
**Primary Key:** `resultId` (String)
**GSI:** `studentId-examId-index` (composite)

```javascript
{
  resultId: "RESULT#<UUID>",
  examId: "EXAM#<UUID>",
  studentId: "STU#<UUID>",
  rollNumber: "STU2024001",
  marksObtained: 85,
  totalMarks: 100,
  percentage: 85.0,
  grade: "A",
  remarks: "Excellent performance",
  uploadedBy: "TCH#<UUID>",
  createdAt: "2024-01-26T00:00:00Z",
  updatedAt: "2024-01-26T00:00:00Z"
}
```

### 8. Holidays Table
**Table Name:** `LittleLeaf_Holidays`
**Primary Key:** `holidayId` (String)
**GSI:** `holidayDate-index` (holidayDate as partition key)

```javascript
{
  holidayId: "HOLIDAY#<UUID>",
  holidayName: "Republic Day",
  holidayDate: "2024-01-26",
  holidayType: "NATIONAL" | "SCHOOL" | "OPTIONAL",
  description: "National Holiday",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
}
```

### 9. Media Gallery Table
**Table Name:** `LittleLeaf_Media`
**Primary Key:** `mediaId` (String)
**GSI:** `mediaType-uploadDate-index` (composite)

```javascript
{
  mediaId: "MEDIA#<UUID>",
  mediaType: "PHOTO" | "VIDEO",
  title: "Annual Day Celebration 2024",
  description: "Photos from annual day event",
  s3Url: "https://s3.amazonaws.com/littleleaf/media/...",
  thumbnailUrl: "https://s3.amazonaws.com/littleleaf/thumbnails/...",
  uploadDate: "2024-01-01",
  uploadedBy: "ADM#<UUID>",
  tags: ["event", "annual-day", "2024"],
  isPublic: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
}
```

### 10. School Info Table
**Table Name:** `LittleLeaf_SchoolInfo`
**Primary Key:** `infoId` (String)

```javascript
{
  infoId: "INFO#SCHOOL",
  schoolName: "Little Leaf Play School",
  address: "123 Education Lane, City, State, ZIP",
  phone: "+1234567890",
  email: "info@littleleafplayschool.com",
  website: "www.littleleafplayschool.com",
  brochureUrl: "https://s3.amazonaws.com/littleleaf/brochure.pdf",
  principalName: "Dr. Principal Name",
  foundedYear: 2020,
  socialMedia: {
    facebook: "facebook.com/littleleaf",
    instagram: "instagram.com/littleleaf",
    twitter: "twitter.com/littleleaf"
  },
  updatedAt: "2024-01-01T00:00:00Z"
}
```

### 11. SMS Notifications Table
**Table Name:** `LittleLeaf_Notifications`
**Primary Key:** `notificationId` (String)
**GSI:** `studentId-sentDate-index` (composite)

```javascript
{
  notificationId: "NOTIF#<UUID>",
  studentId: "STU#<UUID>",
  rollNumber: "STU2024001",
  recipientPhone: "+1234567890",
  messageType: "FEE_REMINDER" | "EXAM_NOTIFICATION" | "GENERAL",
  message: "Fee reminder for January 2024...",
  sentDate: "2024-01-15T10:30:00Z",
  deliveryStatus: "SENT" | "FAILED" | "PENDING",
  sentBy: "ADM#<UUID>",
  createdAt: "2024-01-15T10:30:00Z"
}
```

## Access Patterns

### Student Dashboard
- Get student by rollNumber
- Get fees by studentId (paid and pending)
- Get exam results by studentId
- Get upcoming exams by class
- Get holidays

### Teacher Dashboard
- Get all students by class
- Get students by multiple classes
- Upload exam results
- Create exams
- View exam schedule

### Admin Dashboard
- Create/manage teacher profiles
- Create/manage student profiles
- Create exam schedules
- Add/manage holidays
- Manage fee structure
- Record fee payments
- Send SMS notifications
- View reports (earnings, student count)
- Upload media

## Indexes Summary

1. **Users Table**: `userType-index`, `rollNumber-index`, `teacherId-index`, `adminId-index`
2. **Students Table**: `rollNumber-index`
3. **Fees Table**: `studentId-index`
4. **Exams Table**: `examDate-index`, `class-index`
5. **ExamResults Table**: `studentId-examId-index`
6. **Holidays Table**: `holidayDate-index`
7. **Media Table**: `mediaType-uploadDate-index`
8. **Notifications Table**: `studentId-sentDate-index`
