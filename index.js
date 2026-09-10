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
app.use(express.json({ limit: '2000mb' }));
app.use(express.urlencoded({ limit: '2000mb', extended: true }));
app.use(express.static('public'));

// 1. استخدام التخزين المؤقت على القرص لمنع انهيار السيرفر (RAM Out of Memory)
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
  limits: { fileSize: 2000 * 1024 * 1024 } // 2 جيجابايت
});

const BOT_TOKEN = '8740811206:AAG29igXLxFAZ9XjPoGbfAVOVMMsDYbnZxo';
const CHAT_ID = '1544455907'; 

// تنبيه: لرفع ملفات أكبر من 50MB يجب ربطه بسيرفر Telegram Bot API محلي (أو تغيير الرابط)
const TELEGRAM_API_URL = process.env.LOCAL_TELEGRAM_API || `https://api.telegram.org/bot${BOT_TOKEN}`;

let mediaDatabase = [];

app.post('/upload-video', upload.single('video'), async (req, res) => {
  req.setTimeout(1800000); // 30 دقيقة
  res.setTimeout(1800000);

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'لم يتم إرفاق أي فيديو' });
  }

  const filePath = req.file.path;

  try {
    const { title, type, episode } = req.body;
    const workName = title || 'بدون عنوان';
    const workEpisode = episode || '';

    // 2. إرسال الملف عبر Stream لتوفير الذاكرة
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('video', fs.createReadStream(filePath));
    formData.append('caption', `🎬 *تم رفع عمل جديد!*\n📌 *الاسم:* ${workName}\n📺 *النوع:* ${type === 'series' ? 'مسلسل' : 'فيلم'} ${workEpisode}`);

    const telegramResponse = await axios.post(
      `${TELEGRAM_API_URL}/sendVideo`,
      formData,
      {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 1800000
      }
    );

    if (telegramResponse.data && telegramResponse.data.ok) {
      const result = telegramResponse.data.result;
      const videoObj = result.video || result.document;
      const fileId = videoObj.file_id;

      // جلب مسار الملف
      const fileRoute = await axios.get(`${TELEGRAM_API_URL}/getFile?file_id=${fileId}`);
      const filePathOnTelegram = fileRoute.data.result.file_path;
      
      // رابط التحميل المباشر
      const downloadUrl = TELEGRAM_API_URL.includes('localhost') 
        ? `${TELEGRAM_API_URL}/file/bot${BOT_TOKEN}/${filePathOnTelegram}`
        : `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePathOnTelegram}`;

      const newMediaItem = {
        id: Date.now(),
        type: type || 'movie',
        title: workName,
        episode: workEpisode,
        url: downloadUrl
      };
      mediaDatabase.unshift(newMediaItem);

      return res.json({ success: true, url: downloadUrl, item: newMediaItem });
    } else {
      return res.status(500).json({ success: false, message: 'فشل الرفع إلى تيليجرام' });
    }

  } catch (err) {
    console.error('Upload Error:', err.message);
    return res.status(500).json({ success: false, message: 'خطأ أثناء الرفع: ' + err.message });
  } finally {
    // 3. حذف الملف المؤقت فور الانتهاء لتوفير مساحة السيرفر
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
