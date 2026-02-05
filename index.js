const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const http = require('http'); // أضفنا هذا لعمل الـ Ping

const app = express();
app.use(cors());

// إنشاء مجلد الرفع
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => {
        cb(null, 'voice_' + Date.now() + '.3gp');
    }
});

const upload = multer({ storage: storage });

app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
    res.send('Server is Online! Ready for uploads.');
});

app.post('/upload', upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// --- كود الحفاظ على اليقظة (Keep-Alive) ---
// يقوم السيرفر بطلب نفسه كل دقيقة لمنع Render من النوم
const SERVER_URL = 'https://bitmac-t-v-1.onrender.com/'; 

setInterval(() => {
    http.get(SERVER_URL, (res) => {
        console.log('Keep-alive ping sent, status: ' + res.statusCode);
    }).on('error', (err) => {
        console.log('Keep-alive error: ' + err.message);
    });
}, 60000); // 60000 ملي ثانية = 1 دقيقة
// ----------------------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { 
    console.log(`Server running on port ${PORT}`); 
});
