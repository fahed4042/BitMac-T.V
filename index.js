const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// JSON للروابط المخزنة في Environment Variables
app.get('/videos', (req, res) => {
  res.json({
    video1: process.env.VIDEO1,
    video2: process.env.VIDEO2,
    video3: process.env.VIDEO3,
    video4: process.env.VIDEO4,
    video5: process.env.VIDEO5
  });
});

app.get('/', (req, res) => {
  res.send('تم تشغيل السيرفر الخاص بك بنجاح على Render!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
