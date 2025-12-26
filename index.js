const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

const TMDB_API_KEY = 'ef0a74bf742f74fb6dd91f1058520401';

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://ak.sv/',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
};

// --- المسار المصلح: البحث بالآيدي (ID) باستخدام نظام الجرد الذكي ---
app.get('/movie/:id', async (req, res) => {
    const movieId = req.params.id;
    try {
        // 1. جلب الأسماء من TMDB
        const tmdbRes = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=alternative_titles`);
        const titles = new Set([tmdbRes.data.title, tmdbRes.data.original_title]);
        
        if (tmdbRes.data.alternative_titles?.titles) {
            tmdbRes.data.alternative_titles.titles.forEach(t => titles.add(t.title));
        }

        let finalDirectLink = "not_found";

        // 2. البحث في أكوام
        for (let name of titles) {
            const searchUrl = `https://ak.sv/search?q=${encodeURIComponent(name)}`;
            const searchRes = await axios.get(searchUrl, { headers });
            
            // البحث عن رابط صفحة العرض (watch) في نتائج البحث
            const watchMatch = searchRes.data.match(/href="(https?:\/\/ak\.sv\/watch\/[^"]+)"/i);
            
            if (watchMatch) {
                // 3. الدخول لصفحة المشاهدة وتطبيق "نظام الجرد" (نفس اللي شغال معك بالرابط)
                const watchPageUrl = watchMatch[1];
                const watchResponse = await axios.get(watchPageUrl, { headers, timeout: 10000 });
                const html = watchResponse.data;

                // كود الجرد المباشر لسحب روابط mp4/m3u8
                const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
                const videoLinks = [...new Set(html.match(videoRegex) || [])];

                if (videoLinks.length > 0) {
                    finalDirectLink = videoLinks[0].replace(/\\/g, '');
                    break; // وجدنا الرابط بنجاح!
                }
            }
        }
        res.send(finalDirectLink);

    } catch (e) {
        res.status(500).send("error");
    }
});

// --- مسار الجرد اليدوي (عن طريق ?url=) سيبقى شغال كما هو ---
app.get('/', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.json({ status: "online", message: "Use /movie/ID or ?url=LINK" });

    try {
        const response = await axios.get(targetUrl, { headers, timeout: 15000 });
        const html = response.data;
        const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
        const videoLinks = [...new Set(html.match(videoRegex) || [])];
        res.json({ status: "success", direct_links: videoLinks });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => console.log(`Server is running with Direct Scraping`));
