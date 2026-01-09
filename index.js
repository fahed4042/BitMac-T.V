const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ status: false, message: "No URL" });

    try {
        // نطلب الصفحة بمهلة زمنية قصيرة عشان ما يعلق السيرفر
        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 7000 
        });

        const html = response.data;
        // البحث عن أول رابط ينتهي بـ mp4 أو m3u8 في كود الصفحة
        const videoMatch = html.match(/(https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)/i);

        if (videoMatch) {
            res.json({ status: true, stream_url: videoMatch[0] });
        } else {
            // إذا لم يجد رابطاً مباشراً، نرسل الرابط الأصلي للمشغل ليجربه
            res.json({ status: true, stream_url: targetUrl });
        }
    } catch (e) {
        res.json({ status: false, stream_url: targetUrl });
    }
});

app.listen(PORT, () => console.log(`Server is Live on port ${PORT}`));
