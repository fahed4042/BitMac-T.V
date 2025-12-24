
// index.js
const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// قائمة السيرفرات الحقيقية
const servers = {
    VSRC: "https://multiembed.mov/?video_id=",
    VXYZ: "https://vidsrc.to/embed/movie/",
    MAPI: "https://moviesapi.club/movie/",
    GDRV: "https://databasegdriveplayer.xyz/player.php?tmdb=",
    NTGO: "https://autoembed.cc/?id=",
    CLVB: "https://superembed.stream/?id="
};

// Endpoint يعطي رابط MP4 مباشرة
app.get('/get-video', async (req, res) => {
    const videoId = req.query.id;
    const serverKey = req.query.server;

    if (!videoId || !serverKey) {
        return res.status(400).send("❌ Missing id or server parameter");
    }

    const baseUrl = servers[serverKey.toUpperCase()];
    if (!baseUrl) return res.status(400).send("❌ سيرفر غير معروف");

    try {
        const pageUrl = baseUrl + videoId;
        const response = await axios.get(pageUrl);
        // البحث عن رابط MP4 في الصفحة
        const matches = response.data.match(/https?:\/\/[^'"]+\.mp4/g);

        if (matches && matches.length > 0) {
            return res.send(matches[0]); // نرسل أول رابط MP4
        } else {
            return res.status(404).send("❌ رابط MP4 غير موجود");
        }
    } catch (err) {
        return res.status(500).send("⚠️ خطأ في السيرفر: " + err.toString());
    }
});

app.listen(PORT, () => console.log(`BitMac-T.V server running on port ${PORT}`));
