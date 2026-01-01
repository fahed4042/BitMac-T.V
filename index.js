const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/extract', async (req, res) => {
    const movieUrl = req.query.url;

    if (!movieUrl) {
        return res.status(400).send("الرجاء إضافة رابط url");
    }

    try {
        // محاكاة متصفح حقيقي لتجاوز الحماية
        const response = await axios.get(movieUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://vidsrc.xyz/'
            },
            timeout: 10000
        });

        const html = response.data;
        
        // البحث عن روابط m3u8 (البث المباشر) أو mp4
        const regex = /(https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)/;
        const match = html.match(regex);

        if (match) {
            // إرسال الرابط المباشر فقط كـ نص صافي
            res.send(match[0]);
        } else {
            res.send("error: لم يتم العثور على رابط مباشر");
        }
    } catch (error) {
        res.send("error: فشل في الاتصال بالمصدر");
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
