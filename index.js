const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

// رؤوس طلب احترافية لمنع الحظر
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://ak.sv/',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
};

app.get('/', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.json({ 
            status: "success", 
            message: "سيرفر الجرد الشامل يعمل! جرب وضع رابط قسم الأفلام أو رابط بحث." 
        });
    }

    try {
        const response = await axios.get(targetUrl, { headers, timeout: 15000 });
        const html = response.data;
        
        // 1. سحب روابط الفيديو المباشرة (mp4) - للأفلام والحلقات
        const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
        const videoLinks = [...new Set(html.match(videoRegex) || [])];

        // 2. سحب روابط "صفحات العروض" (الأفلام والمسلسلات الموجودة في الأقسام)
        const watchRegex = /href="(https?:\/\/ak\.sv\/watch\/[^"]+)"/gi;
        const watchLinks = [...new Set(Array.from(html.matchAll(watchRegex), m => m[1]))];

        // 3. سحب العناوين والصور (لأرشفة المحتوى)
        const entries = [];
        const entryRegex = /<div class="entry-box">.*?<img src="(.*?)".*?<h3>(.*?)<\/h3>.*?href="(.*?)"/gs;
        let match;
        while ((match = entryRegex.exec(html)) !== null) {
            entries.push({
                title: match[2].trim(),
                image: match[1],
                link: match[3]
            });
        }

        res.json({ 
            status: "success", 
            source: targetUrl,
            summary: {
                total_entries: entries.length,
                total_direct_videos: videoLinks.length
            },
            data: {
                catalog: entries, // قائمة الأفلام/المسلسلات في الصفحة (العنوان، الصورة، الرابط)
                direct_links: videoLinks, // الروابط المباشرة إذا كانت صفحة مشاهدة
                all_found_pages: watchLinks // جميع الروابط الأخرى المكتشفة
            }
        });

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => console.log(`Super Scraper Running on port ${PORT}`));
{
