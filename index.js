
const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/extract', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ status: "error", message: "يرجى إضافة رابط بعد ?url=" });
    }

    let browser;
    try {
        // تشغيل المتصفح بإعدادات مخصصة للسيرفرات المجانية لضمان عدم استهلاك الذاكرة
        browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ],
            // المسار الافتراضي للمتصفح على سيرفرات Render
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        });

        const page = await browser.newPage();
        
        // محاكاة متصفح هاتف ذكي لتجاوز حمايات المواقع بسهولة
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36');

        // التوجه للرابط والانتظار حتى يستقر الاتصال
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });

        // استخراج جميع روابط MP4 و m3u8 و mkv الموجودة في الكود
        const links = await page.evaluate(() => {
            const videoRegex = /https?:\/\/[^"']+\.(mp4|m3u8|mkv)/g;
            const htmlContent = document.documentElement.innerHTML;
            const matches = htmlContent.match(videoRegex) || [];
            return [...new Set(matches)]; // إزالة الروابط المتكررة
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
