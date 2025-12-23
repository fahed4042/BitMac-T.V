const express = require('express');
const { chromium } = require('playwright'); // Playwright مع Chromium مضمن
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TOKEN = "8291407370:AAGI87MoWKuZgHo-zspSPvd8up9IBmUxsxw";
const CHAT_ID = "1544455907";

const bot = new TelegramBot(TOKEN, { polling: true });

// رابط الصفحة التي تريد استخراج الفيديوهات منها
const pageUrl = "https://egydead.media/category/افلام-كرتون/?page=2";

// دالة استخراج روابط الفيديو
async function extractVideoLinks(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });

  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a"));
    return anchors
      .map(a => a.href)
      .filter(href => href.includes("/movies/") || href.includes("/films/"));
  });

  await browser.close();
  return [...new Set(links)];
}

// دالة إرسال الروابط للبوت مباشرة
async function sendLinksToBot() {
  try {
    const links = await extractVideoLinks(pageUrl);
    if (!links.length) {
      bot.sendMessage(CHAT_ID, "❌ لم يتم العثور على روابط فيديو.");
      return;
    }

    for (const link of links) {
      bot.sendMessage(CHAT_ID, `🎬 رابط فيلم: ${link}`);
    }
  } catch (err) {
    bot.sendMessage(CHAT_ID, `⚠️ حدث خطأ: ${err.toString()}`);
  }
}

// تحديث تلقائي كل 10 دقائق
setInterval(sendLinksToBot, 10 * 60 * 1000);
sendLinksToBot(); // التشغيل أول مرة

// بوت تيليجرام /start
bot.onText(/\/start/, async (msg) => {
  bot.sendMessage(msg.chat.id, "✅ جاري إرسال روابط الفيديو الحالية...");
  await sendLinksToBot();
});

// Endpoint للتأكد من أن السيرفر شغال
app.get('/', (req, res) => {
  res.send('✅ السيرفر والبوت شغالين بنجاح!');
});

app.listen(PORT, () => {
  console.log(`Server BitMac-TV يعمل على المنفذ ${PORT}`);
});
