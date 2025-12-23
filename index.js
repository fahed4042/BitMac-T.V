const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
const TOKEN = process.env.TELEGRAM_TOKEN; // توكن البوت
const CHAT_ID = process.env.TELEGRAM_CHAT_ID; // ID حسابك

const bot = new TelegramBot(TOKEN, { polling: true });

// جميع روابط الصفحات من الاستضافات
const videoPages = [
  "https://hglink.to/e/386i5xkxrtsh",
  "https://filemoon.sx/e/raurvwi75wym",
  "https://minochinos.com/v/wyrmhk6mxbwe",
  "https://mxdrop.to/e/36qmlomvfg8ddg",
  "https://dsvplay.com/e/unq1qpbmeegl",
  "https://forafile.com/embed-gecqil9kpayt.html",
  "https://forafile.com/gecqil9kpayt/One.Punch.Man.S03E11.EgyDead.CoM.mp4.html"
];

// دالة استخراج روابط الفيديو الحقيقية
async function extractVideo(url) {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const video = await page.evaluate(() => {
      const v = document.querySelector("video source");
      if (v) return v.src;

      const found = performance.getEntries()
        .map(e => e.name)
        .find(u => u.includes(".m3u8") || u.includes(".mp4"));
      return found || null;
    });

    await browser.close();
    return video || "رابط الفيديو غير موجود";
  } catch (e) {
    return "خطأ: " + e.toString();
  }
}

// عند الضغط على /start في البوت
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "جارٍ استخراج روابط الفيديوهات...");

  for (const url of videoPages) {
    const videoLink = await extractVideo(url);
    bot.sendMessage(chatId, videoLink);
  }
});

// Endpoint للتأكد أن السيرفر شغال
app.get('/', (req, res) => {
  res.send('تم تشغيل السيرفر والبوت بنجاح!');
});

// Endpoint لإرجاع روابط الفيديوهات بصيغة JSON
app.get('/videos', async (req, res) => {
  const results = [];
  for (const url of videoPages) {
    const link = await extractVideo(url);
    results.push({ page: url, video: link });
  }
  res.json(results);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
