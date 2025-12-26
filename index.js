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

        // تنظيف الاسم من السنة والأقواس
        movieName = movieName.replace(/\s*\([^)]*\d{4}[^)]*\)/g, '').replace(/\s*\d{4}/g, '').trim();

        // 1. البحث
        const searchUrl = `https://a.asd.homes/find/?word=${encodeURIComponent(movieName)}`;
        const searchRes = await axios.get(searchUrl, { headers });
        
        // البحث عن أول رابط فيلم في نتائج البحث
        const linkMatch = searchRes.data.match(/href="(https?:\/\/a\.asd\.homes\/[^"\/]+\/)"/i);
        
        if (linkMatch) {
            let pageUrl = linkMatch[1].replace(/\\/g, '');
            if (!pageUrl.endsWith('/watch/')) {
                pageUrl = pageUrl.endsWith('/') ? pageUrl + "watch/" : pageUrl + "/watch/";
            }

            // 2. الدخول لصفحة المشاهدة واستخراج الروابط بذكاء
            const watchResponse = await axios.get(pageUrl, { headers, timeout: 15000 });
            const html = watchResponse.data;

            // --- استراتيجية الاستخراج الديناميكي ---
            
            // أ- استخراج روابط الفيديو المباشرة (mp4, m3u8, mkv, webm)
            const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv|webm)[^"'\s]*)/gi;
            
            // ب- استخراج روابط السيرفرات والمشغلات (iframes)
            const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
            
            // ج- استخراج الروابط المخفية داخل كود الجافا سكريبت (مثل روابط المشغلات السريعة)
            const scriptLinkRegex = /["'](https?:\/\/[^"'\s]+\/(?:embed|v|e)\/[^"'\s]+)["']/gi;

            let allLinks = [];

            // تنفيذ المسح الشامل
            const videos = html.match(videoRegex) || [];
            const iframes = [...html.matchAll(iframeRegex)].map(m => m[1]);
            const scriptLinks = [...html.matchAll(scriptLinkRegex)].map(m => m[1]);

            // دمج كل النتائج وتصفيتها من الروابط غير المرغوبة (مثل روابط الصور أو ملفات الـ js)
            allLinks = [...new Set([...videos, ...iframes, ...scriptLinks])]
                .map(link => link.replace(/\\/g, '')) // تنظيف الروابط
                .filter(link => {
                    return !link.includes('google-analytics') && 
                           !link.includes('facebook.com') &&
                           !link.includes('.jpg') && 
                           !link.includes('.png');
                });

            // هـ- البحث عن سيرفرات التحميل (غالباً ما تكون بجودة عالية)
            const downloadLinkRegex = /href="(https?:\/\/[^"]+\/download\/[^"]+)"/gi;
            const downloads = [...html.matchAll(downloadLinkRegex)].map(m => m[1]);
            allLinks = [...new Set([...allLinks, ...downloads])];

            res.json({ 
                status: "success", 
                data: {
                    total_found: allLinks.length,
                    direct_links: allLinks
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
