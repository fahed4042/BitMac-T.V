const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

const TMDB_API_KEY = 'ef0a74bf742f74fb6dd91f1058520401';

// إعدادات تجعل السيرفر يظهر كمتصفح إنسان حقيقي (Chrome على Windows)
const humanHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'Referer': 'https://ak.sv/'
};

app.get('/movie/:id', async (req, res) => {
    const movieId = req.params.id;
    try {
        // 1. جلب الأسماء من TMDB
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=alternative_titles`;
        const tmdbRes = await axios.get(tmdbUrl);
        
        const titles = new Set();
        if (tmdbRes.data.title) titles.add(tmdbRes.data.title);
        if (tmdbRes.data.original_title) titles.add(tmdbRes.data.original_title);
        
        if (tmdbRes.data.alternative_titles && tmdbRes.data.alternative_titles.titles) {
            tmdbRes.data.alternative_titles.titles.forEach(t => titles.add(t.title));
        }

        let finalVideo = "not_found";

        // 2. البحث المتعدد بتمويه "بشري"
        for (let name of titles) {
            finalVideo = await searchAkwamHumanly(name);
            if (finalVideo !== "not_found") break;
            // انتظار بسيط (نصف ثانية) بين كل محاولة بحث عشان ما نكشف السيرفر
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        res.send(finalVideo);

    } catch (e) {
        res.status(500).send("error");
    }
});

async function searchAkwamHumanly(query) {
    try {
        // محاكاة البحث
        const searchUrl = `https://ak.sv/search?q=${encodeURIComponent(query)}`;
        const response = await axios.get(searchUrl, { 
            headers: humanHeaders, 
            timeout: 10000 
        });
        
        const html = response.data;
        const watchMatch = html.match(/href="(https?:\/\/ak\.sv\/watch\/[^"]+)"/i);
        
        if (!watchMatch) return "not_found";

        // الدخول لصفحة المشاهدة كبشر
        const watchPageRes = await axios.get(watchMatch[1], { 
            headers: { ...humanHeaders, 'Referer': searchUrl } 
        });
        
        const watchHtml = watchPageRes.data;

        // سحب الروابط المباشرة
        const videoRegex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)/gi;
        const videoLinks = watchHtml.match(videoRegex);

        if (videoLinks && videoLinks.length > 0) {
            return videoLinks[0].replace(/\\/g, '');
        }

        return "not_found";
    } catch (err) {
        return "not_found";
    }
}

app.get('/', (req, res) => {
    res.json({ status: "success", mode: "Human_Simulation_Active" });
});

app.listen(PORT, () => console.log(`Server running with Human Headers`));
