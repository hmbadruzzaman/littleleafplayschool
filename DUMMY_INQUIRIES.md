# Dummy Inquiries Data

The seed script now creates **5 sample inquiries** to demonstrate the inquiry management system.

## Sample Inquiries Included:

### 🆕 Pending Inquiries (3):

#### 1. Rajesh Kumar (Submitted 2 days ago)
- **Student**: Ananya Kumar (Age 3)
- **Preferred Class**: NURSERY
- **Email**: rajesh.kumar@example.com
- **Phone**: +91 9876543210
- **Inquiry**: Asking about admission process, fee structure, and required documents

#### 2. Priya Mehta (Submitted 1 day ago)
- **Student**: Arjun Mehta (Age 4)
- **Preferred Class**: LKG
- **Email**: priya.mehta@example.com
- **Phone**: +91 9123456789
- **Inquiry**: Recently moved to area, asking about curriculum, teacher-student ratio, and timings

#### 3. Amit Verma (Submitted today)
- **Student**: Ishaan Verma (Age 5)
- **Preferred Class**: UKG
- **Email**: amit.verma@example.com
- **Phone**: +91 9988776655
- **Inquiry**: Interested in mid-year transfer from another school, asking about transportation

---

### ✅ Followed Up Inquiries (2):

#### 4. Sneha Desai (Submitted 7 days ago, Followed up 5 days ago)
- **Student**: Diya Desai (Age 2)
- **Preferred Class**: PRE-NURSERY
- **Email**: sneha.desai@example.com
- **Phone**: +91 9765432108
- **Inquiry**: Asking about admission process timeline and age cutoff date

#### 5. Vikram Singh (Submitted 10 days ago, Followed up 8 days ago)
- **Student**: Kavya Singh (Age 4)
- **Preferred Class**: LKG
- **Email**: vikram.singh@example.com
- **Phone**: +91 9554433221
- **Inquiry**: Visited school, requesting admission form and fee details

---

## How to See Them:

1. **Restart server** to load new dummy data:
   ```bash
   cd server
   npm run local
   ```

2. **Login as admin** at http://localhost:3000/login
   - **ID**: ADM001
   - **Password**: password123

3. **Notice the red badge** on "Inquiries" tab showing **3**

4. **Click "Inquiries" tab**

5. **Click "View All Inquiries" button**

6. **See all 5 inquiries**:
   - Filter by "Pending" to see 3 new inquiries
   - Filter by "Followed Up" to see 2 completed inquiries

---

## Testing the System:

### Test Marking as Followed Up:

1. Click on **"Pending" tab** in the modal
2. Choose any pending inquiry
3. Click **"Mark as Followed Up"** button
4. Watch:
   - Status changes to "Followed Up"
   - Green badge appears
   - Card turns light green
   - Follow-up timestamp shows
   - Badge count decreases from 3 to 2

### Test Adding New Inquiry:

1. Go to landing page: http://localhost:3000
2. Click **"Get Started"** button
3. Fill out the inquiry form
4. Submit
5. Login as admin
6. Badge count increases by 1
7. New inquiry appears in the list

---

## Realistic Data Features:

✅ **Different submission times** (today, 1 day ago, 2 days ago, etc.)
✅ **Different age groups** (2-5 years)
✅ **Different class preferences** (PRE-NURSERY to UKG)
✅ **Realistic Indian names and phone numbers**
✅ **Detailed, realistic inquiry messages**
✅ **Mix of statuses** (NEW and FOLLOWED_UP)
✅ **Follow-up timestamps** for completed inquiries

---

## Email & Phone Links:

All emails and phone numbers in the modal are **clickable**:
- **Email links** open your default email client
- **Phone links** initiate calls on mobile devices

---

This gives you a complete demonstration of the inquiry management system without needing to manually create test data!
