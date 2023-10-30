const {createPool} = require('mysql2');
const config = require('./config.js');

const pool = createPool({
    host: config.DATA_HOST,
    user: config.DATA_USER,
    password: config.DATA_PASS,
    database: config.DATA_DB,
    port: config.DATA_PORT,
    connectionLimit: 10,
    timezone: 'Asia/Ho_Chi_Minh',
});

module.exports = pool;
