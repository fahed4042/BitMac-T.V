const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ status: false, message: "No URL" });

    try {
        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
            timeout: 5000 
        });

        const html = response.data;
        // البحث عن روابط m3u8 أو mp4
        const videoMatch = html.match(/(https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)/i);

        if (videoMatch) {
            res.json({ status: true, stream_url: videoMatch[0] });
        } else {
            // إذا لم يجد رابط فيديو، يرجع الرابط الأصلي
            res.json({ status: true, stream_url: targetUrl });
        }
    } catch (e) {
        res.json({ status: false, stream_url: targetUrl });
    }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
