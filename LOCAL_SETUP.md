# 🚀 Local Setup (NO AWS Required!)

Run the entire application on your computer with dummy data - **no cloud account needed!**

## ✨ Super Quick Start (1 Minute!)

### Step 1: Backend (30 seconds)

```bash
cd server
npm install
npm run local
```

That's it! Backend is running with dummy data at `http://localhost:5001` ✅

### Step 2: Frontend (30 seconds)

Open a **new terminal**:

```bash
cd client
npm install
npm start
```

Frontend opens at `http://localhost:3000` ✅

### Step 3: Login!

**Login with:** Admin ID: `ADM001` | Password: `password123`

## 🎯 What Just Happened?

The `npm run local` command:
1. ✅ Started the backend server
2. ✅ Automatically created an in-memory database (no AWS!)
3. ✅ Auto-seeded 25 students, 5 teachers, exams, fees on startup

**All data is stored in your computer's memory** - no cloud, no configuration needed!

## 🔑 Login Credentials

**All passwords:** `password123`

| Role | Login ID | Name |
|------|----------|------|
| **Admin** | ADM001 | Principal Admin |
| **Teacher** | TCH001 | Priya Sharma |
| **Teacher** | TCH002 | Neha Patel |
| **Student** | STU2024001 | Aarav Sharma |
| **Student** | STU2024002 | Vivaan Patel |

## 📊 Dummy Data Included

- 1 Admin
- 5 Teachers
- 25 Students across 5 classes
- 15 Exams
- ~375 Exam results
- ~175 Fee records
- 8 Holidays
- 4 Media items

See [DUMMY_DATA_OVERVIEW.md](DUMMY_DATA_OVERVIEW.md) for complete details.

## 🔄 How It Works

### Local In-Memory Database

Instead of AWS DynamoDB, the app uses:
- JavaScript `Map` objects to store data
- Data lives in your computer's RAM
- No internet connection needed (except for `npm install`)
- Perfect for testing and development

### Data Persistence

⚠️ **Important:** Data is stored in memory only!
- Data persists while server is running
- **Data is lost when you restart the server**
- Each restart seeds fresh dummy data

This is perfect for testing but not for production.

## 🎮 Commands

| Command | What it does |
|---------|--------------|
| `npm run local` | Start server with auto-seeding (all-in-one!) |
| `npm run seed-dummy:local` | Manually seed dummy data (optional) |
| `npm run dev:local` | Just start server (same as `npm run local`) |

## 🔀 Switch to AWS DynamoDB Later

When ready for production:

1. Get AWS credentials
2. Create `.env` file (copy from `.env.example`)
3. Add AWS credentials:
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   USE_LOCAL_DB=false
   ```
4. Run: `npm run setup-with-data`
5. Run: `npm run dev`

## 💡 Benefits of Local Mode

✅ **No AWS Account** - Start immediately
✅ **No Configuration** - Just run one command
✅ **Fast Development** - Instant restarts
✅ **Free** - No cloud costs
✅ **Offline** - Works without internet

## 📝 Notes

### Data Reset
Every time you restart the server, data resets to default:
- 25 students
- 5 teachers
- All exams and results
- Fresh fee records

The database is automatically seeded on server startup, so you don't need to run any separate seeding commands.

### Production Use
For production, you'll need:
- AWS DynamoDB for persistent data
- AWS S3 for media storage
- Proper environment variables

See [README.md](README.md) for production setup.

## 🧪 Testing Workflow

1. `npm run local` - Start with fresh data
2. Test features (create students, upload marks, etc.)
3. Restart server - Data resets
4. Test again with clean state

Perfect for:
- Feature testing
- UI/UX development
- Demos and presentations
- Learning the system

## ❓ FAQ

**Q: Where is the data stored?**
A: In your computer's RAM using JavaScript Map objects.

**Q: Will my data be saved?**
A: No, data is lost when server stops. Use AWS mode for persistence.

**Q: Can I modify the dummy data?**
A: Yes! Edit `server/scripts/seed-dummy-data.js`

**Q: Do I need Node.js?**
A: Yes, Node.js v14+ is required.

**Q: Can multiple people use this?**
A: Yes, but each person needs to run their own local server.

## 🎉 You're All Set!

No AWS, no configuration, just run and test!

```bash
cd server && npm run local
```

---

**Happy testing!** 🚀

Need AWS mode? See [QUICKSTART_WITH_DUMMY_DATA.md](QUICKSTART_WITH_DUMMY_DATA.md)
