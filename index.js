const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

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

    if (!id || !baseUrl) {
        return res.status(400).send("error: missing parameters");
    }

    try {
        const targetUrl = `${baseUrl}${id}`;
        const response = await axios.get(targetUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': targetUrl
            }
        });

        // استخراج روابط الفيديو (يدعم MP4 و M3U8)
        const videoRegex = /https?:\/\/[^'"]+\.(mp4|m3u8|mkv)[^'"]*/g;
        const matches = response.data.match(videoRegex);

        if (matches && matches.length > 0) {
            res.status(200).send(matches[0]);
        } else {
            res.status(404).send("error: video link not found");
        }
    } catch (error) {
        res.status(500).send("error: server error - " + error.message);
    }
});

app.listen(PORT, () => console.log(`BitMac-T.V Server running on port ${PORT}`));

