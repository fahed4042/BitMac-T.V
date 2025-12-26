const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

// رؤوس الطلب لمحاكاة المتصفح وتجنب الحماية
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://a.asd.homes/',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
};

app.get('/', async (req, res) => {
    const movieName = req.query.search;

    try {
        if (!movieName) return res.send("سيرفر جرد عرب سيد يعمل بنجاح");

        // 1. البحث في عرب سيد باستخدام نظام word=
        const searchUrl = `https://a.asd.homes/find/?word=${encodeURIComponent(movieName)}&type=movie`;
        const searchRes = await axios.get(searchUrl, { headers });
        
        // 2. صيد رابط صفحة الفيلم من نتائج البحث
        // نبحث عن الروابط التي لا تحتوي على كلمة "find" وتؤدي للأفلام
        const linkMatch = searchRes.data.match(/href="(https?:\/\/a\.asd\.homes\/[^"\/]+\/)"/i);
        
        if (linkMatch) {
            let moviePageUrl = linkMatch[1];
            
            // 3. التوجه لصفحة المشاهدة مباشرة (إضافة /watch/ للرابط كما أرفقت أنت)
            const watchPageUrl = moviePageUrl + "watch/";
            
            const watchResponse = await axios.get(watchPageUrl, { headers, timeout: 15000 });
            const html = watchResponse.data;
            
            // 4. جرد روابط الفيديو المباشرة (mp4, m3u8)
            const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
            const rawLinks = html.match(videoRegex) || [];
            
            // تنظيف الروابط من أي علامات مائلة خلفية
            const finalLinks = [...new Set(rawLinks.map(link => link.replace(/\\/g, '')))];

            res.json({ 
                status: "success", 
                data: {
                    direct_links: finalLinks
                },
                source_page: watchPageUrl
            });
        } else {
            res.json({ status: "error", message: "لم يتم العثور على الفيلم في عرب سيد" });
        }

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => console.log(`Arabseed Scraper Running on port ${PORT}`));

