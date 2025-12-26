const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

const TMDB_API_KEY = 'ef0a74bf742f74fb6dd91f1058520401';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://ak.sv/'
};

// 1. المسار الأساسي (عشان ما يعطيك Cannot GET /)
app.get('/', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.send("سيرفرك شغال بنجاح! أرسل الأيدي أو الرابط.");

    try {
        const response = await axios.get(targetUrl, { headers });
        const videoLinks = response.data.match(/(https?:\/\/[^"'\s]+\.(?:mp4|m3u8)[^"'\s]*)/gi);
        res.send(videoLinks ? videoLinks[0] : "not_found");
    } catch (e) { res.send("error"); }
});

// 2. المسار الخاص بالأيدي (ID) الذي طلبه تطبيقك
app.get('/movie/:id', async (req, res) => {
    const movieId = req.params.id;
    try {
        // جلب الاسم من TMDB
        const tmdbRes = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=ar`);
        const movieTitle = tmdbRes.data.title;

        // البحث في أكوام
        const searchUrl = `https://ak.sv/search?q=${encodeURIComponent(movieTitle)}`;
        const searchRes = await axios.get(searchUrl, { headers });
        const firstMatch = searchRes.data.match(/href="(https?:\/\/ak\.sv\/watch\/[^"]+)"/i);

        if (!firstMatch) return res.send("not_found");

        // جلب الفيديو المباشر
        const movieRes = await axios.get(firstMatch[1], { headers });
        const videoLinks = movieRes.data.match(/(https?:\/\/[^"'\s]+\.(?:mp4|m3u8)[^"'\s]*)/gi);

        res.send(videoLinks ? videoLinks[0] : "not_found");
    } catch (e) { res.send("error"); }
});

app.listen(PORT, () => console.log(`Server Ready`));

