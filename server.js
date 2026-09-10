const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2000mb' }));
app.use(express.urlencoded({ limit: '2000mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// إعداد مجلد التخزين المؤقت
const uploadDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2000 * 1024 * 1024 }
});

// مفاتيح الاتصال
const BOT_TOKEN = process.env.BOT_TOKEN || '8740811206:AAG29igXLxFAZ9XjPoGbfAVOVMMsDYbnZxo';
const CHAT_ID = process.env.CHAT_ID || '1544455907';

let mediaDatabase = [];

// تهيئة البوت باستخدام Telegram Bot API المستقرة
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 1. مسار رفع الفيديو
app.post('/upload-video', upload.single('video'), async (req, res) => {
  req.setTimeout(0);
  res.setTimeout(0);

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'لم يتم إرفاق أي فيديو' });
  }

  const filePath = req.file.path;
  const { title, type, episode } = req.body;
  const workName = title || 'بدون عنوان';
  const workEpisode = episode || '';

  try {
    const caption = `🎬 *تم رفع عمل جديد!*\n📌 *الاسم:* ${workName}\n📺 *النوع:* ${type === 'series' ? 'مسلسل' : 'فيلم'} ${workEpisode}`;
    
    // إرسال الفيديو لتيليجرام
    const sentMessage = await bot.sendVideo(CHAT_ID, filePath, {
      caption: caption,
      parse_mode: 'Markdown'
    });

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const messageId = sentMessage.message_id;
    const fileId = sentMessage.video ? sentMessage.video.file_id : null;
    const streamingUrl = `${req.protocol}://${req.get('host')}/stream/${messageId}`;

    const newMediaItem = {
      id: Date.now(),
      type: type || 'movie',
      title: workName,
      episode: workEpisode,
      url: streamingUrl,
      messageId: messageId,
      fileId: fileId
    };
    mediaDatabase.unshift(newMediaItem);

    return res.json({ 
      success: true, 
      url: streamingUrl,
      item: newMediaItem
    });

  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Upload Error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'حدث خطأ أثناء الرفع إلى تيليجرام: ' + err.message 
    });
  }
});

// 2. مسار جلب وتحميل الفيديو للبث
app.get('/stream/:messageId', async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const mediaItem = mediaDatabase.find(m => m.messageId === messageId);

    if (!mediaItem || !mediaItem.fileId) {
      return res.status(404).send('الفيديو غير موجود في قاعدة البيانات');
    }

    const stream = bot.getFileStream(mediaItem.fileId);
    res.setHeader('Content-Type', 'video/mp4');
    stream.pipe(res);
  } catch (err) {
    console.error('Streaming Error:', err);
    res.status(500).send('خطأ في تشغيل الملف');
  }
});

// 3. مسار حفظ فيديو برابط مباشر
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

// 4. مسار جلب قائمة الأعمال
app.get('/api/media-list', (req, res) => {
  res.json({
    success: true,
    total: mediaDatabase.length,
    data: mediaDatabase
  });
});

// 5. مسار تعديل عنصر
app.put('/api/media-update/:id', (req, res) => {
  const { id } = req.params;
  const { url, title, episode } = req.body;
  
  const item = mediaDatabase.find(m => m.id == id);
  if (!item) return res.status(404).json({ success: false, message: 'العنصر غير موجود' });

  if (url) item.url = url;
  if (title) item.title = title;
  if (episode !== undefined) item.episode = episode;

  res.json({ success: true, message: 'تم التحديث بنجاح', item });
});

// 6. مسار حذف عنصر
app.delete('/api/media-delete/:id', (req, res) => {
  const { id } = req.params;
  const initialLength = mediaDatabase.length;
  mediaDatabase = mediaDatabase.filter(m => m.id != id);

  if (mediaDatabase.length === initialLength) {
    return res.status(404).json({ success: false, message: 'العنصر غير موجود' });
  }

  res.json({ success: true, message: 'تم الحذف بنجاح' });
});

const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.timeout = 0;
server.keepAliveTimeout = 600000;
