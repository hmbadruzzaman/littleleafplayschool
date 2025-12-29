# Deployment Guide - Little Leaf Playschool

## Prerequisites
- EC2 instance already running (with your biodata website)
- Route53 domain configured for playschool
- Node.js installed on EC2
- Nginx installed on EC2

## Deployment Steps

### 1. Prepare the Application for Production

#### Update Environment Variables

Create `.env` file in `server/` directory on EC2:
```bash
NODE_ENV=production
PORT=5001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FRONTEND_URL=https://playschool.yourdomain.com

# AWS DynamoDB Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# DynamoDB Table Names
DYNAMODB_USERS_TABLE=PlaySchool-Users
DYNAMODB_STUDENTS_TABLE=PlaySchool-Students
DYNAMODB_TEACHERS_TABLE=PlaySchool-Teachers
DYNAMODB_FEES_TABLE=PlaySchool-Fees
DYNAMODB_EXAMS_TABLE=PlaySchool-Exams
DYNAMODB_EXAM_RESULTS_TABLE=PlaySchool-ExamResults
DYNAMODB_EXPENDITURES_TABLE=PlaySchool-Expenditures
DYNAMODB_HOLIDAYS_TABLE=PlaySchool-Holidays
```

#### Update Client API Configuration

In `client/src/services/api.js`, update the base URL:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://playschool.yourdomain.com/api';
```

Create `.env.production` in `client/` directory:
```bash
REACT_APP_API_URL=https://playschool.yourdomain.com/api
```

### 2. Build the React Application

On your local machine:
```bash
cd client
npm install
npm run build
```

This creates an optimized production build in `client/build/`.

### 3. Upload to EC2

```bash
# From your local machine
# Option 1: Using SCP
scp -r -i your-key.pem /path/to/littleleafplayschool ubuntu@your-ec2-ip:/home/ubuntu/

# Option 2: Using Git (Recommended)
# On EC2:
cd /home/ubuntu
git clone git@github.com:hmbadruzzaman/littleleafplayschool.git
cd littleleafplayschool
```

### 4. Setup on EC2 Server

SSH into your EC2 instance:
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

Install dependencies and build:
```bash
cd /home/ubuntu/littleleafplayschool

# Install server dependencies
cd server
npm install --production

# Install client dependencies and build (if not done locally)
cd ../client
npm install
npm run build

# Move build to web directory
sudo mkdir -p /var/www/playschool
sudo cp -r build /var/www/playschool/client
```

### 5. Create DynamoDB Tables

On EC2:
```bash
cd /home/ubuntu/littleleafplayschool/server
node scripts/create-tables.js
```

### 6. Seed Admin User

```bash
cd /home/ubuntu/littleleafplayschool/server
node scripts/seed-admin.js
```

### 7. Configure Nginx

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/playschool
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name playschool.yourdomain.com;

    # Serve React static files
    location / {
        root /var/www/playschool/client/build;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js backend
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5001/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/playschool /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. Setup PM2 for Process Management

Install PM2 globally (if not already installed):
```bash
sudo npm install -g pm2
```

Create PM2 ecosystem file:
```bash
cd /home/ubuntu/littleleafplayschool
nano ecosystem.config.js
```

Add this configuration:
```javascript
module.exports = {
  apps: [{
    name: 'playschool-api',
    script: './server/server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

Start the application:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 9. Configure SSL with Let's Encrypt

Install Certbot:
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

Get SSL certificate:
```bash
sudo certbot --nginx -d playschool.yourdomain.com
```

Certbot will automatically update your Nginx configuration for HTTPS.

### 10. Configure Route53

In AWS Route53:
1. Go to your hosted zone for the playschool domain
2. Create an A record:
   - Name: `playschool.yourdomain.com` (or just `@` for root domain)
   - Type: A
   - Value: Your EC2 public IP address
   - TTL: 300

### 11. Update Security Group

In AWS EC2 Console:
1. Go to your EC2 instance's Security Group
2. Ensure these inbound rules exist:
   - HTTP (80) - 0.0.0.0/0
   - HTTPS (443) - 0.0.0.0/0
   - SSH (22) - Your IP only

### 12. Verify Deployment

Test the endpoints:
```bash
# Health check
curl http://playschool.yourdomain.com/health

# API endpoint
curl http://playschool.yourdomain.com/api/public/school-info
```

Visit your domain in a browser:
- Frontend: https://playschool.yourdomain.com
- Health: https://playschool.yourdomain.com/health

## Managing the Application

### View Logs
```bash
pm2 logs playschool-api
```

### Restart Application
```bash
pm2 restart playschool-api
```

### Stop Application
```bash
pm2 stop playschool-api
```

### Monitor Application
```bash
pm2 monit
```

## Updating the Application

When you make changes:

```bash
# On local machine
git add .
git commit -m "Your changes"
git push origin main

# On EC2
cd /home/ubuntu/littleleafplayschool
git pull origin main

# Rebuild client if frontend changed
cd client
npm run build
sudo cp -r build /var/www/playschool/client

# Restart server if backend changed
cd ..
pm2 restart playschool-api
```

## Resource Usage Estimation

Running both biodata and playschool apps:
- **Recommended Instance**: t3.small or t3.medium
- **Memory**: Playschool backend ~100-200MB
- **Storage**: ~500MB for app + node_modules

## Monitoring

Setup CloudWatch for monitoring:
1. CPU utilization
2. Memory usage
3. Disk space
4. Network traffic

## Backup Strategy

1. **DynamoDB**: Enable point-in-time recovery
2. **Application Code**: Version controlled in Git
3. **Environment Variables**: Store securely in AWS Secrets Manager

## Troubleshooting

### Application won't start
```bash
pm2 logs playschool-api --lines 100
```

### Nginx errors
```bash
sudo tail -f /var/log/nginx/error.log
```

### DynamoDB connection issues
- Check AWS credentials in .env
- Verify IAM role/user permissions
- Check security group allows outbound HTTPS (443)

### Port already in use
```bash
sudo lsof -i :5001
# Kill the process if needed
sudo kill -9 <PID>
```

## Cost Estimation

Running on existing EC2:
- **EC2**: No additional cost (already running)
- **DynamoDB**:
  - Free tier: 25GB storage, 200M requests/month
  - Estimated: $0-5/month for small playschool
- **Route53**: ~$0.50/month per hosted zone
- **Data Transfer**: Minimal for small traffic

**Total Additional Cost**: ~$1-6/month

## Security Checklist

- [ ] Change default admin password after first login
- [ ] Update JWT_SECRET in production
- [ ] Enable HTTPS (SSL certificate)
- [ ] Configure CORS properly
- [ ] Set up regular backups
- [ ] Enable DynamoDB encryption at rest
- [ ] Use AWS Secrets Manager for sensitive data
- [ ] Enable CloudWatch logs
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
