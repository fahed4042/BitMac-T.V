const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
require('dotenv').config();

const app = express();

// إعداد خدمة التخزين الدائم
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'my_app_videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'mkv', 'webm']
  }
});

const upload = multer({ storage: storage });

app.use(express.static('public'));

// مسار رفع الفيديو من صفحة HTML
app.post('/upload-video', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'لم يتم اختيار ملف' });
  }
  // إرجاع رابط الفيديو الدائم لصفحة HTML
  res.json({ success: true, url: req.file.path });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
