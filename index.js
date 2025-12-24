
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 10000;

// قائمة الروابط الأساسية للسيرفرات
const SERVER_URLS = {
    vsrc: "https://vidsrc.to/embed/movie/",
    vxyz: "https://vidsrc.xyz/embed/movie/",
    mapi: "https://moviesapi.club/movie/",
    gdrv: "https://databasegdriveplayer.xyz/player.php?tmdb/",
    ntgo: "https://www.nontongo.win/embed/movie/",
    clvb: "https://moviesapi.club/movie/"
};

app.get('/get-video', async (req, res) => {
    const videoId = req.query.id;
    const server = req.query.server ? req.query.server.toLowerCase() : "vsrc";

    if (!videoId) {
        return res.status(400).send("❌ يرجى إرسال ID الفيلم");
    }

    const baseUrl = SERVER_URLS[server];
    if (!baseUrl) {
        return res.status(400).send("❌ سيرفر غير معروف");
    }

    try {
        const pageUrl = `${baseUrl}${videoId}`;
        
        // إرسال Headers لتبدو كأنك متصفح حقيقي لتجنب الحظر
        const response = await axios.get(pageUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Referer': pageUrl
            }
        });

        // البحث عن روابط MP4 أو M3U8 (أكثر استقراراً للبث)
        const regex = /https?:\/\/[^'"]+\.(mp4|m3u8)[^'"]*/g;
        const matches = response.data.match(regex);

        if (matches && matches.length > 0) {
            // إرسال أول رابط يتم العثور عليه
            return res.send(matches[0]);
        } else {
            // في حال لم يجد رابط مباشر، نرسل رابط الصفحة الأصلي كحل احتياطي
            // لأن بعض المشغلات تحتاج iframe وليس رابط مباشر
            return res.status(404).send("❌ لم يتم العثور على رابط مباشر، السيرفر قد يكون محمي");
        }

    } catch (err) {
        console.error(err.message);
        return res.status(500).send("⚠️ خطأ في السيرفر: " + err.message);
    }
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
