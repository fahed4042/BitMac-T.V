const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// مفتاح API الخاص بك
const GOFILE_TOKEN = process.env.GOFILE_TOKEN || 'IDiI86XL4WCWd0tt0kJz4Tqa9Zab3qGU';

app.use(cors());
app.use(express.json({ limit: '2000mb' }));
app.use(express.urlencoded({ limit: '2000mb', extended: true }));
app.use(express.static('public'));

// مجلد التخزين المؤقت
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
  limits: { fileSize: 2000 * 1024 * 1024 }
});

let mediaDatabase = [];

// مسار جلب القائمة
app.get('/api/media-list', (req, res) => {
  res.json({ success: true, count: mediaDatabase.length, data: mediaDatabase });
});

// مسار الرفع المباشر
app.post('/upload-video', upload.single('video'), async (req, res) => {
  req.setTimeout(1800000); // 30 دقيقة
  res.setTimeout(1800000);

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'لم يتم اختيار فيديو' });
  }

  const filePath = req.file.path;

  try {
    const { title, type, episode } = req.body;
    const workName = title || 'بدون عنوان';
    const workEpisode = episode || '';

    // تجهيز الملف المرفوع
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    console.log('Uploading directly to GoFile API...');

    // الرفع المباشر إلى API GoFile الرسمية بـ Authorization Token
    const gofileResponse = await axios.post(
      'https://api.gofile.io/contents/upload/file',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${GOFILE_TOKEN}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 1800000
      }
    );

    if (gofileResponse.data && gofileResponse.data.status === 'ok') {
      const resultData = gofileResponse.data.data;
      const downloadUrl = resultData.downloadPage;

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
      return res.status(500).json({ 
        success: false, 
        message: gofileResponse.data?.message || 'فشل الرفع إلى الخدمة السحابية' 
      });
    }

  } catch (err) {
    console.error('Cloud Upload Error:', err.response?.data || err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'خطأ أثناء الرفع السحابي: ' + (err.response?.data?.message || err.message) 
    });
  } finally {
    // حذف الملف المؤقت من السيرفر
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
  }
});

// مسار السحب برابط
app.post('/upload-video-url', (req, res) => {
  const { url, title } = req.body;
  if (!url || !title) {
    return res.status(400).json({ success: false, message: 'الرابط والاسم مطلوبان' });
  }

  const newMediaItem = {
    id: Date.now(),
    type: 'movie',
    title: title,
    episode: '',
    url: url
  };

  mediaDatabase.unshift(newMediaItem);

  return res.json({ success: true, url: url, item: newMediaItem });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
