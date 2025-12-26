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

        // 🚀 تنظيف الاسم من السنة والأقواس لضمان دقة البحث في عرب سيد
        movieName = movieName.replace(/\s*\([^)]*\d{4}[^)]*\)/g, '').replace(/\s*\d{4}/g, '').trim();

        // 1. إجراء البحث
        const searchUrl = `https://a.asd.homes/find/?word=${encodeURIComponent(movieName)}`;
        const searchRes = await axios.get(searchUrl, { headers });
        
        // البحث عن رابط الفيلم الأول في نتائج البحث
        const linkMatch = searchRes.data.match(/href="(https?:\/\/a\.asd\.homes\/[^"\/]+\/)"/i);
        
        if (linkMatch) {
            let pageUrl = linkMatch[1].replace(/\\/g, '');
            // التوجه لصفحة المشاهدة مباشرة
            if (!pageUrl.endsWith('/watch/')) {
                pageUrl = pageUrl.endsWith('/') ? pageUrl + "watch/" : pageUrl + "/watch/";
            }

            // 2. الدخول لصفحة المشاهدة واستخراج الروابط بذكاء
            const watchResponse = await axios.get(pageUrl, { headers, timeout: 15000 });
            const html = watchResponse.data;

            let finalLinks = [];

            // أ- استخراج رابط المشغل الأساسي (Iframe Player) - هذا الأهم لعرب سيد
            const playerMatch = html.match(/src="(https?:\/\/a\.asd\.homes\/player\/[^"]+)"/i) 
                             || html.match(/src="(https?:\/\/a\.asd\.homes\/embed\/[^"]+)"/i);
            
            if (playerMatch) {
                finalLinks.push(playerMatch[1]);
            }

            // ب- استخراج روابط الفيديو المباشرة إذا كانت مكشوفة (mp4, m3u8)
            const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
            const rawVideos = html.match(videoRegex) || [];
            
            // ج- استخراج روابط التحميل المباشرة (غالباً تكون روابط سريعة)
            const downloadRegex = /href="(https?:\/\/[^"]+\/download\/[^"]+)"/gi;
            const downloads = [...html.matchAll(downloadRegex)].map(m => m[1]);

            // دمج وتصفية الروابط
            finalLinks = [...new Set([...finalLinks, ...rawVideos, ...downloads])]
                .map(link => link.replace(/\\/g, ''))
                .filter(link => !link.includes('google') && !link.includes('facebook') && !link.includes('youtube'));

            res.json({ 
                status: "success", 
                data: {
                    total_found: finalLinks.length,
                    direct_links: finalLinks
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

app.listen(PORT, () => console.log(`Bitmac Server: High-Performance Extractor Running`));
