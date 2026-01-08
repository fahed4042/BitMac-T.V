const express = require('express');
const axios = require('axios');
const app = express();

// منفذ السيرفر لـ Render
const PORT = process.env.PORT || 3000;

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ status: false, message: "No URL provided" });
    }

    try {
        // نستخدم API وسيط موثوق لفك تشفير vidsrc
        const response = await axios.get(`https://vidsrc-api-v1.vercel.app/api/source?url=${encodeURIComponent(targetUrl)}`);
        
        if (response.data && response.data.url) {
            res.json({
                status: true,
                stream_url: response.data.url, // الرابط الذي سنرسله لـ ExoPlayer
                subtitles: response.data.subtitles || []
            });
        } else {
            res.json({ status: false, message: "Link not found" });
        }
    } catch (error) {
        res.status(500).json({ status: false, message: "Server Error during extraction" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
