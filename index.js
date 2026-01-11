const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('⚡ BitMac-TV Fast Extractor Running');
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
                '--disable-extensions',
                '--disable-gpu',
                '--disable-background-networking',
                '--disable-sync'
            ]
        });

        const page = await browser.newPage();

        // User-Agent حقيقي
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // 🚫 حظر الموارد الثقيلة
        await page.setRequestInterception(true);
        page.on('request', req => {
            const type = req.resourceType();
            if (
                type === 'image' ||
                type === 'stylesheet' ||
                type === 'font' ||
                type === 'media'
            ) {
                req.abort();
            } else {
                req.continue();
            }
        });

        let foundLinks = [];

        // 🎯 التقاط روابط الفيديو فقط
        page.on('request', req => {
            const url = req.url();
            if (url.includes('.m3u8') || url.includes('.mp4')) {
                foundLinks.push(url);
            }
        });

        // تحميل سريع (لا ننتظر كل الشبكة)
        await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        // انتظار قصير جدًا
        await page.waitForTimeout(4000);

        foundLinks = [...new Set(foundLinks)];

        await browser.close();

        if (!foundLinks.length) {
            return res.json({
                status: "failed",
                message: "لم يتم العثور على روابط"
            });
        }

        res.json({
            status: "success",
            count: foundLinks.length,
            links: foundLinks
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
    console.log(`⚡ Server running on port ${PORT}`);
});
