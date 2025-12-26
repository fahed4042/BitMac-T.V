const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

// رؤوس الطلب لضمان تجاوز حماية فاصل إعلاني
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.faselhds.biz/',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
};

app.get('/', async (req, res) => {
    const movieName = req.query.search;

    try {
        if (!movieName) return res.send("سيرفر Bitmac (نسخة فاصل) يعمل بنجاح!");

        // 1. عملية البحث في فاصل إعلاني
        const searchUrl = `https://www.faselhds.biz/?s=${encodeURIComponent(movieName)}`;
        const searchRes = await axios.get(searchUrl, { headers });
        
        // 2. استخراج رابط أول فيلم يظهر في النتائج
        const linkMatch = searchRes.data.match(/href="(https?:\/\/www\.faselhds\.biz\/movies\/[^"]+)"/i);
        
        if (linkMatch) {
            const pageUrl = linkMatch[1];

            // 3. دخول صفحة الفيلم لجلب روابط m3u8
            const moviePage = await axios.get(pageUrl, { headers, timeout: 15000 });
            const html = moviePage.data;
            
            // Regex لصيد روابط m3u8 المباشرة (التي وجدتها أنت سابقاً)
            const videoRegex = /(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/gi;
            const rawLinks = html.match(videoRegex) || [];
            
            // تنظيف الروابط من أي رموز زائدة
            const finalLinks = [...new Set(rawLinks.map(link => link.replace(/\\/g, '')))];

            res.json({ 
                status: "success", 
                data: {
                    direct_links: finalLinks
                },
                source_page: pageUrl
            });
        } else {
            res.json({ status: "error", message: "لم يتم العثور على نتائج في فاصل إعلاني" });
        }

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => console.log(`FaselHD Scraper is Running on port ${PORT}`));

