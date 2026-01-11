const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('✅ BitMac Fast Extractor Running');
});

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.json({ status: "error", message: "No URL provided" });
    }

    let browser;

    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-background-networking'
            ]
        });

        const page = await browser.newPage();

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // 🚫 منع تحميل الأشياء الثقيلة
        await page.setRequestInterception(true);
        page.on('request', req => {
            const type = req.resourceType();
            if (['image', 'stylesheet', 'font'].includes(type)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        let links = new Set();

        // 🎯 التقاط روابط الفيديو الحقيقية
        page.on('request', req => {
            const url = req.url();
            if (url.includes('.m3u8') || url.includes('.mp4')) {
                links.add(url);
            }
        });

        // تحميل خفيف وسريع
        await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // انتظار قصير فقط
        await page.waitForTimeout(5000);

        await browser.close();

        if (links.size === 0) {
            return res.json({
                status: "failed",
                message: "لم يتم العثور على روابط (الموقع محمي أو DRM)"
            });
        }

        res.json({
            status: "success",
            count: links.size,
            links: [...links]
        });

    } catch (err) {
        if (browser) await browser.close();
        res.json({
            status: "error",
            message: "فشل الاستخراج",
            error: err.message
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
