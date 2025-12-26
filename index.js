const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://ak.sv/',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
};

// هذا المسار هو الذي يستقبل الطلب من تطبيقك (?search=اسم الفيلم)
app.get('/', async (req, res) => {
    const movieName = req.query.search; // استقبال الاسم من سكيتش وير
    const targetUrl = req.query.url;    // لاستقبال رابط مباشر إذا لزم الأمر

    try {
        let urlToScrap = targetUrl;

        // إذا أرسل التطبيق اسم فيلم (كما هو الحال في سيرفر 1 عندك)
        if (movieName) {
            // 1. البحث في أكوام عن اسم الفيلم
            const searchUrl = `https://ak.sv/search?q=${encodeURIComponent(movieName)}`;
            const searchRes = await axios.get(searchUrl, { headers });
            
            // 2. محاولة العثور على رابط صفحة المشاهدة
            const watchMatch = searchRes.data.match(/href="(https?:\/\/ak\.sv\/watch\/[^"]+)"/i);
            
            if (watchMatch) {
                urlToScrap = watchMatch[1].replace(/\\/g, '');
            } else {
                return res.json({ status: "error", message: "الفيلم غير موجود" });
            }
        }

        if (!urlToScrap) return res.send("سيرفر الجرد يعمل بنجاح");

        // 3. الدخول لصفحة الفيلم وجرد الروابط المباشرة (نفس طريقتك الناجحة)
        const response = await axios.get(urlToScrap, { headers, timeout: 15000 });
        const html = response.data;
        const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
        
        // تنظيف الروابط من أي علامات مائلة (Backslashes) لتعمل في المشغل
        const rawLinks = html.match(videoRegex) || [];
        const videoLinks = [...new Set(rawLinks.map(link => link.replace(/\\/g, '')))];

        // إرسال النتيجة بنفس الصيغة التي يتوقعها كود سكيتش وير عندك
        res.json({ 
            status: "success", 
            data: {
                direct_links: videoLinks
            }
        });

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => console.log(`Server is running for Sketchware Search`));
