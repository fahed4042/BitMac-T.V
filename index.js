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
    let movieName = req.query.search;

    try {
        if (!movieName) return res.send("سيرفر Bitmac يعمل.. بانتظار البحث");

        // --- إضافة تحسينات البحث هنا ---
        
        // 1. تنظيف النص: إزالة المسافات من البداية والنهاية
        movieName = movieName.trim();

        // 2. معالجة المسافات المتعددة أو الملتصقة:
        // سنقوم باستبدال أي مسافة بـ (+) لضمان قبول محرك البحث للكلمات مفصلة
        // وأيضاً سنقوم بتجربة البحث بالكلمة كما هي
        const searchQuery = movieName.replace(/\s+/g, '+');

        // 1. إجراء البحث في أكوام
        const searchUrl = `https://ak.sv/search?q=${encodeURIComponent(searchQuery)}`;
        const searchRes = await axios.get(searchUrl, { headers });
        
        // 2. تعديل الـ Regex ليكون أكثر مرونة في صيد الروابط
        const linkMatch = searchRes.data.match(/href="(https?:\/\/ak\.sv\/(movie|watch)\/[^"]+)"/i);
        
        if (linkMatch) {
            let pageUrl = linkMatch[1].replace(/\\/g, '');
            
            if (pageUrl.includes('/movie/')) {
                pageUrl = pageUrl.replace('/movie/', '/watch/');
            }

            // 3. جلب روابط الفيديو
            const watchResponse = await axios.get(pageUrl, { headers, timeout: 15000 });
            const html = watchResponse.data;
            
            const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
            const rawLinks = html.match(videoRegex) || [];
            
            const finalLinks = [...new Set(rawLinks.map(link => link.replace(/\\/g, '')))];

            res.json({ 
                status: "success", 
                query_used: searchQuery,
                data: {
                    direct_links: finalLinks
                },
                source_page: pageUrl
            });
        } else {
            res.json({ 
                status: "error", 
                message: "لم يتم العثور على نتائج، جرب كتابة الاسم بشكل أوضح",
                suggestion: "تأكد من ترك مسافة بين اسم المسلسل والرقم" 
            });
        }

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => console.log(`Server is running with Smart Search support`));
