const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 10000;

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.send('<h2>✅ BitMac-TV Extractor Running</h2>');
});

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.json({ status: "error", message: "❌ No URL provided" });
    }

    try {
        // ======================
        // 1️⃣ طلب الصفحة الأساسية
        // ======================
        const mainPage = await axios.get(targetUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Referer": targetUrl
            },
            timeout: 15000
        });

        const $ = cheerio.load(mainPage.data);

        // ======================
        // 2️⃣ استخراج iframe
        // ======================
        let iframeUrl = $('iframe').attr('src');

        if (!iframeUrl) {
            return res.json({
                status: "failed",
                message: "❌ لم يتم العثور على iframe"
            });
        }

        if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;
        if (iframeUrl.startsWith('/')) {
            const base = new URL(targetUrl);
            iframeUrl = base.origin + iframeUrl;
        }

        // ======================
        // 3️⃣ طلب صفحة iframe
        // ======================
        const iframePage = await axios.get(iframeUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Referer": targetUrl
            },
            timeout: 15000
        });

        const html = iframePage.data;

        // ======================
        // 4️⃣ البحث عن روابط مباشرة
        // ======================
        let links = [];

        // m3u8 / mp4
        const regex = /(https?:\/\/[^"' ]+\.(m3u8|mp4)[^"' ]*)/gi;
        let match;
        while ((match = regex.exec(html)) !== null) {
            links.push(match[1]);
        }

        // إزالة التكرار
        links = [...new Set(links)];

        if (links.length === 0) {
            return res.json({
                status: "failed",
                message: "❌ لم يتم العثور على روابط مباشرة",
                iframe: iframeUrl
            });
        }

        // ======================
        // 5️⃣ نجاح
        // ======================
        res.json({
            status: "success",
            count: links.length,
            iframe: iframeUrl,
            links: links
        });

    } catch (err) {
        res.json({
            status: "error",
            message: "❌ فشل الاستخراج",
            error: err.message
        });
    }
});

// تشغيل السيرفر
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
});
