# 🚀 Quick Start with Dummy Data (2 Minutes!)

Get the application running with sample data immediately - no manual data entry needed!

## Prerequisites

- ✅ Node.js installed (v14+)
- ✅ AWS Account with DynamoDB access
- ✅ AWS credentials (Access Key ID and Secret Access Key)

## Step 1: Backend Setup (1 minute)

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

**Edit `.env` file** and add your AWS credentials:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
JWT_SECRET=any_random_string_here
```

**Create tables and seed with dummy data:**

```bash
npm run setup-with-data
```

This single command will:
- ✅ Create all 11 DynamoDB tables
- ✅ Create 1 admin user
- ✅ Create 5 teachers
- ✅ Create 25 students
- ✅ Create 15 exams
- ✅ Create exam results for all students
- ✅ Create fee records (some paid, some pending)
- ✅ Create holidays
- ✅ Create media gallery items

**Start backend:**

```bash
npm run dev
```

Backend running at: `http://localhost:5000` ✅

## Step 2: Frontend Setup (1 minute)

Open a **new terminal**:

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start frontend
npm start
```

Frontend running at: `http://localhost:3000` ✅

## Step 3: Login & Explore!

Browser will auto-open to `http://localhost:3000`

### 🔑 Login Credentials (Password for all: `password123`)

#### Login as Admin
- User Type: **Admin**
- Admin ID: **ADM001**
- Password: **password123**

#### Login as Teacher
- User Type: **Teacher**
- Teacher ID: **TCH001** (Priya Sharma)
- Password: **password123**

OR

- Teacher ID: **TCH002** (Neha Patel)
- Password: **password123**

#### Login as Student
- User Type: **Student**
- Roll Number: **STU2024001** (Aarav Sharma)
- Password: **password123**

OR

- Roll Number: **STU2024002** (Vivaan Patel)
- Password: **password123**

OR

- Roll Number: **STU2024003** (Aditya Kumar)
- Password: **password123**

## 📊 What Dummy Data Is Included?

| Data Type | Count | Details |
|-----------|-------|---------|
| **Admin** | 1 | Full system access |
| **Teachers** | 5 | Assigned to different classes |
| **Students** | 25 | Distributed across 5 classes |
| **Exams** | 15 | Monthly, Quarterly, Annual |
| **Exam Results** | ~375 | Results for all students |
| **Fee Records** | ~175 | Mix of paid and pending |
| **Holidays** | 8 | National and school holidays |
| **Media Items** | 4 | Photos and videos |
| **Fee Structures** | 4 | Admission, Tuition, Misc |

## 🎯 What You Can Test

### As Admin
- ✅ View all 25 students
- ✅ View all 5 teachers
- ✅ See earnings report (₹4,10,000 total)
- ✅ See student distribution by class
- ✅ View all holidays and exams

### As Teacher
- ✅ View all students (except fee info)
- ✅ View students by class
- ✅ See all 15 exams
- ✅ Upload marks for students
- ✅ View exam results

### As Student
- ✅ View personal dashboard
- ✅ See paid fees (₹22,000)
- ✅ See pending fees (₹6,000)
- ✅ View exam results with grades
- ✅ See upcoming exams
- ✅ View holiday calendar

## 🔄 Reset/Re-seed Data

To start fresh:

```bash
# In server directory
npm run setup-with-data
```

This will re-create all tables and reseed data.

## 🎨 Sample Data Details

### Classes
- Pre-KG A, Pre-KG B
- LKG A, LKG B
- UKG A

### Student Names (Indian names)
Aarav, Vivaan, Aditya, Ananya, Diya, and 20 more...

### Fee Structure
- Admission Fee: ₹10,000 (all paid)
- Monthly Tuition: ₹3,000 (4 months paid, 2 pending)
- Total per student: ₹22,000 paid, ₹6,000 pending

### Exam Results
- All students have grades ranging from B to A+
- Marks between 60-90 out of 100
- Realistic grade distribution

## ❓ Troubleshooting

### "Cannot find module uuid" or similar
```bash
cd server
npm install
```

### "Cannot connect to DynamoDB"
- Check AWS credentials in `.env`
- Verify AWS region is correct
- Ensure IAM user has DynamoDB permissions

### Tables already exist error
Tables were already created. Either:
1. Delete tables from AWS Console, or
2. Skip `create-tables` and just run `npm run seed-dummy`

## 📱 Next Steps

1. **Explore the UI**: Login with different roles
2. **Test Features**: Add students, upload marks, record payments
3. **Customize**: Modify dummy data in `server/scripts/seed-dummy-data.js`
4. **Deploy**: Ready for production deployment!

## 🎉 You're All Set!

The application is now running with realistic dummy data.

**Enjoy exploring Little Leaf Play School Management System!** 🎓✨

---

Need help? Check [README.md](README.md) for full documentation.
