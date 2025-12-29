# 🧪 Testing Guide - Little Leaf Play School

This guide helps you test all features of the application systematically.

## Prerequisites

✅ Application is running (both backend and frontend)
✅ Dummy data has been seeded (`npm run setup-with-data`)

## 🎭 Test Users

All passwords: `password123`

| Role | Login ID | Name |
|------|----------|------|
| Admin | ADM001 | Principal Admin |
| Teacher | TCH001 | Priya Sharma |
| Teacher | TCH002 | Neha Patel |
| Student | STU2024001 | Aarav Sharma |
| Student | STU2024002 | Vivaan Patel |

## 🔐 Authentication Testing

### Test 1: Login Validation
1. Go to `http://localhost:3000/login`
2. Try logging in without entering credentials → Should show error
3. Try wrong password → Should show "Invalid credentials"
4. Try correct credentials → Should redirect to dashboard

### Test 2: Role-Based Access
1. Login as Student (STU2024001)
2. Try accessing `http://localhost:3000/admin/dashboard` → Should redirect
3. Logout
4. Login as Admin (ADM001)
5. Try accessing `http://localhost:3000/student/dashboard` → Should redirect

### Test 3: Token Persistence
1. Login as any user
2. Refresh the page → Should stay logged in
3. Close browser and reopen → Should stay logged in
4. Logout → Token should be cleared

## 👨‍🎓 Student Portal Testing

**Login as:** STU2024001 / password123

### Test 1: Dashboard Overview
✅ Student name displayed correctly
✅ Roll number shown
✅ Class information visible
✅ Parent details displayed

### Test 2: Fees Section
✅ Total paid amount: ₹22,000
✅ Total pending amount: ₹6,000
✅ Pending fees table shows 2 records (May, June)
✅ Each fee shows type, amount, due date, status

### Test 3: Exam Results
✅ Shows 3 exam results
✅ Each result displays:
   - Marks obtained / Total marks
   - Percentage
   - Grade (A+, A, B+, etc.)

### Test 4: Upcoming Exams
✅ Shows exams scheduled for future dates
✅ Displays exam name, subject, date, total marks

### Test 5: Holidays
✅ Shows upcoming holidays
✅ Displays holiday name and date
✅ At least 8 holidays visible

## 👩‍🏫 Teacher Portal Testing

**Login as:** TCH001 / password123

### Test 1: View All Students
✅ Shows all 25 students
✅ Displays: Roll Number, Name, Class, Parent Phone
✅ Does NOT show fee information

### Test 2: View Students by Class
✅ Filter shows 5 students for Pre-KG A
✅ Correct students for assigned class

### Test 3: View Exams
✅ Shows all 15 exams
✅ Displays: Exam Name, Class, Subject, Date, Total Marks

### Test 4: Upload Marks - Single Student
1. Click "Upload Marks"
2. Select an exam from dropdown
3. Enter student roll number: STU2024001
4. Enter student ID: (copy from students table)
5. Enter marks: 85
6. Submit
✅ Should show success message
✅ Marks should appear in exam results

### Test 5: Assigned Classes
✅ Shows assigned class: Pre-KG A
✅ Teacher can only see their assigned classes

## 👨‍💼 Admin Portal Testing

**Login as:** ADM001 / password123

### Test 1: Dashboard Overview
✅ Total Students card shows: 25
✅ Total Teachers card shows: 5
✅ Total Earnings card shows: ₹5,50,000+
✅ Active Students card shows: 25

### Test 2: View All Students
1. Click "Students" tab
✅ Shows all 25 students
✅ Displays: Roll Number, Name, Class, Parent Name, Phone, Status
✅ Each student has "ACTIVE" status badge

### Test 3: View All Teachers
1. Click "Teachers" tab
✅ Shows all 5 teachers
✅ Displays: Employee ID, Name, Email, Phone, Status
✅ Each teacher has "ACTIVE" status badge

### Test 4: View Reports
1. Click "Reports" tab

**Earnings Report:**
✅ Total Earnings: ₹5,50,000
✅ Admission Fees: ₹2,50,000
✅ Monthly Fees: ₹3,00,000
✅ Misc Fees: ₹0

**Student Distribution:**
✅ Pre-KG A: 5 students
✅ Pre-KG B: 5 students
✅ LKG A: 5 students
✅ LKG B: 5 students
✅ UKG A: 5 students

### Test 5: Create New Student (Optional)
1. Dashboard → Quick Actions → "Create Student" (if implemented)
2. Or use API directly
3. Fill in details:
   - Full Name: Test Student
   - Parent Name: Test Parent
   - Parent Phone: +91-9999999999
   - Class: Pre-KG A
   - Password: test123
4. Submit
✅ Should create student with auto-generated roll number
✅ Student should appear in students list

### Test 6: Create New Teacher (Optional)
1. Dashboard → Quick Actions → "Create Teacher"
2. Fill in details:
   - Full Name: Test Teacher
   - Email: test.teacher@littleleaf.com
   - Phone: +91-9999999999
   - Password: test123
