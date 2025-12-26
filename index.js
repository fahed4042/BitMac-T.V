const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

// مفتاح TMDB الخاص بك
const TMDB_API_KEY = 'ef0a74bf742f74fb6dd91f1058520401';

// رؤوس طلب احترافية لمنع الحظر
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://ak.sv/',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
};

// المسار الجديد للبحث عن طريق الأيدي بجميع اللغات
app.get('/movie/:id', async (req, res) => {
    const movieId = req.params.id;
    try {
        // 1. جلب بيانات الفيلم بجميع الأسماء واللغات من TMDB
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=alternative_titles`;
        const tmdbRes = await axios.get(tmdbUrl);
        
        const titles = new Set();
        if (tmdbRes.data.title) titles.add(tmdbRes.data.title); // الاسم الحالي
        if (tmdbRes.data.original_title) titles.add(tmdbRes.data.original_title); // الاسم الأصلي (أي لغة)
        
        // إضافة العناوين البديلة لزيادة فرصة العثور عليه
        if (tmdbRes.data.alternative_titles && tmdbRes.data.alternative_titles.titles) {
            tmdbRes.data.alternative_titles.titles.forEach(t => titles.add(t.title));
        }

        // 2. محاولة البحث في أكوام بكل اسم تم العثور عليه
        let finalVideo = "not_found";
        for (let name of titles) {
            console.log(`Checking Akwam for: ${name}`);
            finalVideo = await searchAkwamAndGetLink(name);
            if (finalVideo !== "not_found") break; // توقف عند أول نتيجة ناجحة
        }

        // إرسال النتيجة النهائية (رابط مباشر أو رسالة عدم وجود)
        res.send(finalVideo);

    } catch (e) {
        res.status(500).send("error");
    }
});

// وظيفة البحث داخل أكوام وسحب الرابط المباشر (من كودك الأصلي)
async function searchAkwamAndGetLink(query) {
    try {
        const searchUrl = `https://ak.sv/search?q=${encodeURIComponent(query)}`;
        const response = await axios.get(searchUrl, { headers, timeout: 10000 });
        const html = response.data;
        
        // البحث عن رابط أول صفحة عرض (watch)
        const watchMatch = html.match(/href="(https?:\/\/ak\.sv\/watch\/[^"]+)"/i);
        if (!watchMatch) return "not_found";

        // الدخول لصفحة المشاهدة
        const watchPageRes = await axios.get(watchMatch[1], { headers });
        const watchHtml = watchPageRes.data;

        // سحب رابط الفيديو المباشر (Regex من كودك)
        const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
        const videoLinks = watchHtml.match(videoRegex);

        return videoLinks ? videoLinks[0].replace(/\\/g, '') : "not_found";
    } catch (err) {
        return "not_found";
    }
}

// المسار الافتراضي (الجرد الشامل)
app.get('/', (req, res) => {
    res.json({ status: "success", message: "Server is Online - Multi-Language ID Search Active" });
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

