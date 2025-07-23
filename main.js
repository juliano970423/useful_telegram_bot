const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const { calc } = require('./calc');

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