3. Submit
✅ Should create teacher with auto-generated ID
✅ Teacher should appear in teachers list

## 🌐 Public Pages Testing

### Test 1: Landing Page
1. Logout or open incognito window
2. Go to `http://localhost:3000`
✅ Shows school name: "Little Leaf Play School"
✅ Shows school address
✅ Shows contact information
✅ Shows "Login" button
✅ Professional design

### Test 2: Navigation
1. From landing page, click "Login"
✅ Redirects to login page
2. From login page, click "Back to Home"
✅ Returns to landing page

## 🔌 API Testing (Using curl or Postman)

### Test 1: Health Check
```bash
curl http://localhost:5000/health
```
✅ Returns: `{"success": true, "message": "API is running"}`

### Test 2: Login API
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "ADMIN",
    "identifier": "ADM001",
    "password": "password123"
  }'
```
✅ Returns token and user data

### Test 3: Protected Route (Without Token)
```bash
curl http://localhost:5000/api/student/dashboard
```
✅ Returns 401 Unauthorized

### Test 4: Protected Route (With Token)
```bash
# First get token from login, then:
curl http://localhost:5000/api/student/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```
✅ Returns dashboard data

## 📊 Data Integrity Testing

### Test 1: Fee Calculation
1. Login as Student: STU2024001
2. Count paid fees manually:
   - Admission: ₹10,000
   - Jan-Apr (4 months × ₹3,000): ₹12,000
   - Total: ₹22,000
✅ Should match displayed "Total Paid"

### Test 2: Pending Fees
1. Count pending fees:
   - May: ₹3,000
   - June: ₹3,000
   - Total: ₹6,000
✅ Should match displayed "Total Pending"

### Test 3: Exam Results Count
1. Login as Student
2. Student should have 3 exam results
   - One for each exam in their class
✅ Verify all 3 results are visible

## 🔄 State Management Testing

### Test 1: Dashboard Data Refresh
1. Login as any user
2. Note dashboard data
3. Refresh page
✅ Data should reload correctly

### Test 2: Logout Cleanup
1. Login as Admin
2. Navigate through multiple pages
3. Logout
✅ Should redirect to login page
✅ Attempting to access protected routes should redirect to login

## 🎨 UI/UX Testing

### Test 1: Responsive Design
1. Open application
2. Resize browser window
✅ Layout adjusts for mobile
✅ Tables remain readable
✅ Buttons stay accessible

### Test 2: Error Handling
1. Try logging in with wrong credentials
✅ Clear error message displayed
✅ Doesn't crash application

### Test 3: Loading States
1. Login and navigate to dashboard
✅ Shows "Loading..." while fetching data
✅ Smoothly transitions to content

## ✅ Complete Test Checklist

### Authentication ✓
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Role-based redirects
- [ ] Token persistence
- [ ] Logout functionality

### Student Portal ✓
- [ ] Dashboard loads
- [ ] Fees display correctly
- [ ] Exam results visible
- [ ] Upcoming exams shown
- [ ] Holidays listed

### Teacher Portal ✓
- [ ] View all students
- [ ] View students by class
- [ ] View exams
- [ ] Upload marks (single)
- [ ] View assigned classes

### Admin Portal ✓
- [ ] Dashboard statistics
- [ ] View all students
- [ ] View all teachers
- [ ] View earnings report
- [ ] View student distribution

### Public Pages ✓
- [ ] Landing page loads
- [ ] School info displayed
- [ ] Login link works
- [ ] Back to home works

### API Endpoints ✓
- [ ] Health check works
- [ ] Login API works
- [ ] Protected routes require auth
- [ ] Token authentication works

## 🐛 Known Issues to Test

1. **Large Data Sets**: With 25 students, tables should load quickly
2. **Concurrent Logins**: Multiple users can be logged in simultaneously
3. **Token Expiry**: Tokens expire after 7 days (default)

## 📈 Performance Testing

### Test 1: Page Load Time
✅ Landing page: < 2 seconds
✅ Dashboard: < 3 seconds
✅ Student list: < 3 seconds

### Test 2: API Response Time
✅ Login: < 1 second
✅ Get Dashboard: < 2 seconds
✅ Get Students: < 2 seconds

## 🎯 Success Criteria

The application passes testing if:
✅ All user roles can login
✅ Dashboards load with correct data
✅ Protected routes are secure
✅ Data calculations are accurate
✅ UI is responsive and professional
✅ No console errors in browser
✅ No server errors in terminal

## 📝 Bug Report Template

If you find issues:

```
Bug Title: [Brief description]
Steps to Reproduce:
1.
2.
3.

Expected Result:
Actual Result:
User Role: [Admin/Teacher/Student]
Browser: [Chrome/Firefox/Safari]
Screenshot: [If applicable]
```

---

**Happy Testing!** 🧪✅

If all tests pass, your application is production-ready! 🚀
