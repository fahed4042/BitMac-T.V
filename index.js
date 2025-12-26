
const express = require('express');
const puppeteer = require('puppeteer-core');
const app = express();

// 1. استجابة للرابط الأساسي (لمنع ظهور Not Found)
app.get('/', (req, res) => {
    res.send(`
        <div style="text-align:center; font-family:Arial; margin-top:50px;">
            <h1 style="color: #2ecc71;">✅ سيرفر BitMac-TV يعمل بنجاح</h1>
            <p>الحالة الآن: <b>Live (نشط)</b></p>
            <p>لجلب الروابط استخدم: <code>/get_video_link?url=رابط_الفيديو</code></p>
        </div>
    `);
});

// 2. مسار جلب روابط الفيديو
app.get('/get_video_link', async (req, res) => {
    let movieUrl = req.query.url; 
    
    if (!movieUrl) {
        return res.json({ error: "الرجاء إرسال رابط الفيلم" });
    }

    // فك تشفير الرابط في حال كان يحتوي على رموز عربية
    try {
        movieUrl = decodeURIComponent(movieUrl);
    } catch (e) {
        console.log("الرابط جاهز بالفعل");
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            // مسار الكروم الافتراضي في ريندر
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // الانتقال للرابط
        await page.goto(movieUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // استخراج الرابط المباشر
        const directLink = await page.evaluate(() => {
            const video = document.querySelector('video source') || document.querySelector('video') || document.querySelector('iframe');
            return video ? (video.src || video.href) : null;
        });

        if (directLink) {
            res.json({ direct_url: directLink, status: "success" });
        } else {
            res.json({ error: "لم يتم العثور على رابط مباشر في هذه الصفحة", status: "failed" });
        }
    } catch (e) {
        res.json({ error: "خطأ في معالجة الرابط: " + e.message });
    } finally {
        if (browser) await browser.close();
    }
});

// تحديد المنفذ والتشغيل
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
