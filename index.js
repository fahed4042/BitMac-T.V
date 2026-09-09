const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ذاكرة المؤقت لأسماء الفيديوهات في الخادم
const uploadedVideos = [];

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // تحديد المجلد ديناميكياً من المدخلات أو افتراضي
    const targetFolder = req.body.folderName || 'my_app_videos';
    return {
      folder: targetFolder,
      resource_type: 'video',
      allowed_formats: ['mp4', 'mov', 'mkv', 'webm'],
      public_id: req.body.videoTitle ? `${Date.now()}_${req.body.videoTitle}` : undefined
    };
  }
});

const upload = multer({ storage: storage });

// مسار رفع الفيديو مع الاسم والمجلد
app.post('/upload-video', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'لم يتم اختيار ملف' });
  }

  const videoData = {
    title: req.body.videoTitle || 'فيديو بدون عنوان',
    folder: req.body.folderName || 'my_app_videos',
    url: req.file.path,
    createdAt: new Date().toLocaleTimeString('ar-EG')
  };

  uploadedVideos.unshift(videoData);

  res.json({ success: true, video: videoData, allVideos: uploadedVideos });
});

// مسار جلب قائمة الفيديوهات المرفوعة
app.get('/api/videos', (req, res) => {
  res.json({ success: true, videos: uploadedVideos });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
