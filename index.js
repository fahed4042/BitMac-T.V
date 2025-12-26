
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.json({ 
            status: "success", 
            message: "السيرفر يعمل! أضف ?url=رابط_أكوام" 
        });
    }

    try {
        // جلب محتوى الصفحة مباشرة بدون متصفح ثقيل
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/119.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });

        const html = response.data;
        const results = [];

        // بحث عن روابط mp4 و m3u8 و download داخل الكود المصدري
        const regex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|zip|rar|download)[^"'\s]*)/gi;
        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push(match[1]);
        }

        res.json({ 
            status: "success", 
            results: [...new Set(results)] 
        });

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
