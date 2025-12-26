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

app.get('/movie/:id', async (req, res) => {
    const movieId = req.params.id;
    try {
        // 1. جلب اسم الفيلم بجميع اللغات من TMDB لضمان أفضل نتيجة بحث
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=alternative_titles`;
        const tmdbRes = await axios.get(tmdbUrl);
        
        const titles = new Set();
        titles.add(tmdbRes.data.title); // العربي
        titles.add(tmdbRes.data.original_title); // الإنجليزي/الأصلي

        let finalDirectLink = "not_found";

        // 2. البحث في أكوام بكل الأسماء المتاحة
        for (let name of titles) {
            const searchUrl = `https://ak.sv/search?q=${encodeURIComponent(name)}`;
            const searchRes = await axios.get(searchUrl, { headers });
            
            // سحب رابط صفحة المشاهدة (Watch Link)
            const watchMatch = searchRes.data.match(/href="(https?:\/\/ak\.sv\/watch\/[^"]+)"/i);
            
            if (watchMatch) {
                // 3. الدخول لصفحة المشاهدة (هنا يطبق كود "الجرد" تبعك)
                const watchPageUrl = watchMatch[1];
                const watchResponse = await axios.get(watchPageUrl, { headers });
                const html = watchResponse.data;

                // نظام الجرد تبعك لسحب الرابط المباشر
                const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
                const videoLinks = [...new Set(html.match(videoRegex) || [])];

                if (videoLinks.length > 0) {
                    finalDirectLink = videoLinks[0].replace(/\\/g, '');
                    break; // وجدنا الرابط، توقف عن البحث
                }
            }
        }

        // 4. النتيجة النهائية
        res.send(finalDirectLink);

    } catch (error) {
        res.status(500).send("error");
    }
});

app.get('/', (req, res) => res.send("Multi-Language Direct Link Server is Live"));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
