const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.json({ 
            status: "success", 
            message: "السيرفر يعمل! أضف رابط الفيلم هكذا: ?url=رابط_أكوام" 
        });
    }

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
                'Referer': 'https://ak.sv/',
                'Cache-Control': 'max-age=0',
                'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 15000
        });

        const html = response.data;
        const results = [];

        // بحث متقدم عن روابط الفيديو والتحميل المباشرة
        const regex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|zip|rar|download|mkv)[^"'\s]*)/gi;
        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push(match[1]);
        }

        res.json({ 
            status: "success", 
            count: results.length,
            results: [...new Set(results)] 
        });

    } catch (error) {
        let errorMsg = error.message;
        if (error.response && error.response.status === 403) {
            errorMsg = "تم حظر الطلب من موقع أكوام (403). جرب تحديث السيرفر أو تغيير الرابط.";
        }
        res.status(500).json({ status: "error", message: errorMsg });
    }
});

app.listen(PORT, () => console.log(`Server is ready on port ${PORT}`));
