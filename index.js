const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TOKEN = "8291407370:AAGI87MoWKuZgHo-zspSPvd8up9IBmUxsxw";
const CHAT_ID = "1544455907";

const bot = new TelegramBot(TOKEN, { polling: false });

// رابط التصنيف الأساسي
const BASE_URL = "https://egydead.media/category/افلام-كرتون/?page=";

let videoQueue = [];
let sending = false;

/* =========================
   استخراج روابط الفيديو من كل الصفحات
========================= */
async function collectAllVideoLinks() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  let pageNum = 1;
  let allLinks = new Set();

  while (true) {
    const url = BASE_URL + pageNum;
    console.log("🔍 فحص الصفحة:", url);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a"))
        .map(a => a.href)
        .filter(h =>
          h.includes(".mp4") ||
          h.includes(".m3u8")
        );
    });

    if (links.length === 0) {
      break; // ما في روابط = خلصت الصفحات
    }

    links.forEach(l => allLinks.add(l));
    pageNum++;
  }

  await browser.close();
  return Array.from(allLinks);
}

/* =========================
   إرسال رابط واحد كل دقيقة
========================= */
async function startSending() {
  if (sending || videoQueue.length === 0) return;
  sending = true;

  setInterval(async () => {
    if (videoQueue.length === 0) {
      sending = false;
      return;
    }

    const link = videoQueue.shift();
    await bot.sendMessage(CHAT_ID, `🎬 رابط فيديو:\n${link}`);
  }, 60 * 1000); // دقيقة
}

/* =========================
   تشغيل أول مرة
========================= */
(async () => {
  try {
    videoQueue = await collectAllVideoLinks();
    console.log("✅ تم جمع", videoQueue.length, "روابط فيديو");
    startSending();
  } catch (e) {
    bot.sendMessage(CHAT_ID, "⚠️ خطأ: " + e.message);
  }
})();

/* =========================
   Endpoint فحص
========================= */
app.get('/', (req, res) => {
  res.send('✅ BitMac‑TV شغال ويرسل رابط كل دقيقة');
});

app.listen(PORT, () => {
  console.log(`Server BitMac-TV يعمل على المنفذ ${PORT}`);
});
