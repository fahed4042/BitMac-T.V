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

        // --- وظيفة تنظيف وتجهيز النص للبحث ---
        // تحويل "شباب البومب2" أو "شباب  البومب  2" إلى "شباب البومب 2"
        let cleanName = movieName
            .replace(/([a-zA-Z\u0600-\u06FF])(\d)/g, '$1 $2') // وضع مسافة بين الحرف والرقم لو كانوا ملتصقين
            .replace(/(\d)([a-zA-Z\u0600-\u06FF])/g, '$1 $2') // وضع مسافة بين الرقم والحرف لو كانوا ملتصقين
            .replace(/\s+/g, ' ')                             // تحويل أي مسافات زائدة لمسافة واحدة فقط
            .trim();

        const searchUrl = `https://ak.sv/search?q=${encodeURIComponent(cleanName)}`;
        const searchRes = await axios.get(searchUrl, { headers });
        
        // محاولة إيجاد أول رابط (سواء فيلم أو مشاهدة)
        let linkMatch = searchRes.data.match(/href="(https?:\/\/ak\.sv\/(movie|watch)\/[^"]+)"/i);

        // إذا لم يجد نتيجة بالاسم النظيف، نجرب البحث بالكلمات الأصلية كما جاءت
        if (!linkMatch && movieName !== cleanName) {
            const retryRes = await axios.get(`https://ak.sv/search?q=${encodeURIComponent(movieName)}`, { headers });
            linkMatch = retryRes.data.match(/href="(https?:\/\/ak\.sv\/(movie|watch)\/[^"]+)"/i);
        }
        
        if (linkMatch) {
            let pageUrl = linkMatch[1].replace(/\\/g, '');
            
            // تحويل لرابط المشاهدة لجلب السيرفرات
            if (pageUrl.includes('/movie/')) {
                pageUrl = pageUrl.replace('/movie/', '/watch/');
            }

            const watchResponse = await axios.get(pageUrl, { headers, timeout: 15000 });
            const html = watchResponse.data;
            
            // صيد روابط الفيديو
            const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
            const rawLinks = html.match(videoRegex) || [];
            
            const finalLinks = [...new Set(rawLinks.map(link => link.replace(/\\/g, '')))];

            res.json({ 
                status: "success", 
                search_used: cleanName,
                data: { direct_links: finalLinks },
                source_page: pageUrl
            });
        } else {
            res.json({ status: "error", message: "لم يتم العثور على الفيلم، حاول تغيير الكلمات" });
        }

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => console.log(`Server is running with Flexible Search`));
