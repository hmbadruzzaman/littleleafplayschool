# Gallery Setup for Local Testing

This guide shows you how to add your 24 S3 images to the local database for testing.

## Step 1: Update Gallery Images in Dummy Data Script

Open: `server/scripts/seed-dummy-data.js`

Find line 437 and update:

### 1. Replace S3 Bucket Name

```javascript
const S3_BUCKET = 'your-bucket-name';
```

Change to your actual bucket name, for example:
```javascript
const S3_BUCKET = 'littleleaf-playschool-photos';
```

### 2. Replace Image Filenames

Update the `galleryImages` array (lines 440-465) with your actual image filenames:

**Example:**
If your images are named: photo1.jpg, photo2.jpg, etc.
```javascript
const galleryImages = [
    { filename: 'photo1.jpg', title: 'Classroom Learning' },
    { filename: 'photo2.jpg', title: 'Outdoor Play' },
    { filename: 'photo3.jpg', title: 'Art & Craft' },
    // ... continue for all 24 images
];
```

**You can customize the titles** to match what each image shows.

## Step 2: Restart the Server

The local database is automatically initialized when the server starts.

```bash
cd server
npm run local
```

You should see:
```
🔄 Initializing local database with dummy data...
🔟 Creating Media Gallery (24 Images)...
   ✓ Gallery Image 1: Classroom Learning
   ✓ Gallery Image 2: Outdoor Play
   ...
   ✓ Gallery Image 24: Graduation Day
✅ DUMMY DATA SEEDED SUCCESSFULLY!

📊 Summary:
   • Gallery Images: 24
```

## Step 3: View the Gallery

1. Start the client (in another terminal):
   ```bash
   cd client
   npm start
   ```

2. Visit: http://localhost:3000

3. Scroll down to the **Gallery** section

You'll see all 24 images displayed in a responsive grid!

## How It Works

### When Server Starts:
1. Server detects `USE_LOCAL_DB=true` in `.env`
2. Runs `initLocalDB.js` → calls `seedDummyData()`
3. `seedDummyData()` creates 24 media records in local database
4. Each record has your S3 image URL

### When Landing Page Loads:
1. Frontend calls: `GET /api/public/gallery`
2. Backend returns all media with `isPublic: true`
3. Frontend displays images in responsive grid

### Local Database:
- Stored in memory (RAM)
- Data is reset when server restarts
- No AWS connection needed
- Perfect for testing!

## Quick Reference

### File Structure:
```
server/scripts/seed-dummy-data.js  → Update bucket & filenames here (lines 437-465)
server/config/local-db.js          → In-memory database (no changes needed)
server/utils/initLocalDB.js        → Auto-initialization (no changes needed)
client/src/pages/LandingPage.js    → Displays gallery (already updated)
client/src/pages/LandingPage.css   → Gallery styling (already updated)
```

### S3 URL Format:
```
https://{BUCKET_NAME}.s3.amazonaws.com/{FILENAME}

Example:
https://littleleaf-photos.s3.amazonaws.com/classroom.jpg
```

### Region-Specific URL:
If your bucket is in a specific region (e.g., ap-south-1):
```javascript
const s3Url = `https://${S3_BUCKET}.s3.ap-south-1.amazonaws.com/${filename}`;
```

## Testing Checklist

- [ ] Update S3_BUCKET in seed-dummy-data.js
- [ ] Update galleryImages array with your filenames
- [ ] Restart server with `npm run local`
- [ ] Check server logs show "Gallery Images: 24"
- [ ] Visit http://localhost:3000
- [ ] Scroll to Gallery section
- [ ] Verify all 24 images are visible

## Troubleshooting

### Images not showing?

1. **Check S3 permissions**: Images must be publicly accessible
   - Go to S3 bucket → Permissions
   - Ensure "Block all public access" is OFF
   - Add bucket policy for public read

2. **Check browser console**: Press F12 → Console tab
   - Look for CORS errors
   - Look for 403/404 errors on image URLs

3. **Check image URLs**: Right-click on broken image → "Copy Image Address"
   - Paste in browser to test directly
   - Verify bucket name and filename are correct

4. **Check CORS configuration** in S3:
   ```json
   [
       {
           "AllowedHeaders": ["*"],
           "AllowedMethods": ["GET", "HEAD"],
           "AllowedOrigins": ["*"],
           "ExposeHeaders": []
       }
   ]
   ```

### Gallery section not showing at all?

Check server logs for errors during seeding:
```bash
cd server
npm run local
# Look for errors in the output
```

## Next Steps

Once you confirm the gallery works with local database:

1. **Test with real AWS DynamoDB**:
   - Set `USE_LOCAL_DB=false` in `.env`
   - Run the seeding script for DynamoDB
   
2. **Add upload feature** for admin to add more images

3. **Add image lightbox** (click to view full size)

4. **Optimize images** for web (compress, resize)

---

**Need Help?** Check the browser console and server logs for errors.
