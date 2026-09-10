const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.static('public'));

// استخدام الذاكرة المؤقتة لحفظ الملف مؤقتاً قبل إرساله لتيليجرام
const upload = multer({ storage: multer.memoryStorage() });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8291407370:AAHmsWnlw6IlIP5AKi1WwPw3nVblVB9OAoo';
// ضع هنا معرف الشات أو القناة التي تريد أن تُرسل إليها الفيديوهات (Chat ID)
const CHAT_ID = process.env.TELEGRAM_CHAT_ID; 

app.post('/upload-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'لم يتم إرفاق أي فيديو' });
    }

    if (!CHAT_ID) {
      return res.status(500).json({ success: false, message: 'يجيب تحديد TELEGRAM_CHAT_ID في متغيرات البيئة' });
    }

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
      // الحصول على معرف الملف (file_id) من تيليجرام
      const videoObj = result.video || result.document;
      const fileId = videoObj.file_id;

      // جلب رابط التحميل المباشر للملف من سيرفرات تيليجرام
      const fileRoute = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
      const filePath = fileRoute.data.result.file_path;
      const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

      return res.json({ 
        success: true, 
        url: downloadUrl 
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
