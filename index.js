const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.get('/get_video_link', async (req, res) => {
    const movieUrl = req.query.url; 

    if (!movieUrl) {
        return res.json({ error: "الرجاء إرسال رابط المشاهدة" });
    }

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        // إعداد متصفح ليبدو كأنه مستخدم حقيقي لتجنب الحجب
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        await page.goto(movieUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // استخراج الرابط من داخل المشغل
        const directLink = await page.evaluate(async () => {
            // محاولة البحث عن وسم الفيديو مباشرة
            let video = document.querySelector('video source') || document.querySelector('video');
            if (video && video.src) return video.src;

            // إذا كان داخل iframe، نبحث عن رابط الـ src الخاص بالإطار
            let iframe = document.querySelector('.player-container iframe') || document.querySelector('iframe');
            if (iframe && iframe.src) return iframe.src;

            return null;
        });

        if (directLink) {
            res.json({ direct_url: directLink, status: "success" });
        } else {
            res.json({ error: "لم يتم العثور على رابط مباشر، قد يحتاج السكربت لتحديث الكلاسات", status: "failed" });
        }

    } catch (e) {
        res.json({ error: "حدث خطأ أثناء المعالجة: " + e.message });
    } finally {
        await browser.close();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

