const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

// محرك فك التشفير والاستخراج
async function getDirectLink(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Referer': 'https://vidsrc.to/'
            },
            timeout: 8000
        });

        const html = response.data;

        // البحث عن روابط MP4 أو M3U8 (بث مباشر)
        const videoRegex = /(https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)/i;
        const match = html.match(videoRegex);

        if (match) {
            return match[0]; // تم العثور على الرابط المباشر
        }

        // إذا لم يجد رابط، يبحث عن روابط مشغلات وسيطة (Vidoza, Streamtape, إلخ)
        const embedRegex = /src="([^"]+)"/g;
        let embeds = [];
        let m;
        while ((m = embedRegex.exec(html)) !== null) {
            if (m[1].includes('stream') || m[1].includes('video')) {
                embeds.push(m[1]);
            }
        }

        return embeds.length > 0 ? embeds[0] : url;

    } catch (error) {
        console.error("Extraction error:", error.message);
        return url; // العودة بالرابط الأصلي في حال الفشل
    }
}

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ status: false, message: "URL required" });
    }

    const streamUrl = await getDirectLink(targetUrl);

    res.json({
        status: true,
        stream_url: streamUrl,
        type: streamUrl.includes('.m3u8') ? 'hls' : 'mp4'
    });
});

app.listen(PORT, () => {
    console.log(`BitMac Extractor is running on port ${PORT}`);
});
