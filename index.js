const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// محرك استخراج الروابط
async function extractVideo(url) {
    try {
        // نرسل طلب للموقع مع User-Agent لنوهمه أننا متصفح حقيقي
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': url
            }
        });

        const html = response.data;

        // 1. البحث عن روابط M3U8 (البث المباشر)
        const m3u8Match = html.match(/https?:\/\/[^"']+\.m3u8[^"']*/);
        if (m3u8Match) return m3u8Match[0];

        // 2. البحث عن روابط MP4 المباشرة
        const mp4Match = html.match(/https?:\/\/[^"']+\.mp4[^"']*/);
        if (mp4Match) return mp4Match[0];

        // 3. البحث في السيرفرات المشفرة (مثل vidsrc) - محاولة فك iframe
        const iframeMatch = html.match(/iframe src="([^"]+)"/);
        if (iframeMatch) return iframeMatch[1];

        return null;
    } catch (error) {
        return null;
    }
}

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ status: false, message: "URL is missing" });
    }

    // محاولة استخراج الرابط المباشر
    const directLink = await extractVideo(targetUrl);

    if (directLink) {
        res.json({
            status: true,
            stream_url: directLink,
            timestamp: new Date().getTime()
        });
    } else {
        // إذا فشل الاستخراج المباشر، نعيد الرابط الأصلي كاحتياط
        res.json({ 
            status: false, 
            message: "Direct link not found, returning source",
            stream_url: targetUrl 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is live on port ${PORT}`);
});
