# Gallery Quick Start - 3 Simple Steps

## Step 1: List Your S3 Images

```bash
cd server
node scripts/list-s3-images.js YOUR_BUCKET_NAME
```

This will output a ready-to-use JavaScript array. **Copy it!**

## Step 2: Update the Gallery Script

Open: `server/scripts/add-gallery-images.js`

1. Replace `YOUR_BUCKET_NAME` with your actual bucket name (line 12)
2. Paste the copied array from Step 1 to replace the `IMAGE_FILES` array (lines 15-40)

## Step 3: Run the Script

```bash
node scripts/add-gallery-images.js
```

**Done!** Visit http://localhost:3000 to see your gallery.

---

## Complete Example

### If your S3 bucket is: `littleleaf-photos`
### And contains: photo1.jpg, photo2.jpg, ..., photo24.jpg

**1. List images:**
```bash
node scripts/list-s3-images.js littleleaf-photos
```

**2. Output will be:**
```javascript
const IMAGE_FILES = [
    'photo1.jpg',
    'photo2.jpg',
    ...
    'photo24.jpg'
];
```

**3. Copy and paste into `add-gallery-images.js`**

**4. Also update bucket name in the same file:**
```javascript
const S3_BUCKET_NAME = 'littleleaf-photos';
```

**5. Run:**
```bash
node scripts/add-gallery-images.js
```

**6. Start your app and check the landing page!**

---

## What You Get

✅ 24 images displayed in a beautiful responsive grid
✅ Hover effects (images lift and zoom)
✅ Mobile-friendly layout
✅ Automatic loading from S3
✅ No categories needed - all images together

## Files Modified

- ✅ `client/src/pages/LandingPage.js` - Shows all gallery images
- ✅ `client/src/pages/LandingPage.css` - Improved gallery styling
- ✅ `server/scripts/add-gallery-images.js` - Script to populate database
- ✅ `server/scripts/list-s3-images.js` - Helper to list your S3 images

## Need Help?

See `GALLERY_SETUP.md` for detailed documentation.
