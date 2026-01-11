const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ status: "error", message: "رابط غير موجود" });

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': new URL(targetUrl).origin
            },
            timeout: 10000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // البحث عن الروابط في الوسوم
        let directLink = $('video source').attr('src') || $('video').attr('src') || $('iframe').attr('src');

        // البحث عن روابط m3u8 و mp4 داخل النصوص (للمواقع المشفرة)
        if (!directLink) {
            const regex = /(https?:\/\/[^"']+\.(m3u8|mp4)[^"']*)/g;
            const matches = html.match(regex);
            if (matches) directLink = matches[0];
        }

        if (directLink) {
            if (directLink.startsWith('//')) directLink = 'https:' + directLink;
            res.json({ status: "success", direct_link: directLink });
        } else {
            res.json({ status: "failed", message: "Link not found directly" });
        }
    } catch (e) {
        res.status(500).json({ status: "error", message: e.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
