const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(express.static('public'));

// إنشاء مجلد مؤقت لتخزين الملفات أثناء الرفع لحماية الذاكرة
const uploadDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2000 * 1024 * 1024 } // دعم ملفات حتى 2 جيجابايت
});

// مصفوفة لتخزين الأفلام والمسلسلات في الذاكرة
let mediaDatabase = [];

// 1. مسار رفع الفيديو وتوجيهه مباشرة إلى Archive.org
app.post('/upload-video', upload.single('video'), async (req, res) => {
  req.setTimeout(600000); // 10 دقائق مهلة
  res.setTimeout(600000);

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'لم يتم إرفاق أي فيديو' });
  }

  const filePath = req.file.path;
  const { title, type, episode } = req.body;
  const workName = title || 'بدون عنوان';
  const workEpisode = episode || '';

  // إنشاء معرف فريد وآمن لـ Archive.org (يجب أن يكون بحروف إنجليزية صغيرة وأرقام)
  const safeIdentifier = `bitmac-tv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const fileName = req.file.originalname.replace(/\s+/g, '_');
  const archiveUploadUrl = `https://s3.us.archive.org/${safeIdentifier}/${fileName}`;

  try {
    const fileStream = fs.createReadStream(filePath);

    // الرفع المباشر إلى Archive.org عبر S3 API
    await axios.put(archiveUploadUrl, fileStream, {
      headers: {
        'Authorization': `LOW ${process.env.ARCHIVE_ACCESS_KEY}:${process.env.ARCHIVE_SECRET_KEY}`,
        'x-archive-auto-make-bucket': '1', // إنشاء المجلد تلقائياً على الأرشيف
        'Content-Type': req.file.mimetype || 'video/mp4'
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 540000 // 9 دقائق
    });

    // حذف الملف المؤقت من سيرفر Render لتوفير المساحة
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // الرابط المباشر للتشغيل والتحميل من Archive.org
    const directUrl = `https://archive.org/download/${safeIdentifier}/${fileName}`;

    const newMediaItem = {
      id: Date.now(),
      type: type || 'movie',
      title: workName,
      episode: workEpisode,
      url: directUrl
    };
    mediaDatabase.unshift(newMediaItem);

    return res.json({ 
      success: true, 
      url: directUrl,
      item: newMediaItem
    });

  } catch (err) {
    // تنظيف الملف المؤقت في حال حدوث خطأ
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error('Archive Upload Error:', err.response?.data || err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'فشل الرفع إلى الأرشيف: تأكد من صحة مفاتيح Archive.org S3 Keys.' 
    });
  }
});

// 2. مسار إضافي لحفظ رابط مباشر جاهز
app.post('/upload-video-url', async (req, res) => {
  try {
    const { url, title, type, episode } = req.body;
    if (!url || !title) {
      return res.status(400).json({ success: false, message: 'الرابط والاسم مطلوبان' });
    }

    const newMediaItem = {
      id: Date.now(),
      type: type || 'movie',
      title: title,
      episode: episode || '',
      url: url
    };
    mediaDatabase.unshift(newMediaItem);

    res.json({ success: true, url: url, item: newMediaItem });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ الرابط' });
  }
});

// 3. مسار API لجلب قائمة المحتوى لتطبيقاتك
app.get('/api/media-list', (req, res) => {
  res.json({
    success: true,
    total: mediaDatabase.length,
    data: mediaDatabase
  });
});

// 4. مسار حذف عنصر
app.delete('/api/media-delete/:id', (req, res) => {
  const { id } = req.params;
  mediaDatabase = mediaDatabase.filter(m => m.id != id);
  res.json({ success: true, message: 'تم الحذف بنجاح' });
});

const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startKeepAlive();
});

server.timeout = 600000;
server.keepAliveTimeout = 600000;

function startKeepAlive() {
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
  if (!RENDER_URL) return;
  setInterval(async () => {
    try {
      await axios.get(`${RENDER_URL}/api/media-list`);
    } catch (e) {}
  }, 4 * 60 * 1000);
}
