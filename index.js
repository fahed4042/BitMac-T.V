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
app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ limit: '1000mb', extended: true }));
app.use(express.static('public'));

// إنشاء مجلد مؤقت لحفظ الفيديو على القرص الصلب لتجنب استهلاك الذاكرة (RAM)
const uploadDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// استخدام diskStorage لمنع انهيار السيرفر عند رفع الملفات الكبيرة
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2000 * 1024 * 1024 } // رفع الحد لـ 2GB
});

const BOT_TOKEN = process.env.BOT_TOKEN || '8740811206:AAG29igXLxFAZ9XjPoGbfAVOVMMsDYbnZxo';
const CHAT_ID = process.env.CHAT_ID || '1544455907'; 

let mediaDatabase = [];

// وظيفة إرسال رسالة نصية إلى تيليجرام
async function sendTelegramMessage(text) {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: text,
      parse_mode: 'Markdown'
    });
  } catch (err) {
    console.error('Telegram Message Error:', err.message);
  }
}

// 1. مسار رفع الفيديو عبر Streams والتنظيف التلقائي للملفات
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
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('video', fs.createReadStream(filePath), {
      filename: req.file.originalname || 'video.mp4'
    });
    formData.append('caption', `🎬 *تم رفع عمل جديد!*\n📌 *الاسم:* ${workName}\n📺 *النوع:* ${type === 'series' ? 'مسلسل' : 'فيلم'} ${workEpisode}`);

    const telegramResponse = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`,
      formData,
      {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 0
      }
    );

    // حذف الملف المؤقت فور الانتهاء لتوفير المساحة
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    if (telegramResponse.data && telegramResponse.data.ok) {
      const result = telegramResponse.data.result;
      const videoObj = result.video || result.document;
      const fileId = videoObj.file_id;

      const fileRoute = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
      const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileRoute.data.result.file_path}`;

      const newMediaItem = {
        id: Date.now(),
        type: type || 'movie',
        title: workName,
        episode: workEpisode,
        url: downloadUrl
      };
      mediaDatabase.unshift(newMediaItem);

      await sendTelegramMessage(`✅ *تمت المعالجة بنجاح*\n🔗 *الرابط المباشر:* ${downloadUrl}`);

      return res.json({ 
        success: true, 
        url: downloadUrl,
        item: newMediaItem
      });
    } else {
      return res.status(500).json({ success: false, message: 'فشل الرفع إلى تيليجرام' });
    }

  } catch (err) {
    // تنظيف القرص في حال حدوث خطأ
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    
    console.error('Telegram Upload Error:', err.response?.data || err.message);
    return res.status(500).json({ 
      success: false, 
      message: err.response?.data?.description || 'حدث خطأ أثناء الرفع (قد يكون الملف متجاوزاً لحدود البوت المباشرة 50MB).' 
    });
  }
});

// 2. مسار حفظ الفيديو برابط مباشر
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

    await sendTelegramMessage(`📥 *إضافة رابط جديد للمكتبة*\n📌 *الاسم:* ${title}\n🔗 *الرابط:* ${url}`);

    res.json({ success: true, url: url, item: newMediaItem });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ الرابط' });
  }
});

// 3. مسار API لجلب القائمة
app.get('/api/media-list', (req, res) => {
  res.json({
    success: true,
    total: mediaDatabase.length,
    data: mediaDatabase
  });
});

// 4. مسار API لتعديل عنصر
app.put('/api/media-update/:id', (req, res) => {
  const { id } = req.params;
  const { url, title, episode } = req.body;
  
  const item = mediaDatabase.find(m => m.id == id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'العنصر غير موجود' });
  }

  if (url) item.url = url;
  if (title) item.title = title;
  if (episode !== undefined) item.episode = episode;

  res.json({ success: true, message: 'تم التحديث بنجاح', item });
});

// 5. مسار API لحذف عمل
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
  startKeepAlive();
});

server.timeout = 0; // إلغاء المهلة الزمنية لضمان عدم قطع الرفع للملفات الضخمة
server.keepAliveTimeout = 600000;

// منع خمول السيرفر على Render
function startKeepAlive() {
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
  if (!RENDER_URL) return;

  setInterval(async () => {
    try {
      await axios.get(`${RENDER_URL}/api/media-list`);
      console.log('Keep-alive ping sent.');
    } catch (e) {
      console.log('Keep-alive ping failed:', e.message);
    }
  }, 4 * 60 * 1000);
}
