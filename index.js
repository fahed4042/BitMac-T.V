const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '500mb' })); // زيادة الحد المسموح لبيانات JSON
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(express.static('public'));

// استخدام الذاكرة المؤقتة لحفظ الملف مؤقتاً قبل إرساله لتيليجرام
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 2000 * 1024 * 1024 } // رفع الحد إلى 2 جيجابايت للملف الواحد
});

// التوكن الخاص ببوتك والمعرف
const BOT_TOKEN = '8740811206:AAG29igXLxFAZ9XjPoGbfAVOVMMsDYbnZxo';
const CHAT_ID = '1544455907'; 

// مصفوفة لتخزين الأفلام والمسلسلات في الذاكرة
let mediaDatabase = [];

// وظيفة لإرسال رسالة نصية أو تفاصيل إلى تيليجرام
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

// 1. مسار رفع الفيديو عبر تيليجرام والحفظ التلقائي
app.post('/upload-video', upload.single('video'), async (req, res) => {
  // زيادة مهلة الاتصال لهذا المسار لتجنب انقطاع الاتصال عند 65%
  req.setTimeout(600000); // 10 دقائق
  res.setTimeout(600000);

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'لم يتم إرفاق أي فيديو' });
    }

    const { title, type, episode } = req.body;
    const workName = title || 'بدون عنوان';
    const workEpisode = episode || '';

    // إعداد البيانات لإرسالها لتيليجرام
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('video', req.file.buffer, {
      filename: req.file.originalname || 'video.mp4',
      contentType: req.file.mimetype
    });
    formData.append('caption', `🎬 *تم رفع عمل جديد!*\n📌 *الاسم:* ${workName}\n📺 *النوع:* ${type === 'series' ? 'مسلسل' : 'فيلم'} ${workEpisode}`);

    // إرسال الفيديو إلى بوت تيليجرام مع مهلة زمنية طويلة
    const telegramResponse = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`,
      formData,
      {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 540000 // 9 دقائق مهلة لتيليجرام
      }
    );

    if (telegramResponse.data && telegramResponse.data.ok) {
      const result = telegramResponse.data.result;
      const videoObj = result.video || result.document;
      const fileId = videoObj.file_id;

      // جلب رابط التحميل المباشر للملف من سيرفرات تيليجرام
      const fileRoute = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
      const filePath = fileRoute.data.result.file_path;
      const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

      // حفظ العمل في قاعدة البيانات المؤقتة للسيرفر
      const newMediaItem = {
        id: Date.now(),
        type: type || 'movie',
        title: workName,
        episode: workEpisode,
        url: downloadUrl
      };
      mediaDatabase.unshift(newMediaItem);

      // إرسال إشعار تفصيلي مع الرابط إلى تيليجرام
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
    console.error('Telegram Upload Error:', err.response?.data || err.message);
    return res.status(500).json({ 
      success: false, 
      message: err.response?.data?.description || 'حدث خطأ أثناء رفع الفيديو، ربما حجم الملف كبير جداً أو انتهت مهلة الاتصال.' 
    });
  }
});

// 2. مسار إضافي لسحب أو حفظ الفيديو برابط مباشر وإرساله لتليجرام مباشرة بدون رفع ثقيل
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

    // إرسال اسم العمل ورابطه فوراً إلى تيليجرام
    await sendTelegramMessage(`📥 *إضافة رابط جديد للمكتبة*\n📌 *الاسم:* ${title}\n🔗 *الرابط:* ${url}`);

    res.json({ success: true, url: url, item: newMediaItem });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ الرابط' });
  }
});

// 3. مسار API خارجي لجلب قائمة الأفلام والمسلسلات لتطبيقك
app.get('/api/media-list', (req, res) => {
  res.json({
    success: true,
    total: mediaDatabase.length,
    data: mediaDatabase
  });
});

// 4. مسار API لتعديل رابط فيديو أو اسم عمل موجود مسبقاً
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

// زيادة المهلة العامة للسيرفر لمنع انقطاع الاتصال المفاجئ
server.timeout = 600000; // 10 دقائق
server.keepAliveTimeout = 600000;

// آلية لمنع خمول سيرفر Render (Keep-Alive كل 4 دقائق)
function startKeepAlive() {
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL; // رابط سيرفرك على Render تلقائياً إذا توفر
  if (!RENDER_URL) return;

  setInterval(async () => {
    try {
      await axios.get(`${RENDER_URL}/api/media-list`);
      console.log('Keep-alive ping sent successfully.');
    } catch (e) {
      console.log('Keep-alive ping failed:', e.message);
    }
  }, 4 * 60 * 1000); // كل 4 دقائق
}
