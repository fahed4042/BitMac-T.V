const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: "No URL provided" });

    try {
        // هنا نستخدم أحد الـ APIs المجتمعية المعروفة لاستخراج الروابط من vidsrc
        // ملاحظة: vidsrc تتطلب مفاتيح متغيرة، هذا الـ API يقوم بالعمل نيابة عنك
        const response = await axios.get(`https://vidsrc-api-v1.vercel.app/api/source?url=${encodeURIComponent(targetUrl)}`);
        
        res.json({
            stream_url: response.data.url, // الرابط المباشر (m3u8)
            subtitles: response.data.subtitles || []
        });
    } catch (error) {
        res.status(500).json({ error: "Extraction failed" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
