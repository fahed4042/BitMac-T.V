const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'https://www.faselhds.biz/',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
};

app.get('/', async (req, res) => {
    const movieName = req.query.search;

    try {
        if (!movieName) return res.send("سيرفر FaselHD يعمل.. بانتظار البحث");

        // 1. إجراء البحث في فاصل إتش دي
        const searchUrl = `https://www.faselhds.biz/?s=${encodeURIComponent(movieName)}`;
        const searchRes = await axios.get(searchUrl, { headers });
        
        // 2. استخراج أول رابط فيلم من نتائج البحث
        const linkMatch = searchRes.data.match(/href="(https?:\/\/www\.faselhds\.biz\/(movie|video)\/[^"]+)"/i);
        
        if (linkMatch) {
            let pageUrl = linkMatch[1].replace(/\\/g, '');
            
            // 3. جلب صفحة الفيلم لاستخراج الروابط
            const watchResponse = await axios.get(pageUrl, { headers, timeout: 15000 });
            const html = watchResponse.data;
            
            // صيد روابط الفيديو المباشرة (mp4/m3u8)
            const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
            const rawLinks = html.match(videoRegex) || [];
            
            // تنظيف وتصفية الروابط
            const finalLinks = [...new Set(rawLinks.map(link => link.replace(/\\/g, '')))];

            res.json({ 
                status: "success", 
                source: "FaselHD",
                data: {
                    direct_links: finalLinks
                },
                source_page: pageUrl
            });
        } else {
            res.json({ status: "error", message: "لم يتم العثور على الفيلم في نتائج بحث فاصل" });
        }

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => console.log(`Server is running for FaselHD support`));
