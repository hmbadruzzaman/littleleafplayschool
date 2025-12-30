# Production Deployment Guide

Deploy Little Leaf Play School to AWS EC2 with domain `weliffleleaf.com`

## Prerequisites

- EC2 instance already running (with your biodata website)
- Domain: `weliffleleaf.com` configured in Route 53
- SSH access to EC2 instance
- Node.js installed on EC2
- Nginx installed on EC2
- SSL certificate (Let's Encrypt)

## Deployment Overview

Your EC2 will host:
1. **Biodata website** (existing) - Port 3001 or similar
2. **Little Leaf Play School** (new) - Port 5001 (backend) + Port 3000 (frontend build)

Nginx will route:
- `yourbiodata.com` → Biodata app
- `weliffleleaf.com` → Little Leaf app

## Step-by-Step Deployment

### Step 1: Prepare Production Environment File

Create `server/.env.production`:

```env
PORT=5001
USE_LOCAL_DB=false
JWT_SECRET=CHANGE_THIS_TO_STRONG_SECRET_IN_PRODUCTION
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://weliffleleaf.com
NODE_ENV=production

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
```

**Important:** Generate a strong JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 2: Build Frontend for Production

On your local machine:

```bash
cd client
npm run build
```

This creates an optimized production build in `client/build/`

### Step 3: Push Code to GitHub

```bash
git add .
git commit -m "Production deployment setup"
git push origin main
```

### Step 4: Connect to EC2 and Clone Repository

```bash
# SSH into your EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Navigate to your web apps directory
cd /var/www  # or wherever you keep your apps

# Clone the repository
git clone git@github.com:hmbadruzzaman/littleleafplayschool.git
cd littleleafplayschool
```

### Step 5: Install Dependencies on EC2

```bash
# Install backend dependencies
cd server
npm install --production

# Go back to root
cd ..
```

### Step 6: Copy Production Environment File

```bash
cd server
cp .env.production .env

# Edit if needed
nano .env
```

### Step 7: Setup PM2 for Process Management

```bash
# Install PM2 globally (if not already installed)
sudo npm install -g pm2

# Start the backend server
cd /var/www/littleleafplayschool/server
pm2 start npm --name "littleleaf-backend" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the command it gives you (usually sudo systemctl enable pm2-ec2-user)
```

### Step 8: Serve Frontend Build with Nginx

Create Nginx configuration for Little Leaf:

```bash
sudo nano /etc/nginx/sites-available/littleleaf
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name weliffleleaf.com www.weliffleleaf.com;

    # Frontend - Serve static React build
    root /var/www/littleleafplayschool/client/build;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend routes - React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/littleleaf /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 9: Configure Route 53 DNS

1. Go to AWS Route 53 Console
2. Select your hosted zone for `weliffleleaf.com`
3. Create/Update A Record:
   - **Name:** `weliffleleaf.com`
   - **Type:** A
   - **Value:** Your EC2 public IP address
   - **TTL:** 300

4. Create CNAME for www:
   - **Name:** `www.weliffleleaf.com`
   - **Type:** CNAME
   - **Value:** `weliffleleaf.com`
   - **TTL:** 300

### Step 10: Setup SSL Certificate (HTTPS)

```bash
# Install Certbot (if not already installed)
sudo yum install certbot python3-certbot-nginx -y
# Or for Ubuntu:
# sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d weliffleleaf.com -d www.weliffleleaf.com

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended)
```

Certbot will automatically update your Nginx configuration for HTTPS.

### Step 11: Update Frontend API URL

Edit `client/src/services/api.js` to use production URL:

```javascript
const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://weliffleleaf.com/api'
    : 'http://localhost:5001/api';
```

Then rebuild and redeploy:

```bash
# On local machine
cd client
npm run build

