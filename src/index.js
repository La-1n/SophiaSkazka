require('dotenv').config();
const { createBot } = require('./bot');

const bot = createBot(process.env.BOT_TOKEN);

bot.launch();
console.log('🏔 Бот Архыз запущен!');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
