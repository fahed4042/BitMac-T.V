const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Endpoint يعطي رابط MP4 مباشرة
app.get('/get-video', async (req, res) => {
    const videoId = req.query.id; 
    const server = req.query.server || "multiembed"; 

    try {
        let pageUrl;

        // بناء الرابط حسب السيرفر
        switch(server.toLowerCase()) {
            case "vsrc":
                pageUrl = `https://vidsrc.to/embed/movie/${videoId}`;
                break;
            case "vxyz":
                pageUrl = `https://vidsrc.xyz/embed/movie/${videoId}`;
                break;
            case "mapi":
                pageUrl = `https://moviesapi.club/movie/${videoId}`;
                break;
            case "gdrv":
                pageUrl = `https://databasegdriveplayer.xyz/player.php?tmdb/${videoId}`;
                break;
            case "ntgo":
                pageUrl = `https://www.nontongo.win/embed/movie/${videoId}`;
                break;
            case "clvb":
                pageUrl = `https://moviesapi.club/movie/${videoId}`;
                break;
            default:
                return res.status(400).send("❌ سيرفر غير معروف");
        }

        const response = await axios.get(pageUrl, { timeout: 10000 }); // timeout 10 ثواني

        // استخراج رابط MP4 من الصفحة
        const matches = response.data.match(/https?:\/\/[^'"]+\.mp4/g);
        if (matches && matches.length > 0) {
            return res.send(matches[0]);
        } else {
            return res.status(404).send("❌ رابط MP4 غير موجود");
        }
    } catch (err) {
        return res.status(500).send("⚠️ خطأ في السيرفر: " + err.toString());
    }
});

app.listen(PORT, () => console.log(`BitMac-T.V server running on port ${PORT}`));
