const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('✅ BitMac Extractor Running');
});

app.get('/extract', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.json({ status: "error", message: "No URL provided" });
    }

    let browser;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // حظر الموارد الثقيلة
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

        page.on('request', req => {
            const u = req.url();
            if (u.includes('.m3u8') || u.includes('.mp4')) {
                links.add(u);
            }
        });

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

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
    console.log(`✅ Server running on port ${PORT}`);
});
