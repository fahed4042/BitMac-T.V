
const express = require('express');
const puppeteer = require('puppeteer'); // استخدام النسخة الكاملة
const app = express();

app.get('/', (req, res) => {
    res.send('<h1 style="color:green;text-align:center;">السيرفر يعمل الآن بالإعدادات الصحيحة!</h1>');
});

app.get('/get_video_link', async (req, res) => {
    let movieUrl = req.query.url; 
    if (!movieUrl) return res.json({ error: "الرجاء إرسال رابط" });

    try { movieUrl = decodeURIComponent(movieUrl); } catch (e) {}

    let browser;
    try {
        // هنا تركنا المتصفح يعمل تلقائياً بدون تحديد مسار يدوي
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        await page.goto(movieUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        const directLink = await page.evaluate(() => {
            const video = document.querySelector('video source') || document.querySelector('video') || document.querySelector('iframe');
            return video ? (video.src || video.href) : null;
        });

        res.json({ direct_url: directLink, status: "success" });
    } catch (e) {
        res.json({ error: "حدث خطأ: " + e.message });
    } finally {
        if (browser) await browser.close();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server Ready`));
