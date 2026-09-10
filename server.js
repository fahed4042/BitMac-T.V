const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: '2000mb' }));
app.use(express.urlencoded({ limit: '2000mb', extended: true }));
app.use(express.static('public'));

const uploadDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2000 * 1024 * 1024 }
});

const BOT_TOKEN = process.env.BOT_TOKEN || '8740811206:AAG29igXLxFAZ9XjPoGbfAVOVMMsDYbnZxo';
const CHAT_ID = process.env.CHAT_ID || '1544455907';
const API_ID = parseInt(process.env.API_ID || '33190715');
const API_HASH = process.env.API_HASH || 'ced91cea20b517420df5f296117d67f3';

let mediaDatabase = [];
let foldersDatabase = [{ id: 'gen', name: 'المجلد العام' }];

const stringSession = new StringSession('');
const client = new TelegramClient(stringSession, API_ID, API_HASH, {
  connectionRetries: 5,
});

(async () => {
  try {
    console.log('جاري الاتصال ببروتوكول Telegram MTProto...');
    await client.start({ botAuthToken: BOT_TOKEN });
    console.log(`تم الاتصال بنجاح! السيرفر جاهز استقبال الملفات.`);

    client.addEventHandler(async (event) => {
      const message = event.message;
      if (message && message.media) {
        console.log('تم استقبال ملف جديد من تيليجرام!');
        
        let messageIdToSave = message.id;

        if (message.chatId && message.chatId.toString() !== CHAT_ID) {
            try {
                const forwarded = await client.forwardMessages(CHAT_ID, {
                    messages: [message.id],
                    fromPeer: message.chatId
                });
                if (forwarded && forwarded[0]) {
                  messageIdToSave = forwarded[0].id;
                }
            } catch (e) {
                console.log('ملاحظة أثناء توجيه الملف:', e.message);
            }
        }

        const host = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
        const streamingUrl = `${host}/stream/${messageIdToSave}`;
        
        const newMediaItem = {
          id: Date.now(),
          folderId: 'gen',
          type: 'movie',
          title: message.message || 'فيديو جديد من تيليجرام',
          episode: '',
          url: streamingUrl,
          messageId: messageIdToSave
        };
        
        mediaDatabase.unshift(newMediaItem);
        console.log('تم إضافة الفيديو بنجاح للمكتبة!');
      }
    }, new NewMessage({}));

  } catch (err) {
    console.error('خطأ في الاتصال بتيليجرام:', err.message);
  }
})();

app.post('/upload-video', upload.single('video'), async (req, res) => {
  req.setTimeout(0);
  res.setTimeout(0);

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'لم يتم إرفاق أي فيديو' });
  }

  const filePath = req.file.path;
  const { title, type, episode, folderId } = req.body;
  const workName = title || 'بدون عنوان';
  const workEpisode = episode || '';

  try {
    const result = await client.sendFile(CHAT_ID, {
      file: filePath,
      caption: `🎬 *تم رفع عمل جديد!*\n📌 *الاسم:* ${workName}\n📺 *النوع:* ${type === 'series' ? 'مسلسل' : 'فيلم'} ${workEpisode}`,
      workers: 4,
    });

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const messageId = result.id;
    const host = `${req.protocol}://${req.get('host')}`;
    const streamingUrl = `${host}/stream/${messageId}`;

    const newMediaItem = {
      id: Date.now(),
      folderId: folderId || 'gen',
      type: type || 'movie',
      title: workName,
      episode: workEpisode,
      url: streamingUrl,
      messageId: messageId
    };
    mediaDatabase.unshift(newMediaItem);

    return res.json({ 
      success: true, 
      url: streamingUrl,
      item: newMediaItem
    });

  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Upload Error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'حدث خطأ أثناء الرفع إلى تيليجرام: ' + err.message 
    });
  }
});

app.get('/stream/:messageId', async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const messages = await client.getMessages(CHAT_ID, { ids: [messageId] });
    
    if (!messages || !messages[0] || !messages[0].media) {
      return res.status(404).send('الفيديو غير موجود');
    }

    res.setHeader('Content-Type', 'video/mp4');
    const buffer = await client.downloadMedia(messages[0].media, {});
    res.send(buffer);
  } catch (err) {
    console.error('Streaming Error:', err);
    res.status(500).send('خطأ في تشغيل الملف');
  }
});

app.post('/upload-video-url', async (req, res) => {
  try {
    const { url, title, type, episode, folderId } = req.body;
    if (!url || !title) {
      return res.status(400).json({ success: false, message: 'الرابط والاسم مطلوبان' });
    }

    const newMediaItem = {
      id: Date.now(),
      folderId: folderId || 'gen',
      type: type || 'movie',
      title: title,
      episode: episode || '',
      url: url
    };
    mediaDatabase.unshift(newMediaItem);

    res.json({ success: true, url: url, item: newMediaItem });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ الرابط' });
  }
});

app.get('/api/media-list', (req, res) => {
  res.json({ success: true, total: mediaDatabase.length, data: mediaDatabase });
});

app.put('/api/media-update/:id', (req, res) => {
  const { id } = req.params;
  const { url, title, episode, folderId } = req.body;
  
  const item = mediaDatabase.find(m => m.id == id);
  if (!item) return res.status(404).json({ success: false, message: 'العنصر غير موجود' });

  if (url) item.url = url;
  if (title) item.title = title;
  if (episode !== undefined) item.episode = episode;
  if (folderId) item.folderId = folderId;

  res.json({ success: true, message: 'تم التحديث بنجاح', item });
});

app.delete('/api/media-delete/:id', (req, res) => {
  const { id } = req.params;
  mediaDatabase = mediaDatabase.filter(m => m.id != id);
  res.json({ success: true, message: 'تم الحذف بنجاح' });
});

app.get('/api/folders', (req, res) => {
  res.json({ success: true, data: foldersDatabase });
});

app.post('/api/folders', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false });
  const newFolder = { id: 'f_' + Date.now(), name };
  foldersDatabase.push(newFolder);
  res.json({ success: true, folder: newFolder });
});

app.delete('/api/folders/:id', (req, res) => {
  const { id } = req.params;
  foldersDatabase = foldersDatabase.filter(f => f.id !== id);
  mediaDatabase.forEach(m => { if (m.folderId === id) m.folderId = 'gen'; });
  res.json({ success: true });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.timeout = 0;
server.keepAliveTimeout = 600000;
