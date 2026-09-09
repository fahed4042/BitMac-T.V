const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const app = express();
app.use(express.static('public'));

// إعداد Cloudinary
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

// مسار الرفع مع معالجة الأخطاء
app.post('/upload-video', (req, res) => {
  upload.single('video')(req, res, (err) => {
    if (err) {
      console.error('Cloudinary Upload Error:', err);
      return res.status(500).json({ 
        success: false, 
        message: err.message || 'حدث خطأ أثناء رفع الفيديو على السحابة' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'لم يتم إرفاق أي فيديو' });
    }

    res.json({ success: true, url: req.file.path });
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
