const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const TOKEN = "8291407370:AAGI87MoWKuZgHo-zspSPvd8up9IBmUxsxw";
const CHAT_ID = "1544455907";

// ❗ بدون polling لتفادي خطأ 409
const bot = new TelegramBot(TOKEN, { polling: false });

// صفحة الفئة
const CATEGORY_URL = "https://egydead.media/category/افلام-كرتون/?page=2";

// كاش لمنع التكرار
let sentLinks = new Set();

/**
 * استخراج روابط الفيديو (mp4 / m3u8 / iframe)
 */
async function extractVideoLinks() {
  const res = await axios.get(CATEGORY_URL, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  const $ = cheerio.load(res.data);
  let results = [];

  // روابط iframes
  $('iframe').each((i, el) => {
    const src = $(el).attr('src');
    if (src) results.push(src);
  });

  // روابط mp4 و m3u8
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (
      href &&
      (href.endsWith('.mp4') ||
       href.endsWith('.m3u8'))
    ) {
      results.push(href);
    }
  });

  return [...new Set(results)];
}

/**
 * إرسال الروابط كل دقيقة
 */
async function sendLinksToTelegram() {
  try {
    const links = await extractVideoLinks();

    for (const link of links) {
      if (!sentLinks.has(link)) {
        sentLinks.add(link);
        await bot.sendMessage(
          CHAT_ID,
          `🎬 رابط فيديو:\n${link}`
        );
      }
    }
  } catch (err) {
    console.log("⚠️ خطأ:", err.message);
  }
}

// تشغيل كل دقيقة
setInterval(sendLinksToTelegram, 60 * 1000);
sendLinksToTelegram();

// فحص السيرفر
app.get('/', (req, res) => {
  res.send('✅ BitMac-TV يعمل بدون Chrome وبدون أخطاء');
});

app.listen(PORT, () => {
  console.log(`Server BitMac-TV يعمل على ${PORT}`);
});
