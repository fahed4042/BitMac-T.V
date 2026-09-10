const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

const GOFILE_TOKEN = process.env.GOFILE_TOKEN || 'IDiI86XL4WCWd0tt0kJz4Tqa9Zab3qGU';

app.use(cors());
app.use(express.json({ limit: '2000mb' }));
app.use(express.urlencoded({ limit: '2000mb', extended: true }));
app.use(express.static('public'));

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
  limits: { fileSize: 2000 * 1024 * 1024 }
});

let mediaDatabase = [];

app.get('/api/media-list', (req, res) => {
  res.json({ success: true, count: mediaDatabase.length, data: mediaDatabase });
});

// دالة الرفع الذكية مع تجربة السيرفرات البديلة أوتوماتيكياً
async function uploadToGoFile(filePath) {
  let serverList = ['store1', 'store2', 'store3'];
  
  // 1. محاولة جلب السيرفر النشط حالياً من GoFile
  try {
    const serversRes = await axios.get('https://api.gofile.io/servers', {
      headers: { Authorization: `Bearer ${GOFILE_TOKEN}` },
      timeout: 10000
    });
    if (serversRes.data && serversRes.data.status === 'ok') {
      const fetchedServers = serversRes.data.data?.servers;
      if (fetchedServers && fetchedServers.length > 0) {
        const primary = fetchedServers[0].name;
        serverList.unshift(primary); // إدراج السيرفر الأساسي في البداية
      }
    }
  } catch (e) {
    console.log('تنبيه: تعذر جلب قائمة السيرفرات، سيتم استخدام السيرفرات الافتراضية.');
  }

  // 2. التجربة التتابعية حتى ينجح الرفع
  let lastError = null;
  for (const serverName of serverList) {
    try {
      console.log(`Trying upload to GoFile server: ${serverName}...`);
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));

      const uploadUrl = `https://${serverName}.gofile.io/contents/upload/file`;
      
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${GOFILE_TOKEN}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 1800000
      });

      if (response.data && response.data.status === 'ok') {
        console.log(`Upload succeeded on server: ${serverName}`);
        return response.data.data;
      }
    } catch (err) {
      console.error(`Server ${serverName} failed:`, err.response?.data || err.message);
      lastError = err;
    }
  }

  throw new Error(lastError ? (lastError.response?.data?.message || lastError.message) : 'جميع سيرفرات GoFile غير متاحة حالياً');
}

app.post('/upload-video', upload.single('video'), async (req, res) => {
  req.setTimeout(1800000);
  res.setTimeout(1800000);

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'لم يتم اختيار فيديو' });
  }

  const filePath = req.file.path;

  try {
    const { title, type, episode } = req.body;
    const workName = title || 'بدون عنوان';
    const workEpisode = episode || '';

    const resultData = await uploadToGoFile(filePath);
    const downloadUrl = resultData.downloadPage;

    const newMediaItem = {
      id: Date.now(),
      type: type || 'movie',
      title: workName,
      episode: workEpisode,
      url: downloadUrl
    };

    mediaDatabase.unshift(newMediaItem);

    return res.json({
      success: true,
      url: downloadUrl,
      item: newMediaItem
    });

  } catch (err) {
    console.error('Final Upload Error:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'خطأ أثناء الرفع السحابي: ' + err.message 
    });
  } finally {
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
  }
});

app.post('/upload-video-url', (req, res) => {
  const { url, title } = req.body;
  if (!url || !title) {
    return res.status(400).json({ success: false, message: 'الرابط والاسم مطلوبان' });
  }

  const newMediaItem = {
    id: Date.now(),
    type: 'movie',
    title: title,
    episode: '',
    url: url
  };

  mediaDatabase.unshift(newMediaItem);

  return res.json({ success: true, url: url, item: newMediaItem });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
