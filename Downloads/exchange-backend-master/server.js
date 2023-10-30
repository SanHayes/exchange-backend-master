const TelegramBot = require('node-telegram-bot-api')
const express = require("express");
const helmet = require("helmet");
const config = require('./config');

if (config.TELEGRAM_TOKEN) {
    global['ARESTele'] = new TelegramBot(config.TELEGRAM_TOKEN, {polling: true});
}

const app = express();
app.use(helmet());

//require('./hoahong'); // 跑去支付佣金
require('./src/app'); // 运行 http
require('./games/trade'); // 运行游戏
require('./auth/sys_settings'); // 运行系统设置
// require('./auth/mess'); // 运行机器人电报
require('./src/nap'); // 运行 BOT 加载
require('./api/autoNapCoin');
require('./auth/notifi'); // 运行通知
require('./auth/cleanData');

// process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
process.on('uncaughtException', exception => {
    console.log(`exception`, exception.stack);
});

process.on('unhandledRejection', (reason, p) => {
    console.log('未处理的 rejection：', p, '原因：', reason);
});