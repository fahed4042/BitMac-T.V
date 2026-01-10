const express = require('express');
const axios = require('axios');
const fileUpload = require('express-fileupload');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// قاعدة بيانات وهمية لتخزين الفيديوهات (ستختفي عند ريستارت السيرفر في رندر)
let savedVideos = [];

cloudinary.config({ 
  cloud_name: process.env.YOUR_CLOUD_NAME, 
  api_key: process.env.YOUR_API_KEY, 
  api_secret: process.env.YOUR_API_SECRET 
});

app.use(cors());
app.use(express.json());
app.use(fileUpload({ useTempFiles: true }));

// جلب قائمة الفيديوهات المحفوظة
app.get('/my-library', (req, res) => {
    res.json({ status: true, videos: savedVideos });
});

// رفع وتحويل أي فيديو (سواء من الهاتف أو من رابط خارجي)
app.post('/process-video', async (req, res) => {
    try {
        let source;
        if (req.files && req.files.myVideo) {
            source = req.files.myVideo.tempFilePath;
        } else if (req.body.url) {
            source = req.body.url;
        } else {
            return res.status(400).json({ status: false, message: "No source provided" });
        }

        const result = await cloudinary.uploader.upload(source, { 
            resource_type: "video",
            folder: "bitmac_tv"
        });

        const newVideo = {
            id: result.public_id,
            url: result.secure_url,
            name: req.body.customName || "فيديو جديد",
            date: new Date().toLocaleDateString()
        };

        savedVideos.unshift(newVideo); // إضافة الفيديو لأول القائمة
        res.json({ status: true, video: newVideo });

    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

app.listen(PORT, () => console.log(`Server Live on ${PORT}`));
