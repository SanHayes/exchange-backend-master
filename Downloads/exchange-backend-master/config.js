require('./env')
let USE_SSL = false;

module.exports = {
    USE_SSL,
    CF_SSL: {
        key: 'certs/panazic.key',
        cert: 'certs/panazic.crt'
    },

    DOMAIN: 'https://gatediamon.one',
    TITLE_SITE: 'GATEDIAMON',
    CONTACT: 'support@gatediamon.one',

    MAIL_USERNAME: process.env.MAIL_USERNAME,
    MAIL_PASSWORD: process.env.MAIL_PASSWORD,
    MAIL_LOGO: 'https://gatediamon.one/logo.png',
    MAIL_IMG_FOOTER: 'https://gatediamon.one/line.png',

    SO_GIAY_DEM_NGUOC: 180, //下单时间
    RATE_NHA_THUONG: 9, // 每次获胜的奖励率为9,计算为0.09
    BET_MAX: 1,

    BINANCE_APIKEY: process.env.BINANCE_APIKEY,
    BINANCE_APISECRET: process.env.BINANCE_APISECRET,

    // PAYPAL

    PAYPAL_MODE: process.env.PAYPAL_MODE || 'sandbox', //sandbox or live
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,//'',
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,//'',
    // PAYPAL

    DATA_HOST: process.env.DATA_HOST,
    DATA_USER: process.env.DATA_USER,
    DATA_PASS: process.env.DATA_PASS,
    DATA_DB: process.env.DATA_DB,
    DATA_PORT: process.env.DATA_PORT || 3306,

    PORT_TRADE: 2096, // default 443 ssl
    PORT_SYS: 2087,
    PORT_NAP: 2083,
    PORT_NOTIFY: 2053,
    PORT_SERVER: 8888,

    TOKEN_KEY: process.env.TOKEN_KEY || 'exchange',

    PATH_SYS_CONFIG: 'stSys',
    PATH_SYS_COMMISSION: 'stCommission',
    PATH_SYS_COMMISSION_VIP: 'stCommissionVip',

    ABI_USDT_MAINNET: 'USDT_BEP20_mainnet',
    ABI_USDT_TESTNNET: 'USDT_BEP20_testnet',

    TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
    TELEGRAM_BET_ID: process.env.TELEGRAM_BET_ID,
    TELEGRAM_RUT_ID: process.env.TELEGRAM_RUT_ID,
    TELEGRAM_NAP_ID: process.env.TELEGRAM_NAP_ID,
    TELEGRAM_BET_AMOUNT: process.env.TELEGRAM_BET_AMOUNT,
    TELEGRAM_BET_THONG_BAO: process.env.TELEGRAM_BET_THONG_BAO,
    TELEGRAM_BET_PHIM_LENH: process.env.TELEGRAM_BET_PHIM_LENH,
    // blockcypher.com api
    BLOCKCYPHER_TOKEN: process.env.BLOCKCYPHER_TOKEN,
    // infura.io
    INFURA_PROJECT_ID: process.env.INFURA_PROJECT_ID
}


