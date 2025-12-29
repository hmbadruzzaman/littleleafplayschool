# 🔄 Local vs AWS Mode Comparison

Choose the right mode for your needs!

## 🎯 Quick Decision Guide

| Scenario | Recommended Mode |
|----------|------------------|
| "I want to test the app now!" | **Local Mode** ⚡ |
| "I'm learning/experimenting" | **Local Mode** ⚡ |
| "I don't have AWS account" | **Local Mode** ⚡ |
| "I need data to persist" | **AWS Mode** ☁️ |
| "I'm deploying to production" | **AWS Mode** ☁️ |
| "Multiple users will access" | **AWS Mode** ☁️ |

## ⚡ Local Mode (In-Memory Database)

### What It Is
- Data stored in your computer's RAM
- No cloud services needed
- Automatically seeds dummy data on startup
- Data resets when server restarts

### How to Use
```bash
cd server
npm run local
```

### Pros ✅
- ✅ **No AWS account required**
- ✅ **Zero configuration** - just one command
- ✅ **Free** - no cloud costs
- ✅ **Fast** - instant startup
- ✅ **Offline** - works without internet (after `npm install`)
- ✅ **Fresh data** - clean slate every restart
- ✅ **Perfect for demos** - consistent dummy data

### Cons ❌
- ❌ Data is lost when server stops
- ❌ Not suitable for production
- ❌ Single server only (no distributed access)
- ❌ Limited by computer's RAM

### Best For
- 🧪 Testing and development
- 📚 Learning the system
- 🎨 UI/UX development
- 🎤 Demos and presentations
- 💻 Local experimentation

### Data Persistence
**None** - Data exists only while server runs

## ☁️ AWS Mode (DynamoDB)

### What It Is
- Data stored in AWS DynamoDB
- Cloud-based persistent storage
- Requires AWS account and credentials
- Data persists across restarts

### How to Use
```bash
cd server
cp .env.example .env
# Add AWS credentials to .env
npm run setup-with-data
npm run dev
```

### Pros ✅
- ✅ **Persistent data** - survives restarts
- ✅ **Production-ready** - scalable and reliable
- ✅ **Multi-user** - accessible from anywhere
- ✅ **Backup/recovery** - AWS handles it
- ✅ **Scalable** - grows with your needs

### Cons ❌
- ❌ Requires AWS account
- ❌ Requires configuration (.env file)
- ❌ Costs money (small for testing)
- ❌ Requires internet connection
- ❌ Setup takes longer

### Best For
- 🚀 Production deployment
- 👥 Multi-user environments
- 💾 When data needs to persist
- 📈 Scaling to many users
- 🔒 Real-world usage

### Data Persistence
**Permanent** - Data stored in AWS until you delete it

## 📊 Feature Comparison

| Feature | Local Mode | AWS Mode |
|---------|-----------|----------|
| **Setup Time** | < 1 minute | 5-10 minutes |
| **AWS Account** | Not needed | Required |
| **Configuration** | None | .env file needed |
| **Data Persistence** | No (RAM only) | Yes (DynamoDB) |
| **Cost** | Free | ~$1-5/month (testing) |
| **Internet Required** | No (after install) | Yes |
| **Multi-User** | No | Yes |
| **Production Ready** | No | Yes |
| **Dummy Data** | Auto-seeded | Must run script |
| **Data Reset** | Every restart | Manual only |
| **Suitable For** | Development/Testing | Production |

## 🔀 Switching Between Modes

### From Local → AWS

1. Get AWS credentials
2. Create `.env` file:
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   USE_LOCAL_DB=false
   ```
3. Run: `npm run setup-with-data`
4. Run: `npm run dev`

### From AWS → Local

1. Just run: `npm run local`
2. That's it! No configuration needed

## 💡 Recommended Workflow

### Phase 1: Learning & Development
```bash
npm run local
```
- Use local mode
- Learn the features
- Test functionality
- Develop UI/UX

### Phase 2: Testing with Persistence
```bash
npm run setup-with-data
npm run dev
```
- Switch to AWS mode
- Test with real database
- Verify data persistence
- Test with multiple users

### Phase 3: Production
```bash
npm run setup  # Clean database (no dummy data)
npm run start  # Production server
```
- Clean AWS setup
- Remove dummy data
- Use real user data
- Deploy to server

## 🎮 Command Reference

### Local Mode
| Command | What it does |
|---------|--------------|
| `npm run local` | Seed data + start server (all-in-one) |
| `npm run seed-dummy:local` | Just seed dummy data locally |
| `npm run dev:local` | Just start server in local mode |

### AWS Mode
| Command | What it does |
|---------|--------------|
| `npm run setup-with-data` | Create tables + seed dummy data |
| `npm run setup` | Create tables + seed admin only |
| `npm run dev` | Start server in AWS mode |
| `npm run seed-dummy` | Just seed dummy data to AWS |

## 💰 Cost Comparison

### Local Mode
- **Cost:** $0
- **Storage:** Free (your RAM)
- **Network:** Free (no API calls)

### AWS Mode (Testing with dummy data)
- **DynamoDB:** ~$1-2/month
- **Data Transfer:** < $1/month
- **S3 (if used):** < $1/month
- **Total:** ~$2-5/month for testing

### AWS Mode (Production with real users)
- Scales with usage
- Pay only for what you use
- DynamoDB free tier covers small schools

## ❓ FAQ

**Q: Which mode should I start with?**
A: **Local mode** - zero setup, instant testing!

**Q: Can I use local mode for production?**
A: No - data is lost on restart. Use AWS mode for production.

**Q: Do I need to choose one mode forever?**
A: No! Switch anytime. Use local for development, AWS for production.

**Q: How do I know which mode I'm running?**
A: Check server startup logs:
- Local: `🔧 Using LOCAL in-memory database`
- AWS: `☁️  Using AWS DynamoDB`

**Q: Can I use both modes simultaneously?**
A: Yes! Run local on your computer, AWS on server.

**Q: What happens to dummy data in AWS mode?**
A: It persists in DynamoDB until you delete the tables.

## 🎯 Summary

**Choose Local Mode when:**
- ✅ You want to try the app quickly
- ✅ You're developing/testing features
- ✅ You don't have AWS account
- ✅ You're learning the system

**Choose AWS Mode when:**
- ✅ You need data to persist
- ✅ Multiple users will access
- ✅ You're deploying to production
- ✅ You need backups and reliability

**Pro Tip:** Start with local mode to learn, then switch to AWS when ready for production! 🚀

---

**Still confused?** Just run:
```bash
cd server && npm run local
```

You can always switch to AWS later! 😊
