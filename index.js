const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Endpoint يعطي رابط MP4 مباشرة
app.get('/get-video', async (req, res) => {
    const videoId = req.query.id; // تمرر id الفيديو
    const server = req.query.server || "multiembed"; // تحديد السيرفر تلقائي إذا لم يمرر
    try {
        let pageUrl;

        // بناء الرابط حسب السيرفر
        switch(server.toLowerCase()) {
            case "multiembed":
                pageUrl = `https://multiembed.mov/?video_id=${videoId}`;
                break;
            case "autoembed":
                pageUrl = `https://autoembed.cc/?id=${videoId}`;
                break;
            case "2embed":
                pageUrl = `https://2embed.cc/?id=${videoId}`;
                break;
            case "superembed":
                pageUrl = `https://superembed.stream/?id=${videoId}`;
                break;
            default:
                return res.status(400).send("❌ سيرفر غير معروف");
        }

        const response = await axios.get(pageUrl);

        // استخراج رابط MP4 من الصفحة
        const matches = response.data.match(/https?:\/\/[^'"]+\.mp4/g);
        if (matches && matches.length > 0) {
            return res.send(matches[0]); // نرسل أول رابط MP4
        } else {
            return res.status(404).send("❌ رابط MP4 غير موجود");
        }
    } catch (err) {
        return res.status(500).send("⚠️ خطأ في السيرفر: " + err.toString());
    }
});

app.listen(PORT, () => console.log(`BitMac-T.V server running on port ${PORT}`));
