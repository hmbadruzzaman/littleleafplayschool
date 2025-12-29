# 📊 Dummy Data Overview

This document describes all the sample data that will be created when you run `npm run setup-with-data`.

## 🎯 Summary

| Category | Count | Details |
|----------|-------|---------|
| **Users Total** | 31 | 1 Admin + 5 Teachers + 25 Students |
| **Classes** | 5 | Pre-KG A, Pre-KG B, LKG A, LKG B, UKG A |
| **Exams** | 15 | 3 exams per class (Monthly, Quarterly, Annual) |
| **Exam Results** | ~375 | Results for each student in each exam |
| **Fee Records** | ~175 | Admission + 6 months tuition per student |
| **Holidays** | 8 | National and school holidays |
| **Media Items** | 4 | Sample photos and videos |
| **Fee Structures** | 4 | Admission, Tuition, Misc fees |

## 👥 Users Created

### 1 Admin User
```
Admin ID: ADM001
Name: Principal Admin
Email: admin@littleleafplayschool.com
Phone: +91-9876543210
Password: password123
```

### 5 Teachers
| Employee ID | Name | Email | Phone | Assigned Class |
|-------------|------|-------|-------|----------------|
| TCH001 | Priya Sharma | priya.sharma@littleleaf.com | +91-9876543211 | Pre-KG A |
| TCH002 | Neha Patel | neha.patel@littleleaf.com | +91-9876543212 | Pre-KG B |
| TCH003 | Anjali Kumar | anjali.kumar@littleleaf.com | +91-9876543213 | LKG A |
| TCH004 | Kavita Singh | kavita.singh@littleleaf.com | +91-9876543214 | LKG B |
| TCH005 | Sunita Reddy | sunita.reddy@littleleaf.com | +91-9876543215 | UKG A |

### 25 Students (Sample List)
| Roll Number | Name | Class | Parent Name | Parent Phone |
|-------------|------|-------|-------------|--------------|
| STU2024001 | Aarav Sharma | Pre-KG A | Rajesh Sharma | +91-9800010001 |
| STU2024002 | Vivaan Patel | Pre-KG B | Amit Patel | +91-9800010002 |
| STU2024003 | Aditya Kumar | LKG A | Suresh Kumar | +91-9800010003 |
| STU2024004 | Vihaan Singh | LKG B | Vijay Singh | +91-9800010004 |
| STU2024005 | Arjun Reddy | UKG A | Ramesh Reddy | +91-9800010005 |
| ... | ... | ... | ... | ... |
| STU2024025 | Shaurya Yadav | UKG A | Naveen Yadav | +91-9800010025 |

**Full list includes:** Aarav, Vivaan, Aditya, Vihaan, Arjun, Sai, Arnav, Ayaan, Krishna, Ishaan, Ananya, Diya, Aadhya, Pihu, Sara, Myra, Aanya, Navya, Ira, Kiara, Reyansh, Advait, Kabir, Atharv, Shaurya

## 📚 Classes & Distribution

| Class | Students | Teacher |
|-------|----------|---------|
| Pre-KG A | 5 | Priya Sharma (TCH001) |
| Pre-KG B | 5 | Neha Patel (TCH002) |
| LKG A | 5 | Anjali Kumar (TCH003) |
| LKG B | 5 | Kavita Singh (TCH004) |
| UKG A | 5 | Sunita Reddy (TCH005) |

## 📝 Exams (15 Total)

### Per Class (3 exams × 5 classes = 15 exams)

**Pre-KG A:**
- Monthly Assessment - English (March 15, 2024)
- Quarterly Assessment - Mathematics (June 15, 2024)
- Annual Assessment - General Knowledge (September 15, 2024)

**Pre-KG B:**
- Monthly Assessment - English (March 15, 2024)
- Quarterly Assessment - Mathematics (June 15, 2024)
- Annual Assessment - General Knowledge (September 15, 2024)

*(Similar pattern for LKG A, LKG B, and UKG A)*

### Exam Details
- Total Marks: 100
- Passing Marks: 40
- Subjects: English, Mathematics, General Knowledge, Hindi, Art & Craft

## 📊 Exam Results (~375 Results)

Each student has results for 3 exams in their class:

**Grade Distribution:**
- A+ (90-100): ~20% of students
- A (80-89): ~30% of students
- B+ (70-79): ~30% of students
- B (60-69): ~20% of students

**Sample Results for STU2024001 (Aarav Sharma):**
| Exam | Marks | Grade | Remarks |
|------|-------|-------|---------|
| Monthly Assessment - English | 85/100 | A | Very Good |
| Quarterly Assessment - Mathematics | 92/100 | A+ | Excellent! |
| Annual Assessment - General Knowledge | 78/100 | B+ | Good |

## 💰 Fee Structure

| Fee Type | Amount | Description |
|----------|--------|-------------|
| Admission Fee | ₹10,000 | One-time admission fee |
| Monthly Tuition | ₹3,000 | Monthly tuition fee |
| Annual Day Celebration | ₹1,500 | Misc fee for annual event |
| Sports Day Fee | ₹500 | Misc fee for sports event |

