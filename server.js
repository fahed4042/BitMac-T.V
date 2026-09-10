const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const app = express();
app.use(cors());
// رفع حدود استقبال البيانات لتتناسب مع الفيديوهات الضخمة
app.use(express.json({ limit: '2000mb' }));
app.use(express.urlencoded({ limit: '2000mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

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
  limits: { fileSize: 2000 * 1024 * 1024 } // دعم أحجام تصل إلى 2 جيجابايت
});

const BOT_TOKEN = process.env.BOT_TOKEN || '8740811206:AAG29igXLxFAZ9XjPoGbfAVOVMMsDYbnZxo';
const OWNER_ID = process.env.OWNER_ID || '1544455907'; // معرف التيليجرام الخاص بك للحماية

let mediaDatabase = [];

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// نظام ذكي للتعامل مع الصور والفيديوهات بأي حجم مع حماية المالك
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();

  // الحماية: التحقق من أن المرسل هو أنت فقط
  if (userId !== OWNER_ID) {
    return bot.sendMessage(chatId, '❌ عذراً، هذا البوت خاص ولا يمكنك استخدامه.');
  }

  const isPhoto = msg.photo && msg.photo.length > 0;
  const isVideo = msg.video || (msg.document && msg.document.mime_type && msg.document.mime_type.includes('video'));

  if (!isPhoto && !isVideo) return;

  const mediaTypeName = isPhoto ? 'الصورة' : 'الفيديو (بجودة كاملة وحجم كبير)';
  
  // رسالة تفاعلية فورية
  const statusMsg = await bot.sendMessage(chatId, `⏳ جاري معالجة واستخراج الرابط المباشر لـ ${mediaTypeName}...`);

  try {
    let fileId;
    if (isPhoto) {
      fileId = msg.photo[msg.photo.length - 1].file_id;
    } else {
      fileId = msg.video ? msg.video.file_id : msg.document.file_id;
    }

    const fileLink = await bot.getFileLink(fileId);

    // تحديث الرسالة بالرابط المباشر بعد الانتهاء
    await bot.editMessageText(
      `✅ **تم استخراج رابط الـ ${mediaTypeName} بنجاح:**\n\n\`${fileLink}\``,
      {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown'
      }
    );
  } catch (err) {
    console.error('Bot Error:', err);
    await bot.editMessageText('❌ حدث خطأ أثناء معالجة الملف الكبير.', {
      chat_id: chatId,
      message_id: statusMsg.message_id
    });
  }
});

// مسار لمنع السيرفر من النوم عبر UptimeRobot
app.get('/ping', (req, res) => {
  res.status(200).send('Server is awake!');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 1. مسار رفع الفيديوهات الكبيرة عبر السيرفر
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
    
    const sentMessage = await bot.sendVideo(OWNER_ID, filePath, {
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
      message: 'حدث خطأ أثناء الرفع: ' + err.message 
    });
  }
});

// 2. مسار البث المباشر للفيديوهات الكبيرة
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
