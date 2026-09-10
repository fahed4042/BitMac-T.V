const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2000mb' }));
app.use(express.urlencoded({ limit: '2000mb', extended: true }));
app.use(express.static('public'));

// 1. إعداد مجلد التخزين المؤقت على القرص لمنع استهلاك الرام (OOM)
const uploadDir = path.join(__dirname, 'tmp_uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2000 * 1024 * 1024 } // حد 2 جيجابايت للملف
});

let mediaDatabase = [];

// 2. مسار الرفع السحابي المجاني عبر GoFile
app.post('/upload-video', upload.single('video'), async (req, res) => {
  req.setTimeout(1800000); // مهلة 30 دقيقة
  res.setTimeout(1800000);

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'لم يتم اختيار فيديو' });
  }

  const filePath = req.file.path;

  try {
    const { title, type, episode } = req.body;
    const workName = title || 'بدون عنوان';
    const workEpisode = episode || '';

    // أ) الحصول على أفضل سيرفر متاح من GoFile
    const serverResponse = await axios.get('https://api.gofile.io/servers');
    let targetServer = 'store1'; // سيرفر افتراضي
    if (serverResponse.data && serverResponse.data.status === 'ok') {
      const servers = serverResponse.data.data.servers;
      if (servers && servers.length > 0) {
        targetServer = servers[0].name;
      }
    }

    // ب) رفع الفيديو كـ Stream لتوفير الذاكرة العشوائية
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    const gofileResponse = await axios.post(
      `https://${targetServer}.gofile.io/contents/upload/file`,
      formData,
      {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 1800000
      }
    );

    if (gofileResponse.data && gofileResponse.data.status === 'ok') {
      const resultData = gofileResponse.data.data;
      const downloadUrl = resultData.downloadPage; // رابط صفحة التحميل أو تشغيل الفيديو

      const newMediaItem = {
        id: Date.now(),
        type: type || 'movie',
        title: workName,
        episode: workEpisode,
        url: downloadUrl
      };

      mediaDatabase.unshift(newMediaItem);

      return res.json({
        success: true,
        url: downloadUrl,
        item: newMediaItem
      });
    } else {
      return res.status(500).json({ success: false, message: 'فشل الرفع إلى الخدمة السحابية' });
    }

  } catch (err) {
    console.error('Cloud Upload Error:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'خطأ أثناء الرفع السحابي: ' + err.message 
    });
  } finally {
    // ج) حذف الملف المؤقت فوراً من السيرفر للحفاظ على المساحة
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
