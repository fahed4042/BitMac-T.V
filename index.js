const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ error: "الرجاء إضافة رابط الفيلم بعد ?url=" });
    }

    let browser;
    try {
        // تشغيل المتصفح مع إعدادات متوافقة مع سيرفر Render المجاني
        browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        });

        const page = await browser.newPage();
        
        // تعيين User-Agent ليبدو وكأن شخصاً حقيقياً يتصفح
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

        // الذهاب لرابط أكوام والانتظار حتى تحميل الصفحة
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // استخراج جميع الروابط التي تنتهي بـ mp4 أو m3u8 أو روابط التحميل
        const links = await page.evaluate(() => {
            const results = [];
            const elements = document.querySelectorAll('a, source, video');
            elements.forEach(el => {
                const link = el.href || el.src;
                if (link && (link.includes('.mp4') || link.includes('.m3u8') || link.includes('download'))) {
                    results.push(link);
                }
            });
            return results;
        });

        await browser.close();

        res.json({
            success: true,
            extracted_at: new Date().toISOString(),
            links: [...new Set(links)] // حذف الروابط المتكررة
        });

    } catch (error) {
        if (browser) await browser.close();
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
