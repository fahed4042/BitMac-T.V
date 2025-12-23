const express = require('express');
const puppeteer = require('puppeteer-core'); // استخدم puppeteer-core
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

// 🔹 ضع التوكن ورقم الحساب هنا مباشرة
const TOKEN = "8291407370:AAGI87MoWKuZgHo-zspSPvd8up9IBmUxsxw"; 
const CHAT_ID = "1544455907";

if (!TOKEN || !CHAT_ID) {
  console.error("❌ لم يتم توفير رمز بوت تيليجرام أو Chat ID!");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// صفحة الفئة
const categoryUrl = "https://egydead.media/category/افلام-كرتون/?page=2";

// تخزين روابط الفيديو الحالية
let videoLinksCache = {};

// تشغيل Chromium من المسار المتوفر في Render
async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium-browser",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
}

// استخراج روابط صفحات الأفلام من صفحة الفئة
async function extractFilmLinks(pageUrl) {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(pageUrl, { waitUntil: "networkidle2" });

  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a"));
    return anchors
      .map(a => a.href)
      .filter(href => href.includes("/movies/") || href.includes("/films/"));
  });

  await browser.close();
  return [...new Set(links)];
}

// استخراج رابط الفيديو من صفحة الفيلم
async function extractVideoFromFilm(filmUrl) {
  try {
    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.goto(filmUrl, { waitUntil: "networkidle2" });

    const videoLink = await page.evaluate(() => {
      const iframe = document.querySelector("iframe[src]");
      if (iframe) return iframe.src;

      const source = document.querySelector("video source");
      if (source) return source.src;

      return null;
    });

    await browser.close();
    return videoLink || "رابط الفيديو غير موجود";
  } catch (err) {
    return "خطأ: " + err.toString();
  }
}

// استخراج كل الفيديوهات من صفحة الفئة
async function extractCategoryVideosFast() {
  const filmLinks = await extractFilmLinks(categoryUrl);

  const promises = filmLinks.map(async filmUrl => {
    const videoLink = await extractVideoFromFilm(filmUrl);

    const cached = videoLinksCache[filmUrl];
    if (cached !== videoLink) {
      videoLinksCache[filmUrl] = videoLink;
      bot.sendMessage(CHAT_ID, `🎬 الرابط الجديد:\n${filmUrl}\n▶️ ${videoLink}`);
    }

    return { filmUrl, videoLink };
  });

  return Promise.all(promises);
}

// تحديث دوري كل 10 دقائق
setInterval(extractCategoryVideosFast, 10 * 60 * 1000);
extractCategoryVideosFast(); 

// بوت تيليجرام /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "✅ جاري إرسال روابط الفيديو الحالية...");
  for (const [filmUrl, videoLink] of Object.entries(videoLinksCache)) {
    bot.sendMessage(chatId, `🎬 الصفحة: ${filmUrl}\n▶️ الرابط: ${videoLink}`);
  }
});

// Endpoint للتأكد من تشغيل السيرفر
app.get('/', (req, res) => {
  res.send('✅ السيرفر والبوت شغالين بنجاح!');
});

// Endpoint لإرجاع روابط الفيديوهات بصيغة JSON
app.get('/videos', async (req, res) => {
  res.json(videoLinksCache);
});

app.listen(port, () => {
  console.log(`Server BitMac-TV يعمل على المنفذ ${port}`);
});