# Copy build to EC2
scp -i your-key.pem -r build/* ec2-user@your-ec2-ip:/var/www/littleleafplayschool/client/build/
```

### Step 12: Verify Deployment

1. **Check Backend:**
   ```bash
   pm2 status
   pm2 logs littleleaf-backend
   ```

2. **Check Nginx:**
   ```bash
   sudo systemctl status nginx
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Test the website:**
   - Visit: https://weliffleleaf.com
   - Should see the landing page
   - Try logging in as admin
   - Check gallery images load

## Post-Deployment Tasks

### 1. Monitor Application

```bash
# View backend logs
pm2 logs littleleaf-backend

# Monitor system resources
pm2 monit

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Setup Auto-Restart on Crash

PM2 already handles this, but verify:

```bash
pm2 startup
pm2 save
```

### 3. Enable Nginx Auto-Start

```bash
sudo systemctl enable nginx
```

### 4. Setup CloudWatch (Optional)

For monitoring:
- DynamoDB metrics
- EC2 CPU/Memory usage
- Application logs

## Updating the Application

When you make changes:

### Backend Changes:

```bash
# On EC2
cd /var/www/littleleafplayschool
git pull origin main
cd server
npm install --production
pm2 restart littleleaf-backend
```

### Frontend Changes:

```bash
# On local machine
cd client
npm run build

# Copy to EC2
scp -i your-key.pem -r build/* ec2-user@your-ec2-ip:/var/www/littleleafplayschool/client/build/
```

Or use a deployment script (see below).

## Deployment Script

Create `deploy.sh` in project root:

```bash
#!/bin/bash

echo "🚀 Deploying Little Leaf Play School..."

# Build frontend
echo "📦 Building frontend..."
cd client
npm run build

# Upload to EC2
echo "📤 Uploading to EC2..."
scp -i ~/path/to/your-key.pem -r build/* ec2-user@your-ec2-ip:/var/www/littleleafplayschool/client/build/

# SSH and update backend
echo "🔄 Updating backend..."
ssh -i ~/path/to/your-key.pem ec2-user@your-ec2-ip << 'EOF'
cd /var/www/littleleafplayschool
git pull origin main
cd server
npm install --production
pm2 restart littleleaf-backend
EOF

echo "✅ Deployment complete!"
echo "🌐 Visit: https://weliffleleaf.com"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Use it:
```bash
./deploy.sh
```

## Troubleshooting

### Backend not starting

```bash
# Check PM2 logs
pm2 logs littleleaf-backend --lines 50

# Check if port is in use
sudo netstat -tulpn | grep 5001

# Restart manually
pm2 restart littleleaf-backend
```

### Frontend showing blank page

1. Check browser console for errors
2. Verify API URL in `client/src/services/api.js`
3. Check Nginx configuration:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### SSL certificate issues

```bash
# Renew certificate
sudo certbot renew

# Test auto-renewal
sudo certbot renew --dry-run
```

### Database connection errors

1. Verify `.env` file has correct AWS credentials
2. Check IAM permissions for DynamoDB access
3. Verify `USE_LOCAL_DB=false`

### 502 Bad Gateway

- Backend is not running
- Check PM2: `pm2 status`
- Check backend logs: `pm2 logs littleleaf-backend`

### Images not loading

1. Verify S3 bucket policy allows public access
2. Check CORS configuration
3. Check browser console for CORS errors

## Security Checklist

- [ ] Changed default admin password
- [ ] Using strong JWT_SECRET
- [ ] SSL/HTTPS enabled
- [ ] AWS credentials secured (use IAM roles if possible)
- [ ] `.env` file not committed to git
- [ ] EC2 security group allows only necessary ports (22, 80, 443)
- [ ] DynamoDB access restricted to EC2 instance
- [ ] Regular backups enabled for DynamoDB

## Monitoring & Maintenance

### Weekly Tasks:
- Check PM2 logs for errors
- Review Nginx access logs
- Monitor DynamoDB costs in AWS Console

### Monthly Tasks:
- Update Node.js packages: `npm update`
- Review and rotate logs
- Check SSL certificate expiry

### Auto-Renewal:
SSL certificates auto-renew via certbot cron job. Verify:
```bash
sudo systemctl status certbot.timer
```

## Cost Optimization

### DynamoDB:
- Currently using provisioned capacity (5 RCU/WCU per table)
- Consider switching to on-demand pricing if usage is low
- Enable auto-scaling for production

### EC2:
- Instance already running (no additional cost)
- Monitor bandwidth usage

### S3:
- Already configured for gallery images
- Monitor storage costs monthly

## Backup Strategy

### DynamoDB:
```bash
# Enable Point-in-Time Recovery in AWS Console
# Or use AWS CLI:
aws dynamodb update-continuous-backups \
    --table-name LittleLeaf_Users \
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

### Code:
- Already in GitHub
- Consider setting up automatic backups of `.env` file (encrypted)

## Support

For deployment issues:
1. Check logs: `pm2 logs`
2. Check Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Verify DNS: `nslookup weliffleleaf.com`
4. Test backend directly: `curl http://localhost:5001/api/public/school-info`
