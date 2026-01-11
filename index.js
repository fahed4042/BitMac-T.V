const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.status(200).send('<h1>BitMac-TV Server is Live!</h1>');
});

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ status: "error", message: "No URL provided" });

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://vidsrc.to/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 10000
        });

        const html = response.data;
        const $ = cheerio.load(html);
        
        // محاولة البحث عن الرابط في عدة أماكن
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
            res.json({ status: "failed", message: "لم يتم العثور على الرابط المباشر، جرب سيرفر آخر" });
        }
    } catch (e) {
        // إرسال تفاصيل الخطأ بشكل أوضح
        res.status(200).json({ status: "error", message: "فشل في الوصول للموقع الأصلي: " + e.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
