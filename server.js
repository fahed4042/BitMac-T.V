const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

const uploadDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// تقديم الملفات الثابتة من مجلد public
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname ? file.originalname.replace(/\s+/g, '_') : 'video.mp4';
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2000 * 1024 * 1024 }
});

let mediaDatabase = [];

app.post('/upload-video', upload.single('video'), async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'لم يتم إرفاق أي فيديو' });
    }

    filePath = req.file.path;
    const { title, type, episode, folderId } = req.body;
    const workName = title || 'بدون عنوان';
    const workEpisode = episode || '';

    console.log(`[رفع] جاري رفع الملف: ${workName} إلى Catbox...`);

    const form = new FormData();
    form.append('reqtype', 'upload-file');
    form.append('fileToUpload', fs.createReadStream(filePath));

    const catboxRes = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: { ...form.getHeaders() },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 120000 // 2 minutes timeout
    });

    const directUrl = catboxRes.data ? catboxRes.data.trim() : '';

    if (!directUrl || !directUrl.startsWith('http')) {
      throw new Error('فشل الحصول على رابط مباشر صالح من Catbox');
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const newMediaItem = {
      id: Date.now().toString(),
      folderId: folderId || 'gen',
      type: type || 'movie',
      title: workName,
      episode: workEpisode,
      url: directUrl
    };

    mediaDatabase.unshift(newMediaItem);
    console.log(`[نجاح] تمت إضافة العمل: ${workName}`);

    res.json({ 
      success: true, 
      message: 'تم الرفع إلى Catbox بنجاح',
      item: newMediaItem
    });
  } catch (err) {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch(e) {}
    }
    console.error('Catbox Upload Error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'خطأ أثناء الرفع: ' + (err.response?.data || err.message) 
    });
  }
});

app.post('/upload-video-url', (req, res) => {
  try {
    const { url, title, type, episode, folderId } = req.body;
    if (!url || !title) {
      return res.status(400).json({ success: false, message: 'الرابط والاسم مطلوبان' });
    }

    const newMediaItem = {
      id: Date.now().toString(),
      folderId: folderId || 'gen',
      type: type || 'movie',
      title: title,
      episode: episode || '',
      url: url
    };
    mediaDatabase.unshift(newMediaItem);

    res.json({ success: true, url: url, item: newMediaItem });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
  }
});

app.get('/api/media-list', (req, res) => {
  res.json({ success: true, total: mediaDatabase.length, data: mediaDatabase });
});

app.put('/api/media-update/:id', (req, res) => {
  const { id } = req.params;
  const { url, title, episode, folderId } = req.body;
  const item = mediaDatabase.find(m => m.id == id);
  if (!item) return res.status(404).json({ success: false, message: 'العنصر غير موجود' });

  if (url) item.url = url;
  if (title) item.title = title;
  if (episode !== undefined) item.episode = episode;
  if (folderId) item.folderId = folderId;

  res.json({ success: true, item });
});

app.delete('/api/media-delete/:id', (req, res) => {
  const { id } = req.params;
  mediaDatabase = mediaDatabase.filter(m => m.id != id);
  res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
server.timeout = 120000;
server.keepAliveTimeout = 120000;
