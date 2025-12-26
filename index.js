const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.get('/', (req, res) => {
    res.send('<h1 style="color:blue;text-align:center;">سيرفر جلب الروابط جاهز!</h1>');
});

app.get('/get_video_link', async (req, res) => {
    const movieUrl = req.query.url;
    if (!movieUrl) return res.json({ error: "أدخل الرابط أولاً" });

    let browser;
    try {
        browser = await puppeteer.launch({
            // سيتم تحميل المتصفح في هذا المسار عند بدء التشغيل
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.goto(decodeURIComponent(movieUrl), { waitUntil: 'domcontentloaded', timeout: 30000 });

        const directLink = await page.evaluate(() => {
            const video = document.querySelector('video source') || document.querySelector('video') || document.querySelector('iframe');
            return video ? (video.src || video.href) : null;
        });

        res.json({ direct_url: directLink });
    } catch (e) {
        res.json({ error: e.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(process.env.PORT || 3000);

