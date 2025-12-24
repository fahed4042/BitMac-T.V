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

    if (!id || !baseUrl) return res.status(400).send("No ID");

    try {
        const targetUrl = `${baseUrl}${id}`;
        
        // محاولة جلب الصفحة مع Headers متقدمة
        const response = await axios.get(targetUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://vidsrc.to/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
        });

        // Regex متطور للبحث عن ملفات البث المباشرة (m3u8) أو الفيديو (mp4)
        // يبحث عن الروابط حتى لو كانت داخل Script أو Json
        const regex = /(https?:\/\/[^"']+\.(?:m3u8|mp4|mkv)(?:\?[^"']*)?)/g;
        const matches = response.data.match(regex);

        if (matches && matches.length > 0) {
            // تنظيف الرابط من أي رموز زائدة
            let finalLink = matches[0].replace(/\\/g, ""); 
            res.status(200).send(finalLink);
        } else {
            // إذا فشل، نحاول البحث عن روابط مشفرة شائعة في vidsrc
            res.status(404).send("Error: Link Encrypted or Not Found");
        }
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

app.listen(process.env.PORT || 10000);

