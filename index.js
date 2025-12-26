const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://ak.sv/',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
};

app.get('/', async (req, res) => {
    const targetUrl = req.query.url;
    // إذا أضفنا &direct=true للرابط سيرجع لنا رابط mp4 فقط
    const isDirect = req.query.direct === 'true';

    if (!targetUrl) return res.send("error");

    try {
        const response = await axios.get(targetUrl, { headers, timeout: 15000 });
        const html = response.data;
        
        // البحث عن روابط الفيديو المباشرة
        const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
        const videoLinks = [...new Set(html.match(videoRegex) || [])];

        if (isDirect) {
            // نرسل أول رابط فيديو يجده للتطبيق مباشرة
            return res.send(videoLinks.length > 0 ? videoLinks[0] : "not_found");
        }

        // الرد العادي للمتصفح (JSON)
        res.json({ status: "success", results: videoLinks });

    } catch (error) {
        res.send("error");
    }
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
