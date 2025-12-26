const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

const TMDB_API_KEY = 'ef0a74bf742f74fb6dd91f1058520401';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://ak.sv/'
};

// مسار البحث والتشغيل التلقائي عن طريق الأيدي
app.get('/movie/:id', async (req, res) => {
    const movieId = req.params.id;
    try {
        // 1. جلب اسم الفيلم العربي من TMDB
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=ar`;
        const tmdbRes = await axios.get(tmdbUrl);
        const movieTitle = tmdbRes.data.title;

        // 2. البحث في أكوام
        const searchUrl = `https://ak.sv/search?q=${encodeURIComponent(movieTitle)}`;
        const searchRes = await axios.get(searchUrl, { headers });
        
        // 3. استخراج رابط أول فيلم (صفحة الـ watch) من نتائج البحث
        const firstResultMatch = searchRes.data.match(/href="(https?:\/\/ak\.sv\/watch\/[^"]+)"/i);

        if (!firstResultMatch) {
            return res.send("not_found");
        }

        // 4. الدخول لصفحة المشاهدة الحقيقية (الرابط اللي انت جربته في جوجل واشتغل)
        const watchPageUrl = firstResultMatch[1];
        const watchPageRes = await axios.get(watchPageUrl, { headers });

        // 5. استخراج رابط الـ MP4 المباشر من داخل الصفحة
        const videoLinks = watchPageRes.data.match(/(https?:\/\/[^"'\s]+\.(?:mp4|m3u8)[^"'\s]*)/gi);

        if (videoLinks && videoLinks.length > 0) {
            // إرسال أول رابط مباشر للمشغل في تطبيقك
            res.send(videoLinks[0]);
        } else {
            res.send("not_found");
        }
    } catch (e) {
        res.send("error");
    }
});

// رسالة ترحيب للمسار الرئيسي للتأكد أن السيرفر Live
app.get('/', (req, res) => res.send("Server is Online - Waiting for ID"));

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