## 💳 Fee Records (Per Student)

Each student has:

### Admission Fee
- Amount: ₹10,000
- Status: **PAID** ✅
- Payment Date: Jan 10, 2024
- Method: Card

### Monthly Tuition Fees (6 months)
| Month | Amount | Status | Payment Date | Method |
|-------|--------|--------|--------------|--------|
| January 2024 | ₹3,000 | **PAID** ✅ | Jan 3 | Cash |
| February 2024 | ₹3,000 | **PAID** ✅ | Feb 3 | Card |
| March 2024 | ₹3,000 | **PAID** ✅ | Mar 3 | Cash |
| April 2024 | ₹3,000 | **PAID** ✅ | Apr 3 | Card |
| May 2024 | ₹3,000 | **PENDING** ⏳ | - | - |
| June 2024 | ₹3,000 | **PENDING** ⏳ | - | - |

### Per Student Summary
- Total Paid: ₹22,000
- Total Pending: ₹6,000
- Total Fees: ₹28,000

### Total for All Students (25 students)
- Total Paid: ₹5,50,000
- Total Pending: ₹1,50,000
- Total Fees: ₹7,00,000

## 📅 Holidays (8 Events)

| Holiday Name | Date | Type |
|--------------|------|------|
| Republic Day | Jan 26, 2024 | National |
| Holi | Mar 25, 2024 | National |
| Good Friday | Mar 29, 2024 | National |
| Summer Break Start | May 1, 2024 | School |
| Independence Day | Aug 15, 2024 | National |
| Diwali | Oct 31, 2024 | National |
| Annual Day | Nov 15, 2024 | School |
| Christmas | Dec 25, 2024 | National |

## 🖼️ Media Gallery (4 Items)

| Title | Type | Upload Date | Public |
|-------|------|-------------|--------|
| Annual Day 2023 | Photo | Dec 15, 2023 | ✅ Yes |
| Sports Day Highlights | Photo | Jan 20, 2024 | ✅ Yes |
| Classroom Activities | Photo | Feb 10, 2024 | ✅ Yes |
| Student Performances | Video | Mar 5, 2024 | ✅ Yes |

## 🏫 School Information

```
School Name: Little Leaf Play School
Address: 123 Green Park Avenue, Education District, Mumbai, Maharashtra - 400001
Phone: +91-22-12345678
Email: info@littleleafplayschool.com
Website: www.littleleafplayschool.com
Principal: Dr. Meera Krishnan
Founded: 2015

Social Media:
- Facebook: facebook.com/littleleafplayschool
- Instagram: instagram.com/littleleafplayschool
- Twitter: twitter.com/littleleafps
```

## 🎨 What You Can Test After Seeding

### As Admin (ADM001)
✅ View all 25 students across 5 classes
✅ View all 5 teachers
✅ See total earnings: ₹5,50,000 (paid)
✅ See pending fees: ₹1,50,000
✅ View earnings breakdown:
   - Admission: ₹2,50,000
   - Monthly Tuition: ₹3,00,000
✅ Student distribution report by class
✅ Create new students, teachers, exams
✅ Record fee payments
✅ Add new holidays

### As Teacher (TCH001 - Priya Sharma)
✅ View all 25 students (no fee info)
✅ View 5 students in assigned class (Pre-KG A)
✅ See all 15 exams
✅ View 3 exams for Pre-KG A
✅ Upload marks for students
✅ View existing exam results

### As Student (STU2024001 - Aarav Sharma)
✅ View personal dashboard
✅ See profile: Name, Roll Number, Class, Parent details
✅ View fees:
   - Paid: ₹22,000
   - Pending: ₹6,000
✅ View 3 exam results with grades
✅ See upcoming exams
✅ View holiday calendar (8 holidays)

## 🔄 How to Re-seed

If you want to start fresh:

```bash
cd server
npm run setup-with-data
```

This will:
1. Delete and recreate all tables
2. Seed fresh dummy data
3. Ready to use immediately

## 📋 Credentials Summary

**All passwords:** `password123`

**Login Options:**
- Admin: ADM001
- Teachers: TCH001 to TCH005
- Students: STU2024001 to STU2024025

## 🎯 Testing Scenarios

### Scenario 1: Fee Payment
1. Login as Admin
2. Go to Students → Select any student
3. Record a pending fee payment
4. Logout and login as that student
5. Verify payment is now marked as paid

### Scenario 2: Upload Marks
1. Login as Teacher (TCH001)
2. Go to Exams → Upload Marks
3. Select an exam and student
4. Enter marks (e.g., 85)
5. Logout and login as that student
6. Verify marks appear in results

### Scenario 3: View Reports
1. Login as Admin
2. Go to Reports
3. View earnings report (₹5,50,000)
4. View student distribution by class
5. Filter by date range

---

**This dummy data provides a complete, realistic environment for testing all features of the application!** 🎉
