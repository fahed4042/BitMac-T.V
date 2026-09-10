const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir));
app.use(express.static('public'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2000 * 1024 * 1024 }
});

let mediaDatabase = [];

app.post('/upload-video', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'لم يتم إرفاق أي فيديو' });
    }

    const { title, type, episode, folderId } = req.body;
    const workName = title || 'بدون عنوان';
    const workEpisode = episode || '';

    // استخدام رابط رندر الأساسي مباشرة لتجنب أي مشاكل في الروابط
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.get('host') || 'localhost:10000'}`;
    const directUrl = `${baseUrl}/uploads/${req.file.filename}`;

    const newMediaItem = {
      id: Date.now().toString(),
      folderId: folderId || 'gen',
      type: type || 'movie',
      title: workName,
      episode: workEpisode,
      url: directUrl
    };

    mediaDatabase.unshift(newMediaItem);

    res.json({ 
      success: true, 
      message: 'تم رفع الفيديو بنجاح',
      item: newMediaItem
    });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ success: false, message: 'خطأ: ' + err.message });
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
    res.status(500).json({ success: false, message: 'حدث خطأ' });
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
  const item = mediaDatabase.find(m => m.id == id);
  if (item && item.url.includes('/uploads/')) {
    const filename = path.basename(item.url);
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
  }
  mediaDatabase = mediaDatabase.filter(m => m.id != id);
  res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
server.timeout = 600000;
server.keepAliveTimeout = 600000;
