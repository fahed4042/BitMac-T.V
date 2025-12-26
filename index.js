const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(200).json({ 
            status: "success", 
            message: "السيرفر يعمل بنجاح! يرجى إضافة رابط الفيلم هكذا: /?url=رابط_أكوام" 
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
                '--single-process'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/119.0.0.0 Safari/537.36');
        
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        const links = await page.evaluate(() => {
            const results = [];
            const elements = document.querySelectorAll('a, source, video, button, [data-link]');
            elements.forEach(el => {
                const link = el.href || el.src || el.getAttribute('data-link') || el.getAttribute('data-src');
                if (link && (link.includes('.mp4') || link.includes('.m3u8') || link.includes('download'))) {
                    results.push(link);
                }
            });
            return [...new Set(results)]; 
        });

        await browser.close();
        res.json({ status: "success", results: links });

    } catch (error) {
        if (browser) await browser.close();
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is live on port ${PORT}`);
});

