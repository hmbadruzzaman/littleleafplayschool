# Quick Start Guide - Little Leaf Play School

Get up and running in 5 minutes!

## Prerequisites Check
- [ ] Node.js installed (v14+): `node --version`
- [ ] npm installed: `npm --version`
- [ ] AWS Account with DynamoDB and S3 access
- [ ] AWS credentials (Access Key ID and Secret Access Key)

## Step 1: Backend Setup (2 minutes)

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your AWS credentials
# Required fields:
# - AWS_REGION
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
# - JWT_SECRET (any random string)

# Create database tables
npm run create-tables

# Create admin user
npm run seed-admin

# Start backend server
npm run dev
```

**Backend is now running on http://localhost:5000**

## Step 2: Frontend Setup (2 minutes)

Open a new terminal:

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start frontend
npm start
```

**Frontend is now running on http://localhost:3000**

## Step 3: First Login (1 minute)

1. Open browser to http://localhost:3000
2. Click "Login" button
3. Select "Admin" from dropdown
4. Enter credentials:
   - Admin ID: `ADM001`
   - Password: `admin123`
5. Click Login

**You're in! Start exploring the admin dashboard.**

## What's Next?

### Create Your First Student
1. Go to Students tab
2. Click "Add Student"
3. Fill in student details
4. Remember the generated Roll Number and password

### Create Your First Teacher
1. Go to Teachers tab
2. Click "Add Teacher"
3. Fill in teacher details
4. Remember the generated Teacher ID and password

### Test Different User Roles
Logout and try logging in as:
- **Student**: Use Roll Number and password
- **Teacher**: Use Teacher ID and password
- **Admin**: Use ADM001 and admin123

## Common Issues

### "Cannot connect to database"
- Check AWS credentials in `.env`
- Verify DynamoDB tables were created
- Check AWS region is correct

### "Port already in use"
- Backend: Change `PORT` in server/.env
- Frontend: Set `PORT=3001` in client terminal

### "Module not found"
- Run `npm install` in the respective directory
- Delete `node_modules` and run `npm install` again

## Useful Commands

```bash
# Backend
npm run dev          # Start development server
npm run create-tables # Create all DynamoDB tables
npm run seed-admin   # Create admin user

# Frontend
npm start            # Start development server
npm run build        # Build for production
```

## API Testing

Test the API using curl or Postman:

```bash
# Health check
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "ADMIN",
    "identifier": "ADM001",
    "password": "admin123"
  }'
```

## Project Structure

```
littleleafplayschool/
├── server/          # Backend (Node.js + Express + DynamoDB)
├── client/          # Frontend (React)
├── README.md        # Full documentation
└── QUICKSTART.md    # This file
```

## Need Help?

- 📖 Full documentation: See [README.md](README.md)
- 🗄️ Database schema: See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- 🐛 Issues: Check console logs in browser and terminal

---

**Happy coding!** 🚀
