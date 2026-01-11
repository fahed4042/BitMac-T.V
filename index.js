const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

// Render يعطي المنفذ تلقائياً عبر process.env.PORT
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('مستخرج الروابط الذكي يعمل بنجاح!');
});

app.get('/get-link', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.json({ error: "الرجاء إضافة رابط URL في نهاية الطلب" });
    }

    try {
        // طلب الصفحة بدون تحميل الصور أو الجافاسكريبت لزيادة السرعة
        const response = await axios.get(videoUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
            },
            timeout: 10000 // مهلة 10 ثوانٍ
        });

        const $ = cheerio.load(response.data);
        
        // استراتيجية البحث عن الرابط المباشر (تعدل حسب الموقع المستهدف)
        let directLink = $('source').attr('src') || 
                         $('video').attr('src') || 
                         $('a[href*=".mp4"]').attr('href');

        if (directLink) {
            // تحويل الرابط إلى رابط مطلق إذا كان نسبياً
            if (directLink.startsWith('/')) {
                const urlObj = new URL(videoUrl);
                directLink = urlObj.origin + directLink;
            }
            res.json({ status: "success", link: directLink });
        } else {
            res.json({ status: "error", message: "تعذر العثور على رابط مباشر تلقائياً" });
        }

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
