const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 10000; // تم التعديل ليتوافق مع بورت Render الافتراضي

// تم تغيير المسار من '/api/extract' إلى '/' لحل مشكلة "غير موجود"
app.get('/', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ 
            status: "error", 
            message: "السيرفر يعمل! يرجى إضافة رابط الفيلم هكذا: /?url=رابط_أكوام" 
        });
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process' // لتقليل استهلاك الذاكرة في الخطة المجانية
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
        });

        const page = await browser.newPage();
        
        // إعدادات لتجاوز حماية البوتات
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

        // الذهاب للرابط
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // محاولة النقر على أزرار التحميل إذا كانت مخفية (خاص بأكوام)
        const links = await page.evaluate(() => {
            const results = [];
            // البحث عن روابط الفيديو في كل مكان (src, href, data-src)
            const elements = document.querySelectorAll('a, source, video, button, [data-link]');
            
            elements.forEach(el => {
                const link = el.href || el.src || el.getAttribute('data-link') || el.getAttribute('data-src');
                if (link && (link.includes('.mp4') || link.includes('.m3u8') || link.includes('download'))) {
                    results.push(link);
                }
            });

            // بحث إضافي داخل كود الصفحة (Regex) لضمان عدم ضياع أي رابط
            const bodyText = document.body.innerHTML;
            const regex = /https?:\/\/[^"']+\.(mp4|m3u8)/g;
            const matches = bodyText.match(regex);
            if (matches) results.push(...matches);

            return [...new Set(results)]; 
        });

        await browser.close();

        res.json({
            project: "bitmac-tv",
            status: "success",
            results: links
        });

    } catch (error) {
        if (browser) await browser.close();
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server bitmac-tv is live on port ${PORT}`);
});

