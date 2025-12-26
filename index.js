const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

// --- إضافة المسار الأساسي (Home) لضمان أن الرابط يعمل فوراً ---
app.get('/', (req, res) => {
    res.send('<h1>السيرفر يعمل بنجاح!</h1><p>استخدم مسار <b>/get_video_link?url=</b> لجلب الروابط.</p>');
});

app.get('/get_video_link', async (req, res) => {
    // استقبال الرابط من تطبيق سكتشوير
    const movieUrl = req.query.url; 

    if (!movieUrl) {
        return res.json({ error: "الرجاء إرسال رابط المشاهدة" });
    }

    let browser;
    try {
        // تشغيل المتصفح مع إعدادات التوافق مع Render
        browser = await puppeteer.launch({
            // هذا المسار مهم جداً ليعمل الكروم على سيرفر ريندر
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        
        // إعداد هوية المتصفح ليبدو كشخص حقيقي وليس بوت
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

        // الدخول إلى الرابط وانتظار تحميل العناصر الأساسية
        await page.goto(movieUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // استخراج الرابط المباشر من داخل الصفحة
        const directLink = await page.evaluate(async () => {
            // 1. البحث عن وسم الفيديو المباشر
            let video = document.querySelector('video source') || document.querySelector('video');
            if (video && video.src) return video.src;

            // 2. البحث عن المشغل داخل iframe
            let iframe = document.querySelector('.player-container iframe') || document.querySelector('iframe');
            if (iframe && iframe.src) return iframe.src;

            // 3. محاولة إيجاد أي روابط فيديو في الصفحة
            const links = Array.from(document.querySelectorAll('a, source'));
            const found = links.find(l => (l.src || l.href || '').match(/\.(mp4|m3u8|webm)/));
            return found ? (found.src || found.href) : null;
        });

        if (directLink) {
            res.json({ 
                direct_url: directLink, 
                status: "success"
            });
        } else {
            res.json({ 
                error: "لم يتم العثور على رابط مباشر، قد يحتاج الموقع لتحديث الكود", 
                status: "failed" 
            });
        }

    } catch (e) {
        res.json({ error: "حدث خطأ أثناء المعالجة: " + e.message });
    } finally {
        if (browser) await browser.close();
    }
});

// تشغيل السيرفر على البورت المحدد من ريندر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

