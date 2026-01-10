const express = require('express');
const multer = require('multer'); // مكتبة للتعامل مع رفع الملفات
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// إعداد مكان تخزين الفيديوهات المرفوعة
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function(req, file, cb){
        // تسمية الملف بوقته الحالي لضمان عدم التكرار
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// جعل مجلد uploads متاحاً للعامة (عشان يعطيك رابط شغال)
app.use('/videos', express.static('uploads'));

// كودك الأصلي للبحث عن الروابط (Extract)
app.get('/extract', async (req, res) => {
    // ... كودك الحالي ...
});

// إضافة نقطة (Endpoint) لرفع الفيديو من جهازك
app.post('/upload', upload.single('myVideo'), (req, res) => {
    if (!req.file) return res.send({ status: false, message: "No file uploaded" });
    
    // بناء الرابط الخاص بك
    const videoUrl = `${req.protocol}://${req.get('host')}/videos/${req.file.filename}`;
    res.json({ status: true, stream_url: videoUrl });
});

app.listen(PORT, () => console.log(`Server is Live on port ${PORT}`));
