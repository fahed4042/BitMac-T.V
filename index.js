const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

// مفتاح TMDB الخاص بك
const TMDB_API_KEY = 'ef0a74bf742f74fb6dd91f1058520401';

// رؤوس طلب احترافية (من كودك)
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://ak.sv/',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
};

// --- المسار الأول: البحث عن طريق الأيدي (ID) ---
app.get('/movie/:id', async (req, res) => {
    const movieId = req.params.id;
    try {
        // جلب الأسماء بجميع اللغات من TMDB
        const tmdbRes = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=alternative_titles`);
        const titles = new Set([tmdbRes.data.title, tmdbRes.data.original_title]);
        
        if (tmdbRes.data.alternative_titles?.titles) {
            tmdbRes.data.alternative_titles.titles.forEach(t => titles.add(t.title));
        }

        let finalLink = "not_found";

        // البحث في أكوام
        for (let name of titles) {
            const searchUrl = `https://ak.sv/search?q=${encodeURIComponent(name)}`;
            const searchRes = await axios.get(searchUrl, { headers });
            const watchMatch = searchRes.data.match(/href="(https?:\/\/ak\.sv\/watch\/[^"]+)"/i);
            
            if (watchMatch) {
                const watchPage = await axios.get(watchMatch[1], { headers });
                const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
                const links = watchPage.data.match(videoRegex);
                if (links) {
                    finalLink = links[0].replace(/\\/g, '');
                    break;
                }
            }
        }
        res.send(finalLink);
    } catch (e) {
        res.status(500).send("error");
    }
});

// --- المسار الثاني: الجرد عن طريق الرابط (URL) كما في كودك الأصلي ---
app.get('/', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.json({ 
            status: "success", 
            message: "السيرفر يعمل! استخدم /movie/ID أو ?url=LINK" 
        });
    }

    try {
        const response = await axios.get(targetUrl, { headers, timeout: 15000 });
        const html = response.data;
        
        // استخدام Regex الخاص بك لسحب البيانات
        const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
        const videoLinks = [...new Set(html.match(videoRegex) || [])];

        const watchRegex = /href="(https?:\/\/ak\.sv\/watch\/[^"]+)"/gi;
        const watchLinks = [...new Set(Array.from(html.matchAll(watchRegex), m => m[1]))];

        const entries = [];
        const entryRegex = /<div class="entry-box">.*?<img src="(.*?)".*?<h3>(.*?)<\/h3>.*?href="(.*?)"/gs;
        let match;
        while ((match = entryRegex.exec(html)) !== null) {
            entries.push({ title: match[2].trim(), image: match[1], link: match[3] });
        }

        res.json({ 
            status: "success", 
            data: { catalog: entries, direct_links: videoLinks, watch_pages: watchLinks }
        });

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => console.log(`Server Running on port ${PORT}`));
