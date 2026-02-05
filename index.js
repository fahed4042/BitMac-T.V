const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();

// إعداد مكان تخزين الملفات على السيرفر
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function(req, file, cb){
        cb(null, 'voice_' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// إنشاء مجلد uploads إذا لم يكن موجوداً
const fs = require('fs');
if (!fs.existsSync('./uploads')){
    fs.mkdirSync('./uploads');
}

// رابط لاستقبال الملفات (POST)
app.post('/upload', upload.single('audio'), (req, res) => {
    if (!req.file) return res.status(400).send('لم يتم رفع ملف');
    
    // إرسال رابط الملف بعد الرفع
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// جعل مجلد الملفات متاحاً للتحميل (GET)
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`السيرفر يعمل على منفذ ${PORT}`));
