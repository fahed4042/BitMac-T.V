const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url; // الرابط الذي تريد استخراج الرابط المباشر منه

    if (!targetUrl) {
        return res.status(400).json({ error: "الرجاء إرسال رابط URL" });
    }

    try {
        // جلب كود الصفحة بدون متصفح (سرعة عالية واستهلاك رام منخفض)
        const { data } = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        let directLink = "";

        // مثال: البحث عن رابط فيديو مباشر داخل وسم <source> أو <a>
        // يمكنك تخصيص هذا الجزء حسب السيرفر الذي تستهدفه
        directLink = $('video source').attr('src') || $('a[href$=".mp4"]').attr('href') || $('iframe').attr('src');

        if (directLink) {
            res.json({
                status: "success",
                direct_link: directLink
            });
        } else {
            res.json({ status: "failed", message: "لم يتم العثور على رابط مباشر" });
        }

    } catch (error) {
        res.status(500).json({ error: "حدث خطأ أثناء الاتصال بالسيرفر" });
    }
});

app.listen(PORT, () => {
    console.log(`المحرك يعمل على المنفذ ${PORT}`);
});
