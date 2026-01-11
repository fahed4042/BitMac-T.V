const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

// استخدام المنفذ 10000 وهو الافتراضي لـ Render
const PORT = process.env.PORT || 10000;

// إضافة مسار أساسي لمنع خطأ Not Found عند فتح الرابط المباشر
app.get('/', (req, res) => {
    res.status(200).send('<h1>BitMac-TV Server is Live!</h1><p>Use /extract?url=YOUR_URL to get links.</p>');
});

// المسار المخصص للاستخراج
app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ status: "error", message: "No URL provided" });

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });

        const html = response.data;
        const $ = cheerio.load(html);
        let directLink = $('video source').attr('src') || $('video').attr('src') || $('iframe').attr('src');

        if (!directLink) {
            const regex = /(https?:\/\/[^"']+\.(m3u8|mp4)[^"']*)/g;
            const matches = html.match(regex);
            if (matches) directLink = matches[0];
        }

        if (directLink) {
            if (directLink.startsWith('//')) directLink = 'https:' + directLink;
            res.json({ status: "success", direct_link: directLink });
        } else {
            res.json({ status: "failed", message: "Direct link not found in this page" });
        }
    } catch (e) {
        res.status(500).json({ status: "error", message: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
