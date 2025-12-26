const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

// إعدادات الهيدرز لتبدو كأنها متصفح كروم حقيقي تماماً
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0'
};

app.get('/', async (req, res) => {
    const movieName = req.query.search;

    try {
        if (!movieName) return res.send("سيرفر FaselHD يعمل..");

        // استخدام axios مع إعدادات متقدمة لتجاوز الـ 403
        const searchUrl = `https://www.faselhds.biz/?s=${encodeURIComponent(movieName)}`;
        
        const searchRes = await axios.get(searchUrl, { 
            headers,
            timeout: 10000,
            maxRedirects: 5
        });
        
        const linkMatch = searchRes.data.match(/href="(https?:\/\/www\.faselhds\.biz\/(movie|video)\/[^"]+)"/i);
        
        if (linkMatch) {
            let pageUrl = linkMatch[1].replace(/\\/g, '');
            const watchResponse = await axios.get(pageUrl, { headers });
            const html = watchResponse.data;
            
            const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
            const rawLinks = html.match(videoRegex) || [];
            const finalLinks = [...new Set(rawLinks.map(link => link.replace(/\\/g, '')))];

            res.json({ 
                status: "success", 
                data: { direct_links: finalLinks },
                source_page: pageUrl
            });
        } else {
            res.json({ status: "error", message: "لم نجد نتائج، تأكد من اسم الفيلم" });
        }

    } catch (error) {
        // إذا استمر الخطأ 403، سنرسل رابط البحث المباشر للمستخدم ليفتحه في التطبيق
        res.status(200).json({ 
            status: "fallback", 
            message: "حماية الموقع تمنع السيرفر، سيتم تحويلك للبحث اليدوي",
            search_url: `https://www.faselhds.biz/?s=${encodeURIComponent(movieName)}`
        });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
