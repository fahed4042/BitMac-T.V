
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const TOKEN = "8291407370:AAGI87MoWKuZgHo-zspSPvd8up9IBmUxsxw";
const CHAT_ID = "1544455907";

// ❌ بدون polling (لتجنب 409)
const bot = new TelegramBot(TOKEN, { polling: false });

/* =========================
   🔹 توليد روابط vidsrc
========================= */

// فيلم
function movieLink(movieId) {
  return `https://vidsrc.to/embed/movie/${movieId}`;
}

// مسلسل
function tvLink(tvId, season, episode) {
  return `https://vidsrc.to/embed/tv/${tvId}/${season}/${episode}`;
}

/* =========================
   🔹 أمثلة إرسال
========================= */

async function sendExamples() {
  // مثال فيلم
  const movie = movieLink(550); // Fight Club
  await bot.sendMessage(CHAT_ID, `🎬 فيلم:\n${movie}`);

  // مثال مسلسل
  const tv = tvLink(1399, 1, 1); // Game of Thrones S01E01
  await bot.sendMessage(CHAT_ID, `📺 مسلسل:\n${tv}`);
}

// إرسال مرة عند التشغيل
sendExamples();

/* =========================
   🔹 API لتطبيقك (Sketchware)
========================= */

// فيلم
app.get('/movie/:id', (req, res) => {
  const url = movieLink(req.params.id);
  res.json({ server: "VIDSRC", url });
});

// مسلسل
app.get('/tv/:id/:season/:episode', (req, res) => {
  const { id, season, episode } = req.params;
  const url = tvLink(id, season, episode);
  res.json({ server: "VIDSRC", url });
});

app.get('/', (req, res) => {
  res.send('✅ BitMac-TV يعمل – VIDSRC Generator');
});

app.listen(PORT, () => {
  console.log(`Server BitMac-TV يعمل على ${PORT}`);
});
