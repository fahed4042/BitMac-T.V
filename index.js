
const express = require('express');
const axios = require('axios'); // لجلب صفحات السيرفرات واستخرج روابط الفيديو
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Endpoint يعطي رابط MP4 مباشرة
app.get('/get-video', async (req, res) => {
    const videoId = req.query.id; // تمرر id الفيديو
    try {
        // مثال: جلب الصفحة من سيرفر MultiEmbed أو أي سيرفر آخر
        const pageUrl = `https://multiembed.mov/?video_id=${videoId}`;
        const response = await axios.get(pageUrl);

        // البحث عن رابط MP4 في الصفحة
        const matches = response.data.match(/https?:\/\/.*\.mp4/g);
        if (matches && matches.length > 0) {
            return res.send(matches[0]); // نرسل أول رابط MP4
        } else {
            return res.status(404).send("رابط MP4 غير موجود");
        }
    } catch (err) {
        return res.status(500).send("خطأ في السيرفر: " + err.toString());
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
