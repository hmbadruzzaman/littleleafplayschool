# 🎯 START HERE - Little Leaf Play School

**Welcome!** This guide will get you running in the fastest way possible.

## ⚡ Super Quick Start (Choose One)

### Option 1: Local Mode - NO AWS Required! ⭐⭐⭐ (EASIEST!)

**Perfect for testing - works on your computer with zero configuration!**

```bash
# Backend (one command does everything!)
cd server
npm install
npm run local
```

```bash
# Frontend (new terminal)
cd client
npm install
npm start
```

**Login:** Admin ID: `ADM001` | Password: `password123`

📖 Full guide: [LOCAL_SETUP.md](LOCAL_SETUP.md)

✅ No AWS account needed
✅ No configuration required
✅ Instant dummy data
✅ Perfect for testing

---

### Option 2: AWS Mode with Dummy Data (Recommended for Production Testing) ⭐

Get 25 students, 5 teachers, exams, fees, and more!

```bash
# 1. Setup Backend
cd server
npm install
cp .env.example .env
# Edit .env with your AWS credentials
npm run setup-with-data
npm run dev
```

```bash
# 2. Setup Frontend (new terminal)
cd client
npm install
npm start
```

**Login:** Admin ID: `ADM001` | Password: `password123`

📖 Full guide: [QUICKSTART_WITH_DUMMY_DATA.md](QUICKSTART_WITH_DUMMY_DATA.md)

### Option 2: Empty Database (For Production)

Start with just the admin user.

```bash
# 1. Setup Backend
cd server
npm install
cp .env.example .env
# Edit .env with your AWS credentials
npm run setup
npm run dev
```

```bash
# 2. Setup Frontend (new terminal)
cd client
npm install
npm start
```

**Login:** Admin ID: `ADM001` | Password: `admin123`

## 📝 Edit .env File

Before running, add your AWS credentials to `server/.env`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
JWT_SECRET=any_random_string
```

## 🎮 What to Do Next

### If You Used Dummy Data

1. **Login as Admin** (ADM001 / password123)
   - View 25 students
   - View 5 teachers
   - Check earnings report (₹5,50,000)
   - View student distribution

2. **Login as Teacher** (TCH001 / password123)
   - View all students
   - Upload exam marks
   - View exam results

3. **Login as Student** (STU2024001 / password123)
   - View fees (₹22,000 paid, ₹6,000 pending)
   - Check exam results
   - See upcoming exams

### If You Used Empty Database

1. **Login as Admin** (ADM001 / admin123)
2. **Change your password** immediately
3. **Create your first teacher**
4. **Create your first student**
5. **Create exams and upload marks**

## 📚 Documentation

| File | Purpose |
|------|---------|
| [README.md](README.md) | Complete documentation |
| [QUICKSTART_WITH_DUMMY_DATA.md](QUICKSTART_WITH_DUMMY_DATA.md) | Quick setup with sample data |
| [DUMMY_DATA_OVERVIEW.md](DUMMY_DATA_OVERVIEW.md) | What sample data is included |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Database structure |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | Project overview |

## 🔧 Troubleshooting

### Cannot connect to database
- Check AWS credentials in `.env`
- Verify IAM permissions for DynamoDB
- Ensure correct AWS region

### Port already in use
- Backend: Change `PORT` in `server/.env`
- Frontend: Kill process using port 3000

### Module not found
```bash
# In the directory with the error
rm -rf node_modules package-lock.json
npm install
```

## 🎯 Next Steps

1. ✅ Get application running
2. 📖 Read [README.md](README.md) for full features
3. 🧪 Test different user roles
4. 🎨 Customize as needed
5. 🚀 Deploy to production

## 💡 Pro Tips

- **All dummy data passwords:** `password123`
- **Production admin password:** `admin123` (change immediately!)
- **Backend runs on:** `http://localhost:5000`
- **Frontend runs on:** `http://localhost:3000`
- **API health check:** `http://localhost:5000/health`

## 🆘 Need Help?

1. Check [README.md](README.md) for detailed docs
2. Check [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for DB info
3. Review console logs in terminal and browser
4. Verify AWS credentials are correct

## 🎉 You're Ready!

Choose an option above and start exploring!

**Happy coding!** 🚀✨

---

**Quick Links:**
- 📖 [Full Documentation](README.md)
- 🚀 [Quick Start with Data](QUICKSTART_WITH_DUMMY_DATA.md)
- 📊 [Sample Data Details](DUMMY_DATA_OVERVIEW.md)
- 🗄️ [Database Schema](DATABASE_SCHEMA.md)
