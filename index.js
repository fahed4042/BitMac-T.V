const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());

// إنشاء مجلد الرفع
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => {
        // حفظ الملف بصيغة 3gp لتوافق الأندرويد
        cb(null, 'voice_' + Date.now() + '.3gp');
    }
});

const upload = multer({ storage: storage });

// جعل الملفات قابلة للوصول عبر الرابط
app.use('/uploads', express.static('uploads'));

// صفحة فحص السيرفر
app.get('/', (req, res) => {
    res.send('Server is Online! Ready for uploads.');
});

// نقطة الرفع الأساسية
app.post('/upload', upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
