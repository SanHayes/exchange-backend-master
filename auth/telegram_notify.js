const config = require('../config');

const TELEGRAM_NAP_ID = config.TELEGRAM_NAP_ID;
const TELEGRAM_RUT_ID = config.TELEGRAM_RUT_ID;
const TELEGRAM_BET_ID = config.TELEGRAM_BET_ID;
const TELEGRAM_BET_AMOUNT = config.TELEGRAM_BET_AMOUNT;
const TELEGRAM_BET_THONG_BAO = config.TELEGRAM_BET_THONG_BAO;
const TELEGRAM_BET_PHIM_LENH = config.TELEGRAM_BET_PHIM_LENH;

module.exports = {

    sendMessBOTTrade: (content = '') => {

        // if(content == '' || content == null) return

        // global['ARESTele']?.sendMessage(`@${TELEGRAM_BET_PHIM_LENH}`, content, {parse_mode : "HTML"})
    },

    sendMessThongBao: (content = '') => {

        if (content === '' || content == null) return

        global['ARESTele']?.sendMessage(`@${TELEGRAM_BET_THONG_BAO}`, content, {parse_mode: "HTML"})
    },

    sendMessBetAmount: (content = '') => {

        if (content === '' || content == null) return
        global['ARESTele']?.sendMessage(`@${TELEGRAM_BET_AMOUNT}`, content, {parse_mode: "HTML"})
    },

    sendMessBet: (content = '') => {

        if (content === '' || content == null) return

        global['ARESTele']?.sendMessage(`@${TELEGRAM_BET_ID}`, content, {parse_mode: "HTML"})
    },

    sendMessNap: (content = '') => {

        if (content === '' || content == null) return

        global['ARESTele']?.sendMessage(`@${TELEGRAM_NAP_ID}`, content, {parse_mode: "HTML"})
    },

    sendMessRut: (content = '') => {

        if (content === '' || content == null) return

        global['ARESTele']?.sendMessage(`@${TELEGRAM_RUT_ID}`, content, {parse_mode: "HTML"})
    },

    sendImage: (linkImage = '', content = '') => {


        if (linkImage != '' && content == '') {

            global['ARESTele'].sendPhoto(`@${TELEGRAM_RUT_ID}`, linkImage)

        } else if (linkImage != '' && content != '') {

            global['ARESTele'].sendPhoto(`@${TELEGRAM_RUT_ID}`, linkImage, {caption: content, parse_mode: "HTML"})

        }

    }
}