const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 10000;

const SERVERS = {
    vsrc: "https://vidsrc.to/embed/movie/",
    vxyz: "https://vidsrc.xyz/embed/movie/",
    mapi: "https://moviesapi.club/movie/",
    gdrv: "https://databasegdriveplayer.xyz/player.php?tmdb/",
    ntgo: "https://www.nontongo.win/embed/movie/",
    clvb: "https://moviesapi.club/movie/"
};

app.get('/get-video', async (req, res) => {
    const { id, server } = req.query;
    const serverKey = server ? server.toLowerCase() : "vsrc";
    const baseUrl = SERVERS[serverKey];

    if (!id || !baseUrl) {
        return res.status(400).send("❌ معرف الفيلم أو السيرفر غير صحيح");
    }

    try {
        const targetUrl = `${baseUrl}${id}`;
        const response = await axios.get(targetUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://vidsrc.to/'
            }
        });

        // البحث عن روابط الفيديو (MP4 أو M3U8)
        const videoRegex = /https?:\/\/[^'"]+\.(mp4|m3u8)[^'"]*/g;
        const matches = response.data.match(videoRegex);

        if (matches) {
            res.send(matches[0]);
        } else {
            res.status(404).send("❌ لم يتم العثور على رابط مباشر");
        }
    } catch (error) {
        res.status(500).send("⚠️ خطأ في جلب البيانات: " + error.message);
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

