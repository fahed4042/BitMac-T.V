const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

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
            message: "سيرفر السحب الشامل جاهز! استخدم ?url= وأضف رابط (فيلم، مسلسل، أو قسم)" 
        });
    }

    try {
        const response = await axios.get(targetUrl, { headers, timeout: 15000 });
        const html = response.data;
        
        // 1. استخراج روابط الفيديو المباشرة (mp4)
        const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
        const videoLinks = [...new Set(html.match(videoRegex) || [])];

        // 2. استخراج روابط المشاهدة (Watch Links) - مفيد للمسلسلات والأقسام
        const watchRegex = /href="(https?:\/\/ak\.sv\/watch\/[^"]+)"/gi;
        const watchLinks = [];
        let match;
        while ((match = watchRegex.exec(html)) !== null) {
            watchLinks.push(match[1]);
        }

        // 3. استخراج عناوين وصور العروض (إذا كنت تسحب من قسم الأفلام)
        const titlesRegex = /<h3[^>]*>(.*?)<\/h3>/gi;
        const titles = [];
        while ((match = titlesRegex.exec(html)) !== null) {
            titles.push(match[1].replace(/<[^>]*>?/gm, '').trim());
        }

        res.json({ 
            status: "success", 
            results_found: {
                direct_videos: videoLinks.length,
                pages_found: [...new Set(watchLinks)].length
            },
            data: {
                direct_links: videoLinks, // روابط الـ mp4 المباشرة
                related_pages: [...new Set(watchLinks)], // روابط الحلقات أو الأفلام الأخرى في الصفحة
                titles: titles // أسماء الأفلام الموجودة في الصفحة
            }
        });

    } catch (error) {
        res.status(500).json({ status: "error", message: "حدث خطأ: " + error.message });
    }
});

app.listen(PORT, () => console.log(`Comprehensive Scraper Ready on port ${PORT}`));
