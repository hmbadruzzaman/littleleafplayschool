# Gallery Setup Guide

This guide will help you add your 24 S3 images to the landing page gallery.

## Step 1: Update the Script with Your S3 Details

Edit the file: `server/scripts/add-gallery-images.js`

### 1.1 Set your S3 bucket name

Replace this line:
```javascript
const S3_BUCKET_NAME = 'your-bucket-name';
```

With your actual bucket name, for example:
```javascript
const S3_BUCKET_NAME = 'littleleaf-playschool-media';
```

### 1.2 Add your image filenames

Replace the `IMAGE_FILES` array with your actual 24 image filenames.

For example, if your images are named:
- photo1.jpg
- photo2.jpg
- ...
- photo24.jpg

Update like this:
```javascript
const IMAGE_FILES = [
    'photo1.jpg',
    'photo2.jpg',
    'photo3.jpg',
    // ... add all 24 filenames
];
```

**Or**, if they're numbered like IMG_0001.jpg to IMG_0024.jpg, you can use:
```javascript
const IMAGE_FILES = Array.from({ length: 24 }, (_, i) => 
    `IMG_${String(i + 1).padStart(4, '0')}.jpg`
);
```

## Step 2: Ensure MEDIA Table Exists in DynamoDB

The script requires a DynamoDB table called `LittleLeaf_Media`.

### Create the table (if it doesn't exist):

```bash
cd server
node -e "
const AWS = require('aws-sdk');
AWS.config.update({
    region: process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB();

dynamodb.createTable({
    TableName: 'LittleLeaf_Media',
    KeySchema: [
        { AttributeName: 'mediaId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
        { AttributeName: 'mediaId', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
}, (err, data) => {
    if (err) console.error('Error:', err);
    else console.log('✅ Table created successfully');
});
"
```

## Step 3: Run the Script

Once you've updated the script with your bucket name and filenames:

```bash
cd server
node scripts/add-gallery-images.js
```

You should see output like:
```
🖼️  Adding Gallery Images to DynamoDB...

✅ Added: photo1.jpg
✅ Added: photo2.jpg
...
✅ Added: photo24.jpg

==================================================
✅ Successfully added: 24 images
==================================================
```

## Step 4: Verify the Gallery

1. Start your server:
   ```bash
   cd server
   npm run local
   ```

2. Start your client:
   ```bash
   cd client
   npm start
   ```

3. Visit: http://localhost:3000

4. Scroll down to the "Gallery" section

You should see all 24 images displayed in a responsive grid!

## How the Gallery Works

### Frontend
- **Component**: `client/src/pages/LandingPage.js`
- **Fetches images**: from `/api/public/gallery`
- **Displays**: All images with `isPublic: true`
- **Grid layout**: Responsive 3-4 column grid (adjusts based on screen size)

### Backend
- **Route**: `/api/public/gallery` (in `server/routes/public.js`)
- **Controller**: `publicController.getMediaGallery` (in `server/controllers/publicController.js`)
- **Database**: Queries `LittleLeaf_Media` table for `isPublic: true` items

### Database Schema
Each gallery image in DynamoDB has:
```javascript
{
    mediaId: "MEDIA#uuid",
    mediaType: "PHOTO",
    title: "Gallery Image 1",
    description: "School gallery photo 1",
    s3Url: "https://bucket.s3.amazonaws.com/image.jpg",
    thumbnailUrl: "https://bucket.s3.amazonaws.com/image.jpg",
    s3Key: "image.jpg",
    s3Bucket: "bucket-name",
    isPublic: true,
    category: "GENERAL",
    tags: ["school", "gallery"],
    uploadDate: "2024-01-01T00:00:00Z"
}
```

## Customization

### Change Image Titles

Edit the script at this line:
```javascript
title: `Gallery Image ${i + 1}`,
```

For example, to use custom titles:
```javascript
const IMAGE_TITLES = [
    "Classroom Activities",
    "Outdoor Play",
    "Art Class",
    // ... 24 titles
];

// Then in the loop:
title: IMAGE_TITLES[i],
```

### Change Number of Images Displayed

The landing page currently shows **ALL** images.

To limit to a specific number (e.g., first 12), edit `client/src/pages/LandingPage.js`:

```javascript
// Change this line:
setGallery(galleryRes.data.data);

// To this:
setGallery(galleryRes.data.data.slice(0, 12)); // Show first 12
```

### Add Image Categories

To organize images by category:

1. Update the script to set different categories:
```javascript
category: 'CLASSROOM', // or 'OUTDOOR', 'EVENTS', etc.
```

2. Filter in the frontend:
```javascript
publicAPI.getGallery('CLASSROOM') // Only classroom photos
```

## Gallery Features

✅ Responsive grid layout (1-4 columns based on screen size)
✅ Hover effects (images lift and zoom slightly)
✅ Optimized image loading from S3
✅ Mobile-friendly
✅ No categories required (all images shown together)

## Troubleshooting

### Images not showing?

1. **Check S3 permissions**: Images must be publicly accessible
   ```bash
   # Make bucket public (if allowed)
   aws s3api put-bucket-policy --bucket your-bucket-name --policy '{
       "Version": "2012-10-17",
       "Statement": [{
           "Sid": "PublicReadGetObject",
           "Effect": "Allow",
           "Principal": "*",
           "Action": "s3:GetObject",
           "Resource": "arn:aws:s3:::your-bucket-name/*"
       }]
   }'
   ```

2. **Check CORS** (if images are in different domain):
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

3. **Check DynamoDB table**: Verify data was inserted
   ```bash
   aws dynamodb scan --table-name LittleLeaf_Media --limit 5
   ```

4. **Check browser console**: Look for any CORS or network errors

### Images loading slow?

Consider using S3 CloudFront CDN for faster delivery:
1. Create CloudFront distribution for your S3 bucket
2. Update `s3Url` in the database to use CloudFront URL

## Cost Considerations

- **DynamoDB**: 24 records = ~0.024 MB = FREE (under 25 GB free tier)
- **S3 Storage**: Depends on image sizes (typically $0.023/GB)
- **S3 Requests**: GET requests for images (typically minimal cost)
- **Bandwidth**: Data transfer out (first 100 GB/month free)

For 24 images (~2 MB each = 48 MB total):
- Storage: ~$0.001/month
- Requests: ~$0.01/month (assuming 1000 views/month)
- **Total: < $0.02/month**

## Next Steps

After setting up the gallery, you might want to:

1. **Add image upload feature** for admin dashboard
2. **Create image lightbox** (click to view full size)
3. **Add filtering** by categories/tags
4. **Add lazy loading** for better performance
5. **Add image captions** from DynamoDB

Let me know if you need help with any of these features!
