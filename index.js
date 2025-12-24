const express = require('express');
const axios = require('axios');
const app = express();

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

const SERVERS = {
    vsrc: "https://vidsrc.to/embed/movie/",
    vxyz: "https://vidsrc.xyz/embed/movie/",
    mapi: "https://moviesapi.club/movie/",
    gdrv: "https://databasegdriveplayer.xyz/player.php?tmdb/",
    ntgo: "https://www.nontongo.win/embed/movie/",
    clvb: "https://moviesapi.club/movie/"
};

app.get('/get-video', async (req, res) => {
    const { id, server } = req.query;
    const serverKey = server ? server.toLowerCase() : "vsrc";
    const baseUrl = SERVERS[serverKey];

    if (!id || !baseUrl) return res.status(400).send("Missing ID or Server");

    try {
        const targetUrl = `${baseUrl}${id}`;
        
        const response = await axios.get(targetUrl, {
            timeout: 15000, // زيادة وقت الانتظار لتجنب خطأ 500 في الاتصالات البطيئة
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': baseUrl,
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        // Regex محسّن لصيد الروابط المباشرة حتى لو كانت داخل ملفات JS
        const regex = /(https?:\/\/[^"']+\.(?:m3u8|mp4|mkv)(?:\?[^"']*)?)/g;
        let matches = response.data.match(regex);

        if (matches && matches.length > 0) {
            // تنظيف الرابط وإزالة الهروب (Backslashes)
            let finalLink = matches[0].replace(/\\/g, ""); 
            res.status(200).send(finalLink);
        } else {
            // محاكاة استخراج بديلة لبعض السيرفرات التي تشفر الروابط
            res.status(404).send("Link Not Found - Might be encrypted");
        }
    } catch (error) {
        console.error("Error fetching video:", error.message);
        res.status(500).send("Server Busy or Proxy Error");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

