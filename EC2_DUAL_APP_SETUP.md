# EC2 Dual Application Setup

Your EC2 will host both applications with Nginx routing by domain name.

## Current Setup

### Blogger App (Existing)
- **Domain:** Your biodata domain
- **Port:** 3000
- **Location:** `/var/www/blogger` (or similar)
- **PM2 Name:** (existing process name)

### Little Leaf Play School (New)
- **Domain:** weliffleleaf.com
- **Backend Port:** 5001
- **Frontend:** Static build served by Nginx
- **Location:** `/var/www/littleleafplayschool`
- **PM2 Name:** `littleleaf-backend`

## Port Configuration

```
┌─────────────────────────────────────┐
│           Your EC2 Server            │
├─────────────────────────────────────┤
│                                      │
│  Blogger Backend     → Port 3000    │
│  Little Leaf Backend → Port 5001    │
│                                      │
│         ↓           ↓                │
│                                      │
│       Nginx (Port 80/443)           │
│    ┌──────────┬──────────┐          │
│    │          │          │           │
│  Blogger   Little Leaf                │
│  Domain    weliffleleaf.com          │
└─────────────────────────────────────┘
```

## Nginx Configuration

You'll have TWO Nginx configuration files:

### 1. Blogger Config (Existing)
`/etc/nginx/conf.d/blogger.conf` or similar

```nginx
server {
    listen 80;
    server_name yourblogger.domain;

    location / {
        proxy_pass http://localhost:3000;
        # ... other config
    }
}
```

### 2. Little Leaf Config (New)
`/etc/nginx/conf.d/littleleaf.conf`

```nginx
server {
    listen 80;
    server_name weliffleleaf.com www.weliffleleaf.com;

    root /var/www/littleleafplayschool/client/build;
    index index.html;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
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
}
```

Both apps run simultaneously without conflicts!

## PM2 Process List

After setup, `pm2 list` will show:

```
┌─────┬──────────────────────┬─────────┬─────────┐
│ id  │ name                 │ status  │ port    │
├─────┼──────────────────────┼─────────┼─────────┤
│ 0   │ blogger              │ online  │ 3000    │
│ 1   │ littleleaf-backend   │ online  │ 5001    │
└─────┴──────────────────────┴─────────┴─────────┘
```

## Deployment Steps Summary

### On Local Machine:

1. **Generate strong JWT secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Update `.env.production`** with the generated secret

3. **Build frontend:**
   ```bash
   cd client
   npm run build
   ```

4. **Commit and push:**
   ```bash
   git add .
   git commit -m "Production build and config"
   git push origin main
   ```

### On EC2:

5. **SSH into EC2:**
   ```bash
   ssh -i your-key.pem ec2-user@your-ec2-ip
   ```

6. **Clone repository:**
   ```bash
   cd /var/www
   sudo git clone https://github.com/hmbadruzzaman/littleleafplayschool.git
   sudo chown -R ec2-user:ec2-user littleleafplayschool
   ```

7. **Install dependencies:**
   ```bash
   cd littleleafplayschool/server
   npm install --production
   ```

8. **Setup production environment:**
   ```bash
   cp .env.production .env
   # Edit if needed:
   nano .env
   ```

9. **Start with PM2:**
   ```bash
   pm2 start npm --name "littleleaf-backend" -- start
   pm2 save
   ```

10. **Create Nginx config:**
    ```bash
    sudo nano /etc/nginx/conf.d/littleleaf.conf
    ```

    Paste the configuration from above.

11. **Test and reload Nginx:**
    ```bash
    sudo nginx -t
    sudo systemctl reload nginx
    ```

12. **Upload frontend build from local machine:**
    ```bash
    # On local machine:
    cd client/build
    scp -i ~/path/to/key.pem -r * ec2-user@your-ec2-ip:/var/www/littleleafplayschool/client/build/
    ```

13. **Setup Route 53:**
    - Create A record: `weliffleleaf.com` → Your EC2 IP
    - Create CNAME: `www.weliffleleaf.com` → `weliffleleaf.com`

14. **Setup SSL:**
    ```bash
    sudo certbot --nginx -d weliffleleaf.com -d www.weliffleleaf.com
    ```

## Verifying Both Apps Work

### Check Blogger:
```bash
curl http://localhost:3000
# Should return blogger response
```

### Check Little Leaf Backend:
```bash
curl http://localhost:5001/api/public/school-info
# Should return school info JSON
```

### Check PM2:
```bash
pm2 status
# Both processes should be online
```

### Check Nginx:
```bash
sudo nginx -t
# Should show "test is successful"
```

## Troubleshooting

### Port Conflicts
If you see "port already in use":
- Blogger uses 3000 ✓
- Little Leaf uses 5001 ✓
- No conflict!

### Both domains point to same app
- Check Nginx server_name directives
- Ensure each config has correct server_name

### SSL issues
Run certbot for each domain separately:
```bash
sudo certbot --nginx -d yourblogger.domain
sudo certbot --nginx -d weliffleleaf.com -d www.weliffleleaf.com
```

## Managing Both Apps

### Update Blogger:
```bash
cd /var/www/blogger
git pull
pm2 restart blogger
```

### Update Little Leaf:
```bash
cd /var/www/littleleafplayschool
git pull
cd server
npm install --production
pm2 restart littleleaf-backend
```

### View Logs:
```bash
pm2 logs blogger
pm2 logs littleleaf-backend
```

### Restart All:
```bash
pm2 restart all
```

### Monitor Resources:
```bash
pm2 monit
```

## Security Notes

1. Both apps use different ports - no conflicts
2. Both share the same EC2 security group
3. Ensure security group allows:
   - Port 22 (SSH)
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
   - Ports 3000 and 5001 should NOT be exposed (internal only)

## Cost Impact

Adding Little Leaf Play School:
- **EC2:** No additional cost (same instance)
- **DynamoDB:** ~$3-5/month
- **S3:** Minimal (already configured)
- **Data Transfer:** Minimal increase

Total additional cost: ~$3-5/month
