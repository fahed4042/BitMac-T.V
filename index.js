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

        // 🚀 تنظيف الاسم: إزالة الأقواس والسنة (مثلاً: "رهين (2025)" تصبح "رهين")
        movieName = movieName.replace(/\s*\([^)]*\d{4}[^)]*\)/g, '').replace(/\s*\d{4}/g, '').trim();

        // 1. إجراء البحث في عرب سيد
        const searchUrl = `https://a.asd.homes/find/?word=${encodeURIComponent(movieName)}`;
        const searchRes = await axios.get(searchUrl, { headers });
        
        // 2. صيد رابط الفيلم (نبحث عن أي رابط يؤدي لصفحة فيلم)
        const linkMatch = searchRes.data.match(/href="(https?:\/\/a\.asd\.homes\/[^"\/]+\/)"/i);
        
        if (linkMatch) {
            let pageUrl = linkMatch[1].replace(/\\/g, '');
            
            // إضافة /watch/ لضمان الدخول لصفحة المشغل مباشرة
            if (!pageUrl.endsWith('/watch/')) {
                pageUrl = pageUrl.endsWith('/') ? pageUrl + "watch/" : pageUrl + "/watch/";
            }

            // 3. جرد روابط الفيديو من صفحة المشاهدة
            const watchResponse = await axios.get(pageUrl, { headers, timeout: 15000 });
            const html = watchResponse.data;
            
            // صيد كل ما هو mp4 أو m3u8 أو حتى روابط الـ iframe
            const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
            const rawLinks = html.match(videoRegex) || [];
            
            const finalLinks = [...new Set(rawLinks.map(link => link.replace(/\\/g, '')))];

            res.json({ 
                status: "success", 
                data: { direct_links: finalLinks },
                source_page: pageUrl
            });
        } else {
            res.json({ status: "error", message: "لم يتم العثور على الفيلم" });
        }

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => console.log(`Server is running for Arabseed`));
