const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://a.asd.homes/',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
};

app.get('/', async (req, res) => {
    let movieName = req.query.search;

    try {
        if (!movieName) return res.send("سيرفر Bitmac يعمل.. بانتظار البحث");

        // 1. تنظيف الاسم من السنة والأقواس
        movieName = movieName.replace(/\s*\([^)]*\d{4}[^)]*\)/g, '').replace(/\s*\d{4}/g, '').trim();

        // 2. البحث في عرب سيد
        const searchUrl = `https://a.asd.homes/find/?word=${encodeURIComponent(movieName)}`;
        const searchRes = await axios.get(searchUrl, { headers });
        
        const linkMatch = searchRes.data.match(/href="(https?:\/\/a\.asd\.homes\/[^"\/]+\/)"/i);
        
        if (linkMatch) {
            let pageUrl = linkMatch[1].replace(/\\/g, '');
            if (!pageUrl.includes('/watch/')) {
                pageUrl = pageUrl.endsWith('/') ? pageUrl + "watch/" : pageUrl + "/watch/";
            }

            // 3. دخول صفحة المشاهدة ومسح الروابط
            const watchResponse = await axios.get(pageUrl, { headers, timeout: 15000 });
            const html = watchResponse.data;

            // استخراج كل الروابط النصية من الصفحة
            const allPossibleLinks = html.match(/https?:\/\/[^"'\s<>]+/g) || [];
            
            // فلترة الروابط (استبعاد يوتيوب و IMDb والتركيز على عرب سيد فقط)
            const filteredLinks = allPossibleLinks.filter(link => {
                const l = link.toLowerCase();
                return (l.includes('player') || l.includes('embed') || l.includes('.mp4') || l.includes('.m3u8')) 
                        && l.includes('a.asd.homes') // تأكيد أن الرابط تابع لعرب سيد
                        && !l.includes('imdb') 
                        && !l.includes('youtube')
                        && !l.includes('google');
            });

            // تنظيف الروابط من أي علامات ترقيم زائدة
            const cleanLinks = [...new Set(filteredLinks.map(l => l.split('"')[0].split("'")[0]))];

            res.json({ 
                status: "success", 
                data: {
                    total_found: cleanLinks.length,
                    direct_links: cleanLinks // ستظهر هنا روابط المشغلات الصافية فقط
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

app.listen(PORT, () => console.log(`Bitmac Server: Clean Arabseed Extractor Running`));
