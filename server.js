const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2000mb' }));
app.use(express.urlencoded({ limit: '2000mb', extended: true }));
app.use(express.static('public'));

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

const BOT_TOKEN = process.env.BOT_TOKEN || '8740811206:AAG29igXLxFAZ9XjPoGbfAVOVMMsDYbnZxo';
const CHAT_ID = process.env.CHAT_ID || '1544455907';
const API_ID = parseInt(process.env.API_ID || '33190715');
const API_HASH = process.env.API_HASH || 'ced91cea20b517420df5f296117d67f3';

let mediaDatabase = [];

// استخدام جلسة محددة لتجنب إعادة تسجيل الدخول في كل restart
const stringSession = new StringSession(process.env.TELEGRAM_SESSION || '');
const client = new TelegramClient(stringSession, API_ID, API_HASH, {
  connectionRetries: 5,
});

let isClientReady = false;

async function initTelegram() {
  try {
    console.log('جاري الاتصال ببروتوكول Telegram MTProto...');
    await client.start({ botAuthToken: () => BOT_TOKEN });
    isClientReady = true;
    console.log(`تم الاتصال بنجاح! جاهز لرفع الملفات على CHAT_ID: ${CHAT_ID}`);

    client.addEventHandler(async (event) => {
      const message = event.message;
      if (message && message.media && (message.video || message.document)) {
        const messageId = message.id;
        const caption = message.text || 'فيديو من تيليجرام';
        
        const exists = mediaDatabase.some(m => m.messageId === messageId);
        if (!exists) {
          const streamingUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'bitmac-t-v.onrender.com'}/stream/${messageId}`;
          const newMediaItem = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            type: caption.includes('مسلسل') ? 'series' : 'movie',
            title: caption.replace(/(🎬|📌|📺|\*|تم رفع عمل جديد!|الاسم:|النوع:)/g, '').trim() || `فيديو ${messageId}`,
            episode: '',
            url: streamingUrl,
            messageId: messageId,
            folderId: 'gen'
          };
          mediaDatabase.unshift(newMediaItem);
          console.log(`تم التقاط فيديو جديد: ${newMediaItem.title}`);
        }
      }
    }, new NewMessage({ chats: [CHAT_ID] }));

  } catch (err) {
    console.error('خطأ في الاتصال بتيليجرام (قد يكون حظر مؤقت FloodWait):', err.message);
  }
}

initTelegram();

// 1. مسار رفع الفيديو
app.post('/upload-video', upload.single('video'), async (req, res) => {
  req.setTimeout(0);
  res.setTimeout(0);

  if (!isClientReady) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(503).json({ success: false, message: 'الاتصال بتيليجرام غير جاهز حالياً، يرجى الانتظار قليلاً أو مراجعة الحظر المؤقت.' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'لم يتم إرفاق أي فيديو' });
  }

  const filePath = req.file.path;
  const { title, type, episode, folderId } = req.body;
  const workName = title || 'بدون عنوان';
  const workEpisode = episode || '';

  try {
    const result = await client.sendFile(CHAT_ID, {
      file: filePath,
      caption: `🎬 *تم رفع عمل جديد!*\n📌 *الاسم:* ${workName}\n📺 *النوع:* ${type === 'series' ? 'مسلسل' : 'فيلم'} ${workEpisode}`,
      workers: 1, // تقليل عدد الـ workers لتجنب الـ FloodWait
    });

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const messageId = result.id;
    const streamingUrl = `${req.protocol}://${req.get('host')}/stream/${messageId}`;

    const newMediaItem = {
      id: Date.now(),
      type: type || 'movie',
      title: workName,
      episode: workEpisode,
      url: streamingUrl,
      messageId: messageId,
      folderId: folderId || 'gen'
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

// 2. مسار بث الفيديو
app.get('/stream/:messageId', async (req, res) => {
  try {
    if (!isClientReady) return res.status(503).send('السيرفر غير متصل بتيليجرام حالياً');

    const messageId = parseInt(req.params.messageId);
    const messages = await client.getMessages(CHAT_ID, { ids: [messageId] });
    
    if (!messages || !messages[0] || !messages[0].media) {
      return res.status(404).send('الفيديو غير موجود');
    }

    res.setHeader('Content-Type', 'video/mp4');
    const buffer = await client.downloadMedia(messages[0].media, {});
    res.send(buffer);
  } catch (err) {
    console.error('Streaming Error:', err);
    res.status(500).send('خطأ في تشغيل الملف');
  }
});

// باقي المسارات كما هي...
app.post('/upload-video-url', async (req, res) => {
  try {
    const { url, title, type, episode, folderId } = req.body;
    if (!url || !title) return res.status(400).json({ success: false, message: 'الرابط والاسم مطلوبان' });

    const newMediaItem = { id: Date.now(), type: type || 'movie', title, episode: episode || '', url, folderId: folderId || 'gen' };
    mediaDatabase.unshift(newMediaItem);
    res.json({ success: true, url, item: newMediaItem });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ الرابط' });
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

  if (url !== undefined) item.url = url;
  if (title !== undefined) item.title = title;
  if (episode !== undefined) item.episode = episode;
  if (folderId !== undefined) item.folderId = folderId;

  res.json({ success: true, message: 'تم التحديث بنجاح', item });
});

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
