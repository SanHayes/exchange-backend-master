const express = require('express')
const app = express()
const axios = require('axios')
const cors = require('cors')
//const fs = require('fs')
const WebSocket = require('ws')
const config = require('../config.js')
const Helper = require("../helpers");
const fileSys = config.PATH_SYS_CONFIG;
const dataSys = Helper.getConfig(fileSys);

app.use(cors());

let httpServer;

if (!config.USE_SSL) {
    httpServer = require('http').createServer(app);
} else {
    let options = Helper.ssl;

    httpServer = require('https').createServer(options, app);
}

const wss = new WebSocket.Server(
    {
        server: httpServer,
        //port: 80 
    }
)

const port = config.PORT_SYS
httpServer.listen(port, () => {
    console.log(`SYS start port: ${port}`);
});

// const configGetCoin = {
//     headers: {
//         'Accepts': 'application/json',
//         'X-CMC_PRO_API_KEY': 'a5140c7d-492a-4d74-8c6d-f72f75e039ab'
//     },
//     params: {
//         symbol: 'BTC,ETH,USDT,BNB'
//     },
//   }

function getCoinData() {
    let BNB, BTC, ETH;
    dataSys.quotePriceUSDT = 1

    axios.get('https://min-api.cryptocompare.com/data/price', {
        params: {
            fsym: "BNB",
            tsyms: "USD"
        }
    }).then((res) => {
        let data = res.data;
        BNB = data.USD;
        dataSys.quotePriceBNB = BNB;
    }).catch((error) => { });

    axios.get('https://min-api.cryptocompare.com/data/price', {
        params: {
            fsym: "BTC",
            tsyms: "USD"
        }
    }).then((res) => {
        let data = res.data;
        BTC = data.USD;
        dataSys.quotePriceBTC = BTC;
    }).catch((error) => { });

    axios.get('https://min-api.cryptocompare.com/data/price', {
        params: {
            fsym: "ETH",
            tsyms: "USD"
        }
    }).then((res) => {
        let data = res.data;
        ETH = data.USD;
        dataSys.quotePriceETH = ETH;

        let json = JSON.stringify(dataSys)

        Helper.setConfig(fileSys, dataSys);

        wss.clients.forEach(client => {
            client.send(JSON.stringify({ type: 'getDataSys', data: dataSys }))
        });

    }).catch((error) => { });



    // axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', configGetCoin)
    // .then((res) => {
    //     let data = res.data.data
    //     let USDT = data.USDT.quote.USD.price
    //     let ETH = data.ETH.quote.USD.price
    //     let BTC = data.BTC.quote.USD.price
    //     let BNB = data.BNB.quote.USD.price

    // })
}

getCoinData()

let timeLoop = 60;
let autoQuoteSet = true
let checkAuto = true
autoQuote(timeLoop, autoQuoteSet)

function autoQuote(t, a) {
    let auto
    if (!a) {
        return clearInterval(auto)
    } else {
        auto = setInterval(() => {
            getCoinData()
        }, t * 1000);
    }

}



wss.on('connection', ws => {

    ws.on('message', d => {
        const data = JSON.parse(d);

        if (data.type === 'setDataSys') {
            let g = data.data

            dataSys.quotePriceUSDT = g.qUSDT // 价格接近美元
            dataSys.quotePriceETH = g.qETH // 价格接近美元
            dataSys.quotePriceBTC = g.qBTC // 价格接近美元
            dataSys.quotePricePAYPAL = g.qPaypal //  价格接近美元
            dataSys.quotePriceVND = g.qVND //  价格接近美元

            dataSys.typeCurrUseSys = g.tCUseSys // 系统使用的货币

            dataSys.minDepositBTC = g.mDBTC // 最低存款
            dataSys.minDepositETH = g.mDETH // 最低存款
            dataSys.minDepositUSDT = Number(g.mDUSDT) // 最低存款
            dataSys.minDepositPaypal = g.mDPaypal // 最低存款

            dataSys.minWithdrawalBTC = g.mWBTC // 最低提款
            dataSys.minWithdrawalETH = g.mWETH // 最低提款
            dataSys.minWithdrawalUSDT = Number(g.mWUSDT) // 最低提款
            dataSys.minWithdrawalPaypal = g.mWPaypal // 最低提款

            dataSys.isActiveWalletPaypal = g.iAWPaypal // 在系统中开启/关闭用于充值和充值的COIN
            dataSys.isActiveWalletVND = g.iAWVND // 在系统中开启/关闭用于充值和充值的COIN
            dataSys.bankInfo = g.bankInfo // 在系统中开启/关闭用于充值和充值的COIN
            dataSys.isActiveWalletETH = g.iAWETH // 在系统中开启/关闭用于充值和充值的COIN
            dataSys.isActiveWalletUSDT = g.iAWUSDT // 在系统中开启/关闭用于充值和充值的COIN
            dataSys.isActiveWalletBTC = g.iAWBTC // 在系统中开启/关闭用于充值和充值的COIN

            dataSys.feeRutPaypalNoiBo = g.fDPaypalNB
            dataSys.feeRutPaypalAcc = g.fDPaypalAcc
            dataSys.feeRutBTCNoiBo = g.fDBTCNB
            dataSys.feeRutBTCAcc = g.fDBTCAcc
            dataSys.feeRutETHNoiBo = g.fDETHNB
            dataSys.feeRutETHERC20 = g.fDETHERC20
            dataSys.feeRutUSDTNoiBo = g.fDUSDTNB
            dataSys.feeRutUSDTBEP20 = g.fDUSDTBEP20
            dataSys.feeRutUSDTERC20 = g.fDUSDTERC20

            dataSys.maintenance = g.maintenance
            dataSys.ADDRESS_ETH_USDT = g.ADDRESS_ETH_USDT
            dataSys.PRIVATE_KEY_ADDRESS_ETH_USDT = g.PRIVATE_KEY_ADDRESS_ETH_USDT
            dataSys.ADDRESS_ETH_TRANSACTION = g.ADDRESS_ETH_TRANSACTION
            dataSys.PRIVATE_KEY_ETH_TRANSACTION = g.PRIVATE_KEY_ETH_TRANSACTION
            dataSys.IS_TEST_SMART_CHAIN = g.IS_TEST_SMART_CHAIN

            dataSys.isActiveluckyDraw = g.isActiveluckyDraw
            dataSys.isActiveChampion = g.isActiveChampion

            dataSys.support = g.support;
            timeLoop = g.timeLoopQuote
            autoQuoteSet = g.autoQuote

            if (g.autoQuote && !checkAuto) {
                checkAuto = true
                autoQuote(g.timeLoopQuote, true)
                console.log('Auto On')
            } else {
                checkAuto = false
                autoQuote(99999999, false)
                console.log('Auto Off')
            }

            //let json = JSON.stringify(dataSys)
            Helper.setConfig(fileSys, dataSys);

            //fs.writeFile(fileSys, json, 'utf8', function(err) {
            //   if (err) throw err;
            //})
        }
    })

    dataSys['timeLoop'] = timeLoop
    dataSys['autoQuoteSet'] = autoQuoteSet

    const dataSyss = Helper.getConfig(fileSys);

    ws.send(JSON.stringify({ type: 'getDataSys', data: dataSyss }))

})