const express = require('express');
const axios = require('axios');
const fileUpload = require('express-fileupload');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات Cloudinary (ستضع معلوماتك هنا أو في إعدادات Render)
cloudinary.config({ 
  cloud_name: 'YOUR_CLOUD_NAME', 
  api_key: 'YOUR_API_KEY', 
  api_secret: 'YOUR_API_SECRET' 
});

app.use(cors());
app.use(express.json());
app.use(fileUpload({ useTempFiles: true }));

// 1. وظيفة استخراج الرابط (كودك الأصلي مع تحسين)
app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ status: false, message: "No URL provided" });

    try {
        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000 
        });
        const html = response.data;
        const videoMatch = html.match(/(https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)/i);

        if (videoMatch) {
            res.json({ status: true, stream_url: videoMatch[0] });
        } else {
            res.json({ status: true, stream_url: targetUrl });
        }
    } catch (e) {
        res.json({ status: false, message: "Error extracting video" });
    }
});

// 2. وظيفة الرفع ليعطيك رابط MP4 دائم
app.post('/upload', async (req, res) => {
    if (!req.files || !req.files.myVideo) {
        return res.status(400).json({ status: false, message: "No file uploaded" });
    }

    try {
        const file = req.files.myVideo;
        // رفع الفيديو إلى Cloudinary
        const result = await cloudinary.uploader.upload(file.tempFilePath, { 
            resource_type: "video",
            folder: "my_videos"
        });

        res.json({ 
            status: true, 
            stream_url: result.secure_url, // رابط مباشر ينتهي بـ mp4
            public_id: result.public_id 
        });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
