const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://a.asd.homes/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
};

app.get('/', async (req, res) => {
    let movieName = req.query.search;
    try {
        if (!movieName) return res.send("سيرفر Bitmac يعمل..");

        movieName = movieName.replace(/\s*\([^)]*\d{4}[^)]*\)/g, '').replace(/\s*\d{4}/g, '').trim();

        // 1. البحث
        const searchUrl = `https://a.asd.homes/find/?word=${encodeURIComponent(movieName)}`;
        const searchRes = await axios.get(searchUrl, { headers });
        const linkMatch = searchRes.data.match(/href="(https?:\/\/a\.asd\.homes\/[^"\/]+\/)"/i);
        
        if (linkMatch) {
            let pageUrl = linkMatch[1].replace('/movie/', '/watch/');
            if (!pageUrl.includes('/watch/')) pageUrl += "watch/";

            // 2. جلب صفحة المشاهدة
            const watchResponse = await axios.get(pageUrl, { headers });
            const html = watchResponse.data;

            // 🚀 استراتيجية "الشباك الواسعة" لسحب الروابط المخفية
            // نبحث عن أي رابط يخص السيرفرات المشغلة أو ملفات الفيديو
            const allPossibleLinks = html.match(/https?:\/\/[^"'\s<>]+/g) || [];
            
            const filteredLinks = allPossibleLinks.filter(link => {
                const l = link.toLowerCase();
                // نأخذ روابط السيرفرات، المشغلات، وملفات الفيديو فقط
                return (l.includes('player') || l.includes('embed') || l.includes('.mp4') || l.includes('.m3u8')) 
                        && !l.includes('google') && !l.includes('facebook') && !l.includes('assets');
            });

            // تنظيف الروابط من أي شوائب (مثل الـ " المزدوجة)
            const cleanLinks = [...new Set(filteredLinks.map(l => l.split('"')[0].split("'")[0]))];

            res.json({ 
                status: "success", 
                data: {
                    total_found: cleanLinks.length,
                    direct_links: cleanLinks
                },
                source_page: pageUrl
            });
        } else {
            res.json({ status: "error", message: "لم يتم العثور على الفيلم" });
        }
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => console.log(`Server running`));
