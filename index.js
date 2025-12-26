const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.get('/', (req, res) => res.send('BitMac-TV Smart Scraper is Live!'));

app.get('/get_video_link', async (req, res) => {
    const movieUrl = req.query.url;
    if (!movieUrl) return res.json({ error: "الرجاء إرسال رابط" });

    let browser;
    try {
        // تشغيل المتصفح المحمل عبر npx في إعدادات Start Command
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();

        // منع تحميل الصور والإعلانات لتسريع العملية جداً
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // الدخول للرابط
        await page.goto(decodeURIComponent(movieUrl), { waitUntil: 'domcontentloaded', timeout: 30000 });

        // البحث عن رابط الفيديو أو المشغل في أكوام
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
app.listen(PORT, () => console.log('Server Ready'));

