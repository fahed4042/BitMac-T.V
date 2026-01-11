const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('✅ BitMac-TV Puppeteer Extractor Running');
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
                '--disable-dev-shm-usage'
            ]
        });

        const page = await browser.newPage();

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // اعتراض الطلبات لالتقاط m3u8
        let foundLinks = [];

        await page.setRequestInterception(true);
        page.on('request', req => {
            const url = req.url();
            if (url.includes('.m3u8') || url.includes('.mp4')) {
                foundLinks.push(url);
            }
            req.continue();
        });

        await page.goto(targetUrl, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // انتظار تحميل الفيديو
        await page.waitForTimeout(8000);

        foundLinks = [...new Set(foundLinks)];

        if (!foundLinks.length) {
            await browser.close();
            return res.json({
                status: "failed",
                message: "لم يتم العثور على روابط"
            });
        }

        await browser.close();
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
    console.log(`✅ Server running on port ${PORT}`);
});
