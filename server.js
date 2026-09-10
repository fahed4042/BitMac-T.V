const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// إعداد مجلد التخزين المؤقت
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
  limits: { fileSize: 50 * 1024 * 1024 } 
});

const BOT_TOKEN = process.env.BOT_TOKEN || '8740811206:AAG29igXLxFAZ9XjPoGbfAVOVMMsDYbnZxo';
const CHAT_ID = process.env.CHAT_ID || '1544455907';

let mediaDatabase = [];

// تهيئة بوت واحد متكامل للرفع والاستقبال والتشغيل بوضع polling
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// استقبال الرسائل واستخراج الروابط المباشرة تلقائياً
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const videoObj = msg.video || (msg.document && msg.document.mime_type && msg.document.mime_type.includes('video') ? msg.document : null);

  if (videoObj) {
    try {
      const fileLink = await bot.getFileLink(videoObj.file_id);
      await bot.sendMessage(chatId, `✅ **الرابط المباشر:**\n\n\`${fileLink}\``, {
        parse_mode: 'Markdown'
      });
    } catch (err) {
      console.error('Telegram Bot Error:', err);
      await bot.sendMessage(chatId, 'حدث خطأ أثناء استخراج الرابط المباشر.');
    }
  }
});

// مسار لمنع السيرفر من النوم
app.get('/ping', (req, res) => {
  res.status(200).send('Server is awake!');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 1. مسار رفع الفيديو عبر السيرفر
app.post('/upload-video', upload.single('video'), async (req, res) => {
  req.setTimeout(0);
  res.setTimeout(0);

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'لم يتم إرفاق أي فيديو أو أن حجمه يتجاوز 50 ميجا' });
  }

  const filePath = req.file.path;
  const { title, type, episode } = req.body;
  const workName = title || 'بدون عنوان';
  const workEpisode = episode || '';

  try {
    const caption = `🎬 *تم رفع عمل جديد!*\n📌 *الاسم:* ${workName}\n📺 *النوع:* ${type === 'series' ? 'مسلسل' : 'فيلم'} ${workEpisode}`;
    
    const sentMessage = await bot.sendVideo(CHAT_ID, filePath, {
      caption: caption,
      parse_mode: 'Markdown'
    }, { contentType: 'video/mp4' });

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
    console.error('Upload Error:', err.response ? err.response.body : err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'حدث خطأ، تأكد أن حجم الفيديو لا يتجاوز 50 ميجابايت.' 
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
    res.status(500).send('خطأ في تشغيل الملف.');
  }
});

// 3. بقية المسارات الأساسية
app.get('/api/media-list', (req, res) => {
  res.json({
    success: true,
    total: mediaDatabase.length,
    data: mediaDatabase
  });
});

app.delete('/api/media-delete/:id', (req, res) => {
  const { id } = req.params;
  mediaDatabase = mediaDatabase.filter(m => m.id != id);
  res.json({ success: true, message: 'تم الحذف بنجاح' });
});

const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.timeout = 0;
server.keepAliveTimeout = 600000;
