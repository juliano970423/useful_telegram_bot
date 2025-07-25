//require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const { calc } = require('./calc');
const { deleteFromS3, getExpiredFiles, removeRecords } = require('./upload_files');
const {ytdlp}  = require('./yt-dlp');
const app = express();
const homo = require('./homo');

app.use(express.json());
const token = process.env.TELEGRAM_BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: false });

// 設定 Webhook（Render 提供的網址）
const webhookPath = `/bot${token}`;
const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}${webhookPath}`;

bot.setWebHook(webhookUrl);

app.post(webhookPath, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get('/delete', async (req, res) => {
  try {
    const expiredFiles = getExpiredFiles();
    if (expiredFiles.length === 0) {
      return res.send('✅ 没有过期的文件需要删除。');
    }

    for (const s3Key of expiredFiles) {
      await deleteFromS3(s3Key);
      console.log(`🗑️ 已删除文件: ${s3Key}`);
    }

    removeRecords(expiredFiles); // 清理记录
    res.send(`✅ 成功删除 ${expiredFiles.length} 个过期文件。`);
  } catch (err) {
    console.error('❌ 删除失败:', err);
    res.status(500).send(`❌ 删除过程中发生错误: ${err.message}`);
  }
});

// Matches "/echo [whatever]"
bot.onText(/\/calc (.+)/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const chatId = msg.chat.id;
  const expr = match[1]; // the captured "whatever"
  try {
    const result = calc(expr);
    bot.sendMessage(chatId, `✅ Result: ${result}`);
  } catch (e) {
    bot.sendMessage(chatId, `❌ Error: ${e.message}`);
  }
});
// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});

// Matches "/homo [whatever]"
bot.onText(/\/homo (.+)/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const chatId = msg.chat.id;
  const number = Number(match[1]);
  if (isNaN(number)) {
    bot.sendMessage(chatId, "輸入錯誤");
    return;
  }
  const resp = homo(number);

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});

bot.onText(/\/ytdlp (\w+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const type = match[1].toLowerCase(); // 'video' or 'audio'
  const url = match[2]; // 视频地址

  if (!['video', 'audio'].includes(type)) {
    return bot.sendMessage(chatId, '❌ 类型错误，请使用 "video" 或 "audio"');
  }

  try {
    bot.sendMessage(chatId, `⏳ 正在下载 ${type}，请稍等...`);

    const downloadUrl = await ytdlp(url, type);
    bot.sendMessage(chatId, `✅ 下载完成！\n🔗 下载地址: ${downloadUrl}`);
  } catch (err) {
    console.error(`❌ 下载失败: ${err.message}`);
    bot.sendMessage(chatId, `❌ 下载失败: ${err.message}`);
  }
});

// Listen for any kind of message. There are different kinds of
// messages.
//bot.on('message', (msg) => {
//  const chatId = msg.chat.id;
//
//  // send a message to the chat acknowledging receipt of their message
//  bot.sendMessage(chatId, 'Received your message');
//});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot 已啟動於 port ${PORT}`);
});