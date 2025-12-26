
const express = require('express');
const puppeteer = require('puppeteer-core');
const app = express();

// الصفحة الرئيسية للتأكد من عمل السيرفر
app.get('/', (req, res) => {
    res.status(200).send('<h1>سيرفر BitMac-TV يعمل بنجاح!</h1><p>الحالة: <b>Live</b></p>');
});

// المسار الرئيسي لجلب الروابط
app.get('/get_video_link', async (req, res) => {
    let movieUrl = req.query.url; 
    
    if (!movieUrl) {
        return res.json({ error: "الرجاء إرسال رابط الفيلم" });
    }

    // إصلاح مشكلة الروابط التي تحتوي على لغة عربية أو رموز
    try {
        movieUrl = decodeURIComponent(movieUrl);
    } catch (e) {
        console.log("رابط مفرمط جاهز");
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        // تعيين وقت انتظار طويل وحجم شاشة وهمي
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // الدخول للرابط مع انتظار تحميل المحتوى الأساسي
        await page.goto(movieUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // فحص الصفحة بحثاً عن مشغل الفيديو
        const directLink = await page.evaluate(() => {
            // البحث عن وسم الفيديو
            const videoTag = document.querySelector('video source') || document.querySelector('video');
            if (videoTag && videoTag.src) return videoTag.src;

            // البحث عن iframe المشغل (أكوام يستخدم غالباً iframe)
            const iframeTag = document.querySelector('.player-container iframe') || document.querySelector('iframe');
            if (iframeTag && iframeTag.src) return iframeTag.src;

            return null;
        });

        if (directLink) {
            res.json({ direct_url: directLink, status: "success" });
        } else {
            res.json({ error: "لم نجد رابط المشغل، تأكد أن الرابط لصفحة المشاهدة", status: "failed" });
        }

    } catch (e) {
        res.status(500).json({ error: "حدث خطأ في السيرفر: " + e.message });
    } finally {
        if (browser) await browser.close();
    }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
