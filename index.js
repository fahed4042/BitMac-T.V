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
    const movieName = req.query.search;

    try {
        if (!movieName) return res.send("سيرفر Bitmac يعمل.. بانتظار البحث");

        // 1. إجراء البحث في أكوام
        const searchUrl = `https://ak.sv/search?q=${encodeURIComponent(movieName)}`;
        const searchRes = await axios.get(searchUrl, { headers });
        
        // 2. تعديل الـ Regex ليشمل /movie/ و /watch/ (حل مشكلة عدم الإيجاد)
        const linkMatch = searchRes.data.match(/href="(https?:\/\/ak\.sv\/(movie|watch)\/[^"]+)"/i);
        
        if (linkMatch) {
            let pageUrl = linkMatch[1].replace(/\\/g, '');
            
            // تحويل رابط الفيلم إلى رابط مشاهدة إذا لزم الأمر لجلب روابط الفيديو
            if (pageUrl.includes('/movie/')) {
                pageUrl = pageUrl.replace('/movie/', '/watch/');
            }

            // 3. جرد روابط الفيديو من صفحة المشاهدة
            const watchResponse = await axios.get(pageUrl, { headers, timeout: 15000 });
            const html = watchResponse.data;
            
            // صيد روابط mp4 و m3u8
            const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
            const rawLinks = html.match(videoRegex) || [];
            
            // تنظيف الروابط من أي Backslashes لتعمل في المشغل
            const finalLinks = [...new Set(rawLinks.map(link => link.replace(/\\/g, '')))];

            res.json({ 
                status: "success", 
                data: {
                    direct_links: finalLinks
                },
                source_page: pageUrl
            });
        } else {
            res.json({ status: "error", message: "لم يتم العثور على الفيلم في نتائج البحث" });
        }

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => console.log(`Server is running with Movie/Watch support`));
