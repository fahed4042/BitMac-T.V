
const express = require('express');
const { chromium } = require('playwright');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TOKEN = "8291407370:AAGI87MoWKuZgHo-zspSPvd8up9IBmUxsxw"; 
const CHAT_ID = "1544455907";

const bot = new TelegramBot(TOKEN, { polling: false }); // Webhook بدون polling

// رابط صفحة EGYDEAD التي تريد استخراج الفيديوهات منها
const pageUrl = "https://egydead.media/category/افلام-كرتون/?page=2";

// دالة استخراج روابط الفيديو المباشرة من الصفحات
async function extractVideoLinks(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });

  // البحث عن روابط الفيديو داخل iframes أو ملفات الفيديو mp4
  const links = await page.evaluate(() => {
    const videoLinks = [];

    // روابط mp4 مباشرة
    document.querySelectorAll('video source').forEach(v => videoLinks.push(v.src));

    // روابط iframe
    document.querySelectorAll('iframe').forEach(f => {
      if(f.src) videoLinks.push(f.src);
    });

    return [...new Set(videoLinks)]; // إزالة التكرارات
  });

  await browser.close();
  return links;
}

// إرسال روابط الفيديو للبوت
async function sendLinksToBot() {
  try {
    const links = await extractVideoLinks(pageUrl);
    if (links.length === 0) {
      bot.sendMessage(CHAT_ID, "❌ لم يتم العثور على أي روابط فيديو.");
      return;
    }
    for (const link of links) {
      bot.sendMessage(CHAT_ID, `🎬 رابط فيديو: ${link}`);
    }
  } catch (err) {
    bot.sendMessage(CHAT_ID, `⚠️ حدث خطأ: ${err.message}`);
  }
}

// تحديث تلقائي كل 10 دقائق
setInterval(sendLinksToBot, 10 * 60 * 1000);
sendLinksToBot(); // التشغيل أول مرة عند بدء السيرفر

// Webhook endpoint (Render يتعامل مع HTTPS)
app.post(`/webhook/${TOKEN}`, (req, res) => {
  const update = req.body;
  bot.processUpdate(update);
  res.sendStatus(200);
});

// /start Endpoint للبوت
bot.onText(/\/start/, async (msg) => {
  bot.sendMessage(msg.chat.id, "✅ جاري إرسال روابط الفيديو الحالية...");
  await sendLinksToBot();
});

// Endpoint للتأكد من تشغيل السيرفر
app.get('/', (req, res) => {
  res.send('✅ السيرفر والبوت شغالين بنجاح!');
});

app.listen(PORT, () => {
  console.log(`Server BitMac-TV يعمل على المنفذ ${PORT}`);
});
