// --- تفعيل الستريمر التلقائي للبوت ليعمل 24 ساعة على السيرفر ---
const activeBot = new TelegramBot(BOT_TOKEN, { polling: true });

activeBot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  
  // التحقق مما إذا كانت الرسالة تحتوي على فيديو أو مستند فيديو
  const videoObj = msg.video || (msg.document && msg.document.mime_type && msg.document.mime_type.includes('video') ? msg.document : null);

  if (videoObj) {
    try {
      const fileId = videoObj.file_id;
      // الحصول على الرابط المباشر من سيرفرات تيليجرام مباشرة
      const fileLink = await activeBot.getFileLink(fileId);
      
      await activeBot.sendMessage(chatId, `✅ **الرابط المباشر:**\n\n\`${fileLink}\``, {
        parse_mode: 'Markdown'
      });
    } catch (err) {
      console.error('Telegram Bot Error:', err);
      await activeBot.sendMessage(chatId, 'حدث خطأ أثناء استخراج الرابط المباشر.');
    }
  }
});
