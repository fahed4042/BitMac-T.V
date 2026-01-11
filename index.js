const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 10000;

// Headers قوية لتجاوز 403
const BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1"
};

app.get('/', (req, res) => {
    res.send('✅ BitMac-TV Extractor Running');
});

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.json({ status: "error", message: "No URL provided" });
    }

    try {
        // ======================
        // 1️⃣ طلب الصفحة الأساسية
        // ======================
        const mainPage = await axios.get(targetUrl, {
            headers: {
                ...BROWSER_HEADERS,
                "Referer": targetUrl
            },
            timeout: 20000,
            validateStatus: () => true
        });

        if (mainPage.status !== 200) {
            return res.json({
                status: "blocked",
                step: "main_page",
                code: mainPage.status
            });
        }

        const $ = cheerio.load(mainPage.data);
        let iframeUrl = $('iframe').attr('src');

        if (!iframeUrl) {
            return res.json({
                status: "failed",
                message: "iframe غير موجود"
            });
        }

        if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;
        if (iframeUrl.startsWith('/')) {
            const base = new URL(targetUrl);
            iframeUrl = base.origin + iframeUrl;
        }

        // ======================
        // 2️⃣ طلب صفحة iframe
        // ======================
        const iframePage = await axios.get(iframeUrl, {
            headers: {
                ...BROWSER_HEADERS,
                "Referer": targetUrl
            },
            timeout: 20000,
            validateStatus: () => true
        });

        if (iframePage.status !== 200) {
            return res.json({
                status: "blocked",
                step: "iframe",
                code: iframePage.status,
                iframe: iframeUrl
            });
        }

        const html = iframePage.data;

        // ======================
        // 3️⃣ استخراج الروابط
        // ======================
        const regex = /(https?:\/\/[^"' ]+\.(m3u8|mp4)[^"' ]*)/gi;
        let links = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            links.push(match[1]);
        }

        links = [...new Set(links)];

        if (!links.length) {
            return res.json({
                status: "failed",
                message: "لا يوجد روابط مباشرة",
                iframe: iframeUrl
            });
        }

        res.json({
            status: "success",
            count: links.length,
            iframe: iframeUrl,
            links
        });

    } catch (err) {
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
