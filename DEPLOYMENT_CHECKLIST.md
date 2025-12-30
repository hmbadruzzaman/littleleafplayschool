# Deployment Checklist for weliffleleaf.com

## Pre-Deployment (Local Machine)

- [ ] **Generate JWT Secret**
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
  Copy the output

- [ ] **Update `server/.env.production`**
  - Replace `GENERATE_STRONG_SECRET_HERE` with the generated secret
  - Verify AWS credentials are correct

- [ ] **Build React Frontend**
  ```bash
  cd client
  npm run build
  ```
  Verify `client/build` folder is created

- [ ] **Commit and Push**
  ```bash
  git add .
  git commit -m "Production deployment ready"
  git push origin main
  ```

---

## EC2 Setup

- [ ] **SSH into EC2**
  ```bash
  ssh -i your-key.pem ec2-user@your-ec2-ip
  ```

- [ ] **Clone Repository**
  ```bash
  cd /var/www
  sudo git clone https://github.com/hmbadruzzaman/littleleafplayschool.git
  sudo chown -R ec2-user:ec2-user littleleafplayschool
  cd littleleafplayschool
  ```

- [ ] **Install Backend Dependencies**
  ```bash
  cd server
  npm install --production
  ```

- [ ] **Setup Environment File**
  ```bash
  cp .env.production .env
  cat .env  # Verify it looks correct
  ```

- [ ] **Start Backend with PM2**
  ```bash
  pm2 start npm --name "littleleaf-backend" -- start
  pm2 save
  pm2 startup  # Follow the command it gives you
  ```

- [ ] **Verify Backend is Running**
  ```bash
  pm2 status
  curl http://localhost:5001/api/public/school-info
  ```

---

## Nginx Configuration

- [ ] **Create Nginx Config File**
  ```bash
  sudo nano /etc/nginx/conf.d/littleleaf.conf
  ```

- [ ] **Paste This Configuration:**
  ```nginx
  server {
      listen 80;
      server_name weliffleleaf.com www.weliffleleaf.com;

      root /var/www/littleleafplayschool/client/build;
      index index.html;

      gzip on;
      gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

      location / {
          try_files $uri $uri/ /index.html;
      }

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

      location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
          expires 1y;
          add_header Cache-Control "public, immutable";
      }
  }
  ```

- [ ] **Test Nginx Configuration**
  ```bash
  sudo nginx -t
  ```
  Should say "test is successful"

- [ ] **Reload Nginx**
  ```bash
  sudo systemctl reload nginx
  ```

---

## Frontend Build Upload

- [ ] **Upload Build from Local Machine**
  ```bash
  # On your LOCAL machine (not EC2):
  cd client/build
  scp -i ~/path/to/your-key.pem -r * ec2-user@your-ec2-ip:/var/www/littleleafplayschool/client/build/
  ```

---

## DNS Configuration (Route 53)

- [ ] **Go to AWS Console → Route 53**

- [ ] **Create A Record**
  - Name: (leave blank or type `weliffleleaf.com`)
  - Type: A
  - Value: Your EC2 public IP address
  - TTL: 300
  - Click Create

- [ ] **Create CNAME Record for www**
  - Name: `www`
  - Type: CNAME
  - Value: `weliffleleaf.com`
  - TTL: 300
  - Click Create

- [ ] **Wait 5-15 minutes for DNS propagation**

- [ ] **Test DNS**
  ```bash
  nslookup weliffleleaf.com
  ```
  Should return your EC2 IP

---

## SSL Certificate (HTTPS)

- [ ] **Install Certbot (if not installed)**
  ```bash
  sudo yum install certbot python3-certbot-nginx -y
  ```

- [ ] **Get SSL Certificate**
  ```bash
  sudo certbot --nginx -d weliffleleaf.com -d www.weliffleleaf.com
  ```

- [ ] **Follow Certbot Prompts:**
  - Enter your email
  - Agree to terms (y)
  - Share email? (n)
  - Redirect HTTP to HTTPS? Choose 2 (Yes)

- [ ] **Verify SSL Works**
  - Visit: https://weliffleleaf.com
  - Should see green padlock

---

## Final Verification

- [ ] **Check Backend Logs**
  ```bash
  pm2 logs littleleaf-backend --lines 20
  ```

- [ ] **Check PM2 Status**
  ```bash
  pm2 status
  ```
  Should show `littleleaf-backend` as `online`

- [ ] **Test Landing Page**
  - Visit: https://weliffleleaf.com
  - Should see Little Leaf Play School landing page
  - Check gallery images load

- [ ] **Test Admin Login**
  - Visit: https://weliffleleaf.com/login
  - Login with:
    - ID: `ADM001`
    - Password: `password123`
  - Should redirect to dashboard

- [ ] **Test Inquiry Form**
  - Click "Get Started" button
  - Fill and submit inquiry form
  - Login as admin and check Inquiries tab

- [ ] **Check Both Apps Work**
  - Your blogger app should still work on its domain
  - Little Leaf should work on weliffleleaf.com
  - Both running simultaneously

---

## Post-Deployment

- [ ] **Change Admin Password**
  - Login as admin
  - Change password from `password123` to something secure

- [ ] **Test All Features:**
  - Gallery loads
  - Key Personnel section shows
  - Contact form works
  - Admin dashboard accessible
  - All tabs work in admin panel

- [ ] **Setup Monitoring**
  ```bash
  pm2 monit
  ```

- [ ] **Enable PM2 Startup**
  ```bash
  pm2 startup
  pm2 save
  ```

---

## Quick Commands Reference

**View Logs:**
```bash
pm2 logs littleleaf-backend
```

**Restart Backend:**
```bash
pm2 restart littleleaf-backend
```

**Check Nginx:**
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

**Update App Later:**
```bash
cd /var/www/littleleafplayschool
git pull origin main
cd server
npm install --production
pm2 restart littleleaf-backend
```

---

## Troubleshooting

**Backend not running?**
```bash
pm2 logs littleleaf-backend --lines 50
pm2 restart littleleaf-backend
```

**502 Bad Gateway?**
- Backend is down, check PM2 logs
- Or port 5001 is blocked

**Blank page?**
- Check browser console for errors
- Verify build files uploaded to `/var/www/littleleafplayschool/client/build/`

**Gallery images not loading?**
- Verify S3 bucket policy
- Check CORS configuration
- Open browser DevTools → Network tab

---

## Success Criteria

✅ https://weliffleleaf.com loads landing page
✅ Gallery shows all 23 images
✅ Login works with ADM001/password123
✅ Admin dashboard displays correctly
✅ Inquiry form submits successfully
✅ Your blogger app still works on its domain
✅ PM2 shows both processes online
✅ SSL certificate active (green padlock)

---

**Deployment Time Estimate:** 30-45 minutes

**Need help?** Check:
- PM2 logs: `pm2 logs`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Browser console for frontend errors
