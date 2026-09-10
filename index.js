const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json()); // لدعم استقبال بيانات JSON في الـ API
app.use(express.static('public'));

// استخدام الذاكرة المؤقتة لحفظ الملف مؤقتاً قبل إرساله لتيليجرام
const upload = multer({ storage: multer.memoryStorage() });

// التوكن الخاص ببوتك والمعرف
const BOT_TOKEN = '8740811206:AAG29igXLxFAZ9XjPoGbfAVOVMMsDYbnZxo';
const CHAT_ID = '1544455907'; 

// مصفوفة لتخزين الأفلام والمسلسلات في الذاكرة (أو يمكنك ربطها بقاعدة بيانات لاحقاً)
let mediaDatabase = [];

// 1. مسار رفع الفيديو عبر تيليجرام والحفظ التلقائي
app.post('/upload-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'لم يتم إرفاق أي فيديو' });
    }

    const { title, type, episode } = req.body;

    // إعداد البيانات لإرسالها لتيليجرام
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('video', req.file.buffer, {
      filename: req.file.originalname || 'video.mp4',
      contentType: req.file.mimetype
    });

    // إرسال الفيديو إلى بوت تيليجرام
    const telegramResponse = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`,
      formData,
      {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity
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
        title: title || 'بدون عنوان',
        episode: episode || '',
        url: downloadUrl
      };
      mediaDatabase.unshift(newMediaItem);

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
      message: err.response?.data?.description || 'حدث خطأ أثناء رفع الفيديو' 
    });
  }
});

// 2. مسار API خارجي لجلب قائمة الأفلام والمسلسلات لتطبيقك
app.get('/api/media-list', (req, res) => {
  res.json({
    success: true,
    total: mediaDatabase.length,
    data: mediaDatabase
  });
});

// 3. مسار API لتعديل رابط فيديو أو اسم عمل موجود مسبقاً
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

// 4. مسار API لحذف عمل
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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
