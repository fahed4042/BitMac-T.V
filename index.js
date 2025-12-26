const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

const TMDB_API_KEY = 'ef0a74bf742f74fb6dd91f1058520401';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://ak.sv/'
};

// مسار جلب الفيلم عن طريق الأيدي
app.get('/movie/:id', async (req, res) => {
    const movieId = req.params.id;
    try {
        // 1. جلب اسم الفيلم من TMDB
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=ar`;
        const tmdbRes = await axios.get(tmdbUrl);
        const movieTitle = tmdbRes.data.title;

        // 2. البحث عن الفيلم في أكوام
        const searchUrl = `https://ak.sv/search?q=${encodeURIComponent(movieTitle)}`;
        const searchRes = await axios.get(searchUrl, { headers });
        const firstMatch = searchRes.data.match(/href="(https?:\/\/ak\.sv\/watch\/[^"]+)"/i);

        if (!firstMatch) return res.send("not_found");

        // 3. جلب الرابط المباشر MP4 من صفحة المشاهدة
        const movieRes = await axios.get(firstMatch[1], { headers });
        const videoLinks = movieRes.data.match(/(https?:\/\/[^"'\s]+\.(?:mp4|m3u8)[^"'\s]*)/gi);

        if (videoLinks && videoLinks.length > 0) {
            res.send(videoLinks[0]); // إرسال الرابط المباشر فقط
        } else {
            res.send("not_found");
        }
    } catch (error) {
        res.send("error");
    }
});

app.listen(PORT, () => console.log(`Server is running`));
