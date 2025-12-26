
const express = require('express');
const puppeteer = require('puppeteer-core');
const app = express();

// 1. صفحة للتأكد أن السيرفر Live
app.get('/', (req, res) => {
    res.send('<h1>سيرفر BitMac-TV يعمل بنجاح!</h1><p>الحالة: <b>Live</b></p>');
});

// 2. مسار جلب روابط الفيديو
app.get('/get_video_link', async (req, res) => {
    const movieUrl = req.query.url; 
    if (!movieUrl) return res.json({ error: "الرجاء إرسال رابط الفيلم" });

    let browser;
    try {
        browser = await puppeteer.launch({
            // استخدام الكروم المثبت مسبقاً في ريندر لتسريع العمل
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
        
        // محاولة الدخول للرابط
        await page.goto(movieUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // البحث عن الرابط المباشر
        const directLink = await page.evaluate(() => {
            let video = document.querySelector('video source') || document.querySelector('video') || document.querySelector('iframe');
            return video ? (video.src || video.href) : null;
        });

        if (directLink) {
            res.json({ direct_url: directLink, status: "success" });
        } else {
            res.json({ error: "لم نجد الرابط، الموقع ربما غير كود المشغل", status: "failed" });
        }
    } catch (e) {
        res.json({ error: "حدث خطأ: " + e.message });
    } finally {
        if (browser) await browser.close();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
