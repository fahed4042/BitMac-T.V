const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

// مفتاحك الذي أرسلته لي
const TMDB_API_KEY = 'ef0a74bf742f74fb6dd91f1058520401';

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://ak.sv/'
};

app.get('/movie/:id', async (req, res) => {
    const movieId = req.params.id;
    try {
        // 1. جلب اسم الفيلم بالعربي من TMDB
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=ar`;
        const tmdbRes = await axios.get(tmdbUrl);
        const movieTitle = tmdbRes.data.title;

        // 2. البحث في أكوام بالاسم
        const searchUrl = `https://ak.sv/search?q=${encodeURIComponent(movieTitle)}`;
        const searchRes = await axios.get(searchUrl, { headers });
        
        // 3. استخراج رابط أول نتيجة (صفحة المشاهدة)
        const firstMatch = searchRes.data.match(/href="(https?:\/\/ak\.sv\/watch\/[^"]+)"/i);

        if (!firstMatch) {
            return res.send("not_found");
        }

        // 4. الدخول لصفحة الفيلم لجلب الرابط
        const watchPageUrl = firstMatch[1];
        const watchPageRes = await axios.get(watchPageUrl, { headers });
        const html = watchPageRes.data;

        // 5. محاولة إيجاد رابط الفيديو (بأكثر من طريقة)
        // يبحث عن .mp4 أو .m3u8 أو روابط السيرفرات المباشرة
        const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
        let videoLinks = html.match(videoRegex);

        if (videoLinks && videoLinks.length > 0) {
            // تنظيف الرابط من أي شوائب وإرساله
            let finalLink = videoLinks[0].replace(/\\/g, '');
            res.send(finalLink);
        } else {
            // محاولة أخيرة: البحث عن أي رابط يحتوي على كلمة 'download' أو 'link'
            const backupRegex = /https?:\/\/[^"']+\/download\/[^"']+/gi;
            const backupLinks = html.match(backupRegex);
            
            if (backupLinks) {
                res.send(backupLinks[0]);
            } else {
                res.send("not_found");
            }
        }
    } catch (e) {
        console.error(e);
        res.send("error");
    }
});

// مسار افتراضي للتأكد أن السيرفر يعمل
app.get('/', (req, res) => {
    res.send("Server is Online - Powering Akwam Search");
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
