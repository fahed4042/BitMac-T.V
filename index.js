const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

const TMDB_API_KEY = 'ef0a74bf742f74fb6dd91f1058520401';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://ak.sv/'
};

app.get('/movie/:id', async (req, res) => {
    const movieId = req.params.id;
    try {
        // 1. جلب كل بيانات الأسماء الممكنة من TMDB
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=alternative_titles`;
        const tmdbRes = await axios.get(tmdbUrl);
        
        const titles = new Set();
        if (tmdbRes.data.title) titles.add(tmdbRes.data.title); // الاسم الحالي
        if (tmdbRes.data.original_title) titles.add(tmdbRes.data.original_title); // الاسم الأصلي (أي لغة)
        
        // جلب العناوين البديلة لزيادة دقة البحث
        if (tmdbRes.data.alternative_titles && tmdbRes.data.alternative_titles.titles) {
            tmdbRes.data.alternative_titles.titles.forEach(t => titles.add(t.title));
        }

        let finalVideo = "not_found";

        // 2. حلقة تكرار للبحث بكل الأسماء المتاحة حتى نجد الفيلم
        for (let name of titles) {
            console.log(`Searching for: ${name}`);
            finalVideo = await searchAkwam(name);
            if (finalVideo !== "not_found") break; // إذا وجدنا الفيلم، نتوقف عن البحث
        }

        res.send(finalVideo);

    } catch (e) {
        res.send("error");
    }
});

async function searchAkwam(query) {
    try {
        const searchUrl = `https://ak.sv/search?q=${encodeURIComponent(query)}`;
        const searchRes = await axios.get(searchUrl, { headers, timeout: 5000 });
        
        // استخراج رابط صفحة المشاهدة
        const firstMatch = searchRes.data.match(/href="(https?:\/\/ak\.sv\/watch\/[^"]+)"/i);
        if (!firstMatch) return "not_found";

        const watchPageRes = await axios.get(firstMatch[1], { headers });
        const html = watchPageRes.data;

        // البحث عن روابط الفيديو المباشرة
        const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
        const videoLinks = html.match(videoRegex);

        return videoLinks ? videoLinks[0].replace(/\\/g, '') : "not_found";
    } catch (err) {
        return "not_found";
    }
}

app.get('/', (req, res) => res.send("Multi-Language Server Active"));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
