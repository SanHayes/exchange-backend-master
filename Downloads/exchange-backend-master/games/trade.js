const express = require('express')
const app = express()
const config = require('./../config.js')
//const msg = require('./../msg')
const apiBinace = require('node-binance-api')
const Binance = require('binance-api-node').default;

const toFixed = require('tofixed')
const axios = require('axios')
const WebSocket = require('ws')
const { v1: uuidv1 } = require('uuid');
const cors = require('cors')
const { updatePriceWinLose } = require('./../api/trans_user');

const Tele = require("../auth/telegram_notify")
const Helper = require("../helpers");

const BOT_TRADE = require("../auth/model/botTrade");
const db = require('../database');

const { getPrize } = require('../helper/getPrize');
const { SEND_THONG_BAO } = require("../auth/notifi");

const fileSys = config.PATH_SYS_CONFIG
const fileCommission = config.PATH_SYS_COMMISSION

const {
    getPriceUser,
    updateBalanceUser,
    updatePersonalTrading,
    checkF0Commission,
    updateAmountRateCommission,
    checkF0CommissionInF0,
    updateAmountWin,
    updateAmountLose,
    insertBetOrder,
    getMaretingAcc,
    listF0With7Level
} = require("./../games/service.trade");


app.use(cors({
    origin: '*',
    optionsSuccessStatus: 200
}));

// use https

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

const port = config.PORT_TRADE
httpServer.listen(port, () => {
    console.log(`TRADE start port: ${port}`);
})


const instance = new apiBinace().options({
    APIKEY: config.BINANCE_APIKEY,
    APISECRET: config.BINANCE_APISECRET,
    useServerTime: true, // 如果出现时间戳错误，请在启动时与服务器时间同步
    test: false // 如果你想使用测试模式
});

const instanceFuture = Binance({
    apiKey: config.BINANCE_APIKEY,
    apiSecret: config.BINANCE_APISECRET,
});

var LIST_GET_DATA = [], jsonData = [], SO_GIAY_DEM_NGUOC = config.SO_GIAY_DEM_NGUOC, ANTI_BET = false, ORDER_OR_WATTING = 'order', timeGet = new Date().getTime();
const rateNhaThuong = config.RATE_NHA_THUONG; // 每次获胜的奖励率为95%
const SEVER_GET = 'BTC/USDT', BET_MAX = config.BET_MAX;
var BTC_USER_BUY = [], BTC_USER_SELL = [], AMOUNT_USER_BUY = [], AMOUNT_USER_SELL = [];
var PRICE_BUY_LIVE_BACKUP = 0, PRICE_SELL_LIVE_BACKUP = 0, PRICE_BUY_LIVE = 0, PRICE_SELL_LIVE = 0, PRICE_BUY_DEMO = 0, PRICE_SELL_DEMO = 0;
var totalPTBuy = 0, totalPTSell = 0, session = 1000000, AMOUNT_MARKETING_LOSE = 0, AMOUNT_MARKETING_WIN = 0, PRICE_MAKETING_BUY = 0, PRICE_MAKETING_SELL = 0;
var BUY = [], SELL = [], STATIC = [], getLoadStaticGue = {}, tCountDown, LIST_USER_XU_LY = {}, BTC_USER_BUY_BACK = [], BTC_USER_SELL_BACK = [];
let AMOUNT_MAX_BREAK_BRIDGE = 400, AMOUNT_NEGA_AMOUNT_BREAK_BRIDGE = -30, CLOSE_CHECK = 0, OPEN_CHECK = 0;

// 配置长胡须蜡烛的比例
const BIEN_DO = 2;
const TI_LE = 0.9;

var DATA_GL = require('./editBet');

const tradeConfig = Helper.getConfig('trade');

if (!(tradeConfig.static.length % 2)) {
    tradeConfig.static.shift();
    Helper.setConfig('trade', tradeConfig);
}

STATIC = tradeConfig.static;

session = tradeConfig.session;

function writeSessionDB() {
    tradeConfig.session = session;
    Helper.setConfig('trade', tradeConfig);
}

function writeStaticDB() {
    tradeConfig.static = STATIC;
    Helper.setConfig('trade', tradeConfig);
}

class PlayerData {
    constructor(id, uid) {
        this.id = id
        this.uid = uid
    }
}
const users = {};

wss.on('connection', ws => {

    // 登录网络将打印总数据
    ws.send(JSON.stringify({ type: 'getListDauTien', data: LIST_GET_DATA }))

    //get trans volum
    let totalBuy = 0, totalSell = 0;
    totalBuy = PRICE_BUY_LIVE;
    totalSell = PRICE_SELL_LIVE;

    let jsonTransVolum = { nbuy: totalBuy, nsell: totalSell, ptbuy: Number(totalPTBuy), ptsell: Number(totalPTSell) }
    ws.send(JSON.stringify({ type: 'transVolum', data: jsonTransVolum }))

    let countBUY = BUY.length;
    let countSELL = SELL.length;

    let staticShow = { ss: session, cbuy: countBUY, csell: countSELL, static: STATIC }


    if (Object.keys(getLoadStaticGue).length === 0) {
        getLoadStaticGue = { Moving: { b: 0, s: 0, m: 0 }, Oscillators: { b: 0, s: 0, m: 0 }, Summary: { b: 0, s: 0, m: 0 } }
    }


    ws.send(JSON.stringify({ type: 'static', data: staticShow, load: getLoadStaticGue }));




    ws.on('message', d => {
        const data = JSON.parse(d);
        //info
        if (data.type === 'accountDetail') {
            let obj = data.data;

            if (void 0 === obj.email) {
                let mess = { type: 'reloadAccount', mess: 'Không lấy được email!', style: 'danger' };
                ws.send(JSON.stringify({ type: 'mess', data: mess }));
                return;
            }
            // 删除用户，如果再次有连接则添加（保存结果处理日志）
            //let t = 0;
            for (let l in users) {
                if (users[l].email === obj.email) {
                    //t++;
                    //console.log(t+ ": " + users[l].email);
                    // send 在别处有登录账号
                    let ws = users[l].ws;
                    let mess = { type: 'disAccount', mess: 'Tài khoản của bạn đang được đăng nhập ở nơi khác!', style: 'danger' };
                    ws.send(JSON.stringify({ type: 'mess', data: mess }));
                    break;
                }
            }

            let player = new PlayerData(uuidv1(), 0);
            player.ws = ws;
            player.uid = obj.uid;
            player.email = obj.email;
            users[player.id] = player;


            for (let obj in users) {
                let uid = users[obj].uid;
                // 找到 ADMIN 的 UID 然后发送
                if (uid === 'ADMIN_BO') {
                    let ws = users[obj].ws;
                    ws.send(JSON.stringify({ type: 'getTruck', data: DATA_GL, min_am_go: AMOUNT_NEGA_AMOUNT_BREAK_BRIDGE, max_amount_be: AMOUNT_MAX_BREAK_BRIDGE }));
                }
            }
        }


        if (data.type === 'getListData') {
            ws.send(JSON.stringify({ type: 'getListDauTien', data: LIST_GET_DATA }));
            ws.send(JSON.stringify({ type: 'static', data: staticShow, load: getLoadStaticGue }));
        }

        // 游戏编辑
        if (data.type === 'editGL') {
            let obj = data.data

            if (obj.type === 'BTC_BUY') {
                BTC_SET_BUY_WIN()
            }
            if (obj.type === 'BTC_SELL') {
                BTC_SET_SELL_WIN()
            }
            if (obj.type === 'BTC_LESS') {
                BTC_LESS_WIN()
            }
            if (obj.type === 'BTC_OFF') {
                BTC_TOOL_OFF()
            }
            if (obj.type === 'BOT') {
                DATA_GL.BOT = !DATA_GL.BOT
            }
            if (obj.type === 'BOT_GO_TIEN') {
                DATA_GL.PRICE_FUND_ON_OFF = !DATA_GL.PRICE_FUND_ON_OFF;
            }
            if (obj.type === 'GO_TIEN_OFF') {
                DATA_GL.LESS_WIN = false;
                Tele.sendMessBet(`🔔 ADMIN <i>OFF</i> GỠ TIỀN\n🖲Hệ thống LỜI/LỖ hiện tại 💴: <i>${DATA_GL.PRICE_FUND_PROFITS}</i>👉Bây giờ LỜI/LỖ sẽ là: <i>0</i>`);
                DATA_GL.PRICE_FUND_PROFITS = 0;
            }
            if (obj.type === 'WRITE_AMOUNT_MAX_BREAK_BRIDGE') {
                AMOUNT_MAX_BREAK_BRIDGE = Number(obj.AMOUNT);
                Tele.sendMessBet(`🔔 ADMIN vừa đặt lại mốc BẺ 💴: <i>${obj.AMOUNT}</i>`);
            }
            if (obj.type === 'WRITE_AMOUNT_NEGA_AMOUNT_BREAK_BRIDGE') {
                AMOUNT_NEGA_AMOUNT_BREAK_BRIDGE = Number(obj.AMOUNT);
                Tele.sendMessBet(`🔔 ADMIN vừa đặt lại mốc GỠ 💴: <i>${obj.AMOUNT}</i>`);
            }
        }

        // 结尾

        if (data.type === 'bet') {
            let obj = data.data
            if (obj.type === 'buy') {
                BetBUY(ws, obj)
            } else {
                BetSELL(ws, obj)
            }
        }

    })



    ws.on('close', message => {
        // 如果用户失去连接，运行命令删除 id
        for (let obj in users) {
            if (users[obj].ws == ws) {
                delete users[obj];
                break;
            }
        }
    })


});

// 获取输入数据
getListStartGame();

function getListStartGame() {

    axios.get(`https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=120`)
        .then(data => {
            const getData = data.data;
            getData.map(d => {
                let t = Math.round(d[0]),
                    o = parseFloat(d[1]),
                    h = parseFloat(d[2]),
                    l = parseFloat(d[3]),
                    c = parseFloat(d[4]),
                    v = parseFloat(d[5]).toFixed(2);

                if (Math.abs(h - Math.max(c, o)) > BIEN_DO && Math.random() < TI_LE) {
                    h = Math.random() * BIEN_DO + Math.max(c, o);
                }
                if (Math.abs(l - Math.max(c, o)) > BIEN_DO && Math.random() < TI_LE) {
                    l = Math.min(c, o) - Math.random() * BIEN_DO;
                }
                let getS = { date: new Date(t - 30000).getTime(), open: o, high: h, low: l, close: c, volume: parseFloat(v) };
                LIST_GET_DATA.push(getS)
                jsonData = LIST_GET_DATA[LIST_GET_DATA.length - 1]
            });

            //LIST_GET_DATA[LIST_GET_DATA.length - 1].date = timeGet;
            countDownGame();

        })
}

let maintenance = false;

// 您是否激活了维护检查？
function AccpetIsBaoTri() {
    clearInterval(tCountDown);
    let oc = setInterval(() => {
        if (!maintenance) {
            clearInterval(oc);
            let msg = 'Bảo trì đã xong.';
            Tele.sendMessBet(msg);
            LIST_GET_DATA = [], jsonData = [], SO_GIAY_DEM_NGUOC = config.SO_GIAY_DEM_NGUOC, ANTI_BET = false, ORDER_OR_WATTING = 'order';
            // STATIC = [];
            BUY = [];
            SELL = [];
            getLoadStaticGue = {};
            getListStartGame();
            countDownGame();
        }
    }, 1000);
}

checkBaoTriBinance();

function checkBaoTriBinance() {
    setInterval(() => {
        axios.get('https://api.binance.com/sapi/v1/system/status')
            .then(data => {
                const getData = data.data;
                let dataSys = Helper.getConfig(fileSys);
                if (getData.status) { // 维护
                    dataSys.maintenance = maintenance = true; // 维护
                    let msg = 'Binance sẽ thực hiện nâng cấp hệ thống theo lịch trình. Quý khách trade coin vui lòng để ý để chủ động trong gd hoặc rút tiền.';
                    dataSys.maintenanceContent = msg;

                    Tele.sendMessBet(msg);
                    Helper.setConfig(fileSys, dataSys);
                    AccpetIsBaoTri();
                    let obj = { type: 'bet', mess: msg, style: 'danger' };
                    wss.clients.forEach(client => {
                        client.send(JSON.stringify({ type: 'mess', data: obj }));
                    })
                } else {
                    dataSys.maintenance = maintenance = false;
                    Helper.setConfig(fileSys, dataSys);
                    //let json = JSON.stringify(dataSys)
                    //fs.writeFile(fileSys, json, 'utf8', (err) => {})
                }
            }).catch((error) => { });
    }, 25000);
}

function XU_LY_SEND_BOT_DU_DOAN(s) {

    if (ORDER_OR_WATTING === 'order') {

        if (s === 29) {
            BOT_TRADE.SEND_TUONG_TAC();
        }

        if (s === 25) {
            BOT_TRADE.SEND_BOT_DU_BAO();
        }

        if (s === 15 || s < 3) {
            BOT_TRADE.SEND_BOT_SECOND(s);
        }
    }

}

/**
 * 游戏读秒
 */
function countDownGame() {


    const SO_GIAY_MAC_DINH = SO_GIAY_DEM_NGUOC;

    tCountDown = setInterval(() => {

        --SO_GIAY_DEM_NGUOC;
        playRealTimeSpot(SO_GIAY_DEM_NGUOC);

        jsonData['candleClose'] = String(SO_GIAY_DEM_NGUOC).padStart(2, '0');
        jsonData['type'] = ORDER_OR_WATTING;
        jsonData['session'] = session;
        
        // 电报前景发送处理
        XU_LY_SEND_BOT_DU_DOAN(SO_GIAY_DEM_NGUOC);
        //

        if (SO_GIAY_DEM_NGUOC === 0) {


            // 回到旧秒
            SO_GIAY_DEM_NGUOC = SO_GIAY_MAC_DINH + 1;


            // 改变状态

            ORDER_OR_WATTING = ORDER_OR_WATTING === 'order' ? 'watting' : 'order';


            // 如果您有 100 个项目，请清除
            if (STATIC.length > 99) {

                //STATIC = [];
                //SELL = [];
                //BUY = [];

                for (let i = 0; i < 20; i++) {

                    BUY.shift();
                    SELL.shift();
                    STATIC.shift();
                    writeStaticDB();

                }
            }

            // 清除虚拟 BOT
            BOTAOClear()

            if (ORDER_OR_WATTING === 'order') {

                // 在 Watting 结束时处理 BUY HE SELL

                xuLyChartKetThuc1Phien(jsonData);


                if (DATA_GL.BOT) {
                    BOTAOStart()
                }

                ANTI_BET = false // 最后
            } else {

                ANTI_BET = true // 不允许见面
                // 将列表提交给管理员
                xulyInVaoHisBeCau();

                SEND_MESS_THONG_BAO_CHENH_LECH();

                if (session !== 1000000) PUSH_STATIC(jsonData);

            }


        }



        // 将所有数据传输到客户端
        if (!maintenance) {
            wss.clients.forEach(client => {
                client.send(JSON.stringify({ type: 'allData', data: jsonData }));
            });
        }


    }, 1000)
}


function SEND_MESS_THONG_BAO_CHENH_LECH() {
    //let totalBuy = void 0 === eval(PRICE_BUY_LIVE.join('+')) ? 0 : eval(PRICE_BUY_LIVE.join('+'));
    //let totalSell = void 0 === eval(PRICE_SELL_LIVE.join('+')) ? 0 : eval(PRICE_SELL_LIVE.join('+'));

    let totalBuy = PRICE_BUY_LIVE - PRICE_MAKETING_BUY;
    let totalSell = PRICE_SELL_LIVE - PRICE_MAKETING_SELL;

    if (totalBuy > 0 || totalSell > 0) {
        Tele.sendMessBetAmount(`✍️Phiên: 💸<b>${session}</b>\n✍️Cửa BUY: 💸<b>${totalBuy}</b>\n✍️Cửa SELL: 💸<b>${totalSell}</b>`);
    }

}

let o = 0;


// 启动游戏
function playRealTimeSpot(s) {

    if (s === 0) {
        timeGet = new Date().getTime();
    }

    instance.candlesticks("BTCUSDT", "1m", (error, ticks) => { //symbol
        if (error == null) {
            let last_tick = ticks[ticks.length - 1];
            let [time, open, high, low, close, volume] = last_tick;
            let t = timeGet;

            let lastClose = LIST_GET_DATA[LIST_GET_DATA.length - 1].close;
            //let tC = lastClose - o;

            // 打开价格开关蜡烛（偶数蜡烛）
            //o = (tC + o + (Math.random() * 1.5)).toFixed(2)
            o = parseFloat(lastClose);
            if (s === 0) {
                jsonData = { date: t, open: o, high: o, low: o, close: o }
            }
            if (s === 30 || o == 0) {
                // o = parseFloat(parseFloat(open).toFixed(2));
                // jsonData = { date: t, open: o, high: o, low: o, close: o }
            }

            let h = parseFloat(jsonData.high.toFixed(2)),
                l = parseFloat(jsonData.low.toFixed(2)),
                c = parseFloat(parseFloat(close).toFixed(2)),
                v = parseFloat(parseFloat(volume).toFixed(2));
            // 系统维护检查

            // 测试结束
            // ======================================

            if (maintenance) return;

            if (c > h) {
                h = c;
            }

            if (c < l) {
                l = c;
            }

            // 编辑价格规格
            if (Math.abs(h - Math.max(c, o)) > BIEN_DO && Math.random() < TI_LE) {
                h = Math.random() * BIEN_DO + Math.max(c, o);
            }
            if (Math.abs(l - Math.min(c, o)) > BIEN_DO && Math.random() < TI_LE) {
                l = Math.min(c, o) - Math.random() * BIEN_DO;
            }

            // ======================================

            // 价格规格编辑结束

            //=========================================

            if (s < 30) {
                // jsonData = { date: t, open: o, high: h, low: l, close: c, volume: v }
                jsonData.date = t;
                jsonData.open = o;
                jsonData.high = h;
                jsonData.low = l;
                jsonData.close = c;
                jsonData.volume = v;
            }
            XU_LY_VOLUM(s, jsonData);
        }
    })

}

let rdSe = 7, rdSe2 = 26;

function XU_LY_VOLUM(s, jDATA) {

    //if(maintenance) return; // 维护，停止


    if ((ORDER_OR_WATTING === 'watting' && s < rdSe) && (ORDER_OR_WATTING === 'watting' && s !== 0) ||
        ORDER_OR_WATTING === 'order' && s > rdSe2 ||
        ORDER_OR_WATTING === 'order' && s === 0
    ) {
        //if((ORDER_OR_WATTING === 'watting' && s < rdSe) || 
        //	ORDER_OR_WATTING === 'order' && s > rdSe2 || 
        //	ORDER_OR_WATTING === 'watting' && s == 0
        //){
        //console.log(ORDER_OR_WATTING + ' --- ' + s);
        /* RA BUY */
        //if(!CHECK_XU_LY_VOL){
        //    CHECK_XU_LY_VOL = true;
        CLOSE_CHECK = jDATA.close;
        OPEN_CHECK = jDATA.open;

        //}


        let totalBuy = 0;
        let totalSell = 0;

        if (s < rdSe) {
            totalBuy = PRICE_BUY_LIVE_BACKUP = PRICE_BUY_LIVE;
            totalSell = PRICE_SELL_LIVE_BACKUP = PRICE_SELL_LIVE;
        }
        if (s > rdSe2) {
            totalBuy = PRICE_BUY_LIVE_BACKUP;
            totalSell = PRICE_SELL_LIVE_BACKUP;
        }


        totalBuy -= PRICE_MAKETING_BUY;
        totalSell -= PRICE_MAKETING_SELL;



        if (DATA_GL.BTC.BUY) {
            if (CLOSE_CHECK < OPEN_CHECK || CLOSE_CHECK == OPEN_CHECK) {
                let tl = OPEN_CHECK - CLOSE_CHECK;
                CLOSE_CHECK = CLOSE_CHECK + tl + (Math.random() * 3);

            } else {
                let rd = Math.floor(Math.random() * 6);
                if (rd % 2) {
                    CLOSE_CHECK = CLOSE_CHECK + (Math.random() * 3);
                } else {
                    //CLOSE_CHECK += (Math.random() * 3);
                }

            }
            jsonData.close = parseFloat(CLOSE_CHECK.toFixed(2));
        } else if (DATA_GL.BTC.SELL) {
            if (CLOSE_CHECK > OPEN_CHECK || CLOSE_CHECK == OPEN_CHECK) {
                let tl = CLOSE_CHECK - OPEN_CHECK;
                CLOSE_CHECK = CLOSE_CHECK - tl - (Math.random() * 3);
            } else {
                let rd = Math.floor(Math.random() * 6);
                if (rd % 2) {
                    CLOSE_CHECK = CLOSE_CHECK - (Math.random() * 3);
                } else {
                    //CLOSE_CHECK += (Math.random() * 3);
                }

            }
            jsonData.close = parseFloat(CLOSE_CHECK.toFixed(2));
        }
        /**
        * 少吃
        *
        */

        else if (DATA_GL.LESS_WIN) { // 至少吃

            if (totalBuy < totalSell) { // 购买将获胜（关闭>打开）
                if (CLOSE_CHECK < OPEN_CHECK || CLOSE_CHECK == OPEN_CHECK) {
                    let tl = OPEN_CHECK - CLOSE_CHECK;
                    CLOSE_CHECK = CLOSE_CHECK + tl + (Math.random() * 4);
                } else {
                    let rd = Math.floor(Math.random() * 6);
                    if (rd % 2) {
                        CLOSE_CHECK = CLOSE_CHECK + (Math.random() * 3);
                    } else {
                        //CLOSE_CHECK += (Math.random() * 3);
                    }

                }
                jsonData.close = parseFloat(CLOSE_CHECK.toFixed(2));
            } else if (totalBuy > totalSell) { // 卖出将获胜 ( CLOSE < OPEN ) // if(totalBuy > totalSell)
                if (CLOSE_CHECK > OPEN_CHECK || CLOSE_CHECK == OPEN_CHECK) {
                    let tl = CLOSE_CHECK - OPEN_CHECK;
                    CLOSE_CHECK = CLOSE_CHECK - tl - (Math.random() * 4);
                } else {
                    let rd = Math.floor(Math.random() * 6);
                    if (rd % 2) {
                        CLOSE_CHECK = CLOSE_CHECK - (Math.random() * 3);
                    } else {
                        //CLOSE_CHECK += (Math.random() * 3);
                    }

                }
                jsonData.close = parseFloat(CLOSE_CHECK.toFixed(2));
            }
        } else {


            let totalBuyAv = totalBuy - totalSell;
            let totalSellAv = totalSell - totalBuy;

            let rdn = AMOUNT_MAX_BREAK_BRIDGE;

            if (totalBuyAv > rdn) {
                // 卖出必胜 ( CLOSE < OPEN )
                if (CLOSE_CHECK > OPEN_CHECK || CLOSE_CHECK == OPEN_CHECK) {
                    let tl = CLOSE_CHECK - OPEN_CHECK;
                    CLOSE_CHECK = CLOSE_CHECK - tl - (Math.random() * 4);
                } else {
                    let rd = Math.floor(Math.random() * 6);
                    if (rd % 2) {
                        CLOSE_CHECK = CLOSE_CHECK - (Math.random() * 3);
                    } else {
                        //CLOSE_CHECK += (Math.random() * 3);
                    }

                }
                jsonData.close = parseFloat(CLOSE_CHECK.toFixed(2));

            } else if (totalSellAv > rdn) {
                // 买入必胜北绝（平仓>开仓）
                if (CLOSE_CHECK < OPEN_CHECK || CLOSE_CHECK == OPEN_CHECK) { // 如果关闭较小

                    let tl = OPEN_CHECK - CLOSE_CHECK;
                    CLOSE_CHECK = CLOSE_CHECK + tl + (Math.random() * 4);
                } else {
                    let rd = Math.floor(Math.random() * 6);
                    if (rd % 2) {
                        CLOSE_CHECK = CLOSE_CHECK + (Math.random() * 3);
                    } else {
                        //CLOSE_CHECK += (Math.random() * 3);
                    }

                }
                jsonData.close = parseFloat(CLOSE_CHECK.toFixed(2));

            }

        }
        /**
         * 少吃
         *
         */


    } else {
        PRICE_BUY_LIVE_BACKUP = PRICE_SELL_LIVE_BACKUP = 0;
        //CHECK_XU_LY_VOL = false;
        //CLOSE_CHECK = 0;
        //OPEN_CHECK = 0;
    }
}

function xuLyChartKetThuc1Phien(data) {

    if (maintenance) return; // 维护，停止



    PRICE_BUY_LIVE_BACKUP = PRICE_BUY_LIVE;
    PRICE_SELL_LIVE_BACKUP = PRICE_SELL_LIVE;



    PRICE_MAKETING_BUY = 0;
    PRICE_MAKETING_SELL = 0;

    /**
     * 期号累加
     *
     */

    session++;
    writeSessionDB();

    //}


    rdSe = Math.floor(Math.random() * 10) + 5;
    rdSe2 = Math.floor(Math.random() * 6) + 20;

    PUSH_STATIC_2(data);




    //timeGet = new Date().getTime();
    // 处理结果

}


function PUSH_STATIC(data) {

    let title;

    if (data.close > data.open) { // BUY
        title = 'buy';
        BUY.push(title);
    } else { // SELL
        title = 'sell';
        SELL.push(title);
    }

    if (LIST_GET_DATA.length >= 120) {
        LIST_GET_DATA.shift();
    }
    LIST_GET_DATA.push(data);

    STATIC.push(title);
    writeStaticDB();

    writeStatic();
}

function PUSH_STATIC_2(data) {

    let title;

    if (data.close > data.open) { // BUY
        title = 'buy';
        BUY.push(title);
    } else { // SELL
        title = 'sell';
        SELL.push(title);
    }

    BOT_TRADE.SEND_RESULT(title);

    if (LIST_GET_DATA.length >= 120) {
        LIST_GET_DATA.shift();
    }
    LIST_GET_DATA.push(data);

    STATIC.push(title);

    writeStaticDB();
    writeStatic();

    HandlingBuySell2(title);

}

function xuLyChartKetThuc1Phien_backup(data) {

    if (maintenance) return; // 维护，停止

    let close = data.close, open = data.open;

    //console.log(ORDER_OR_WATTING);     
    if (ORDER_OR_WATTING === 'order') { //watting
        /* RA BUY */

        if (DATA_GL.BTC.BUY) {
            if (close < open || close == open) {
                var tl = open - close;
                close = Number(close) + Number(tl) + (Math.random() * 3);
            }
            jsonData.close = parseFloat(close.toFixed(2));
        }

        if (DATA_GL.BTC.SELL) {
            if (close > open || close == open) {
                var tl = close - open;
                close = Number(open) - Number(tl) - (Math.random() * 3);
            }
            jsonData.close = parseFloat(close.toFixed(2));
        }



        // 结尾

        /**
         * 少吃
         *
         */
        //let totalBuy = void 0 === eval(PRICE_BUY_LIVE.join('+')) ? 0 : eval(PRICE_BUY_LIVE.join('+'));
        //let totalSell = void 0 === eval(PRICE_SELL_LIVE.join('+')) ? 0 : eval(PRICE_SELL_LIVE.join('+'));
        let totalBuy = PRICE_BUY_LIVE;
        let totalSell = PRICE_SELL_LIVE;

        totalBuy -= PRICE_MAKETING_BUY;
        totalSell -= PRICE_MAKETING_SELL;


        //检查差异是否很高然后丢失
        //let rd = Math.floor(Math.random() * 200) + 400;


        if (DATA_GL.LESS_WIN) { // 至少吃
            if (totalBuy < totalSell) { // 购买将获胜（关闭>打开）

                if (close < open || close == open) {
                    let tl = open - close;
                    close = Number(close) + Number(tl) + (Math.random() * 3);
                }
                jsonData.close = parseFloat(close.toFixed(2));
            } else if (totalBuy > totalSell) { // 卖出将获胜 ( CLOSE < OPEN ) // if(totalBuy > totalSell)

                if (close > open || close == open) {
                    var tl = close - open;
                    close = Number(open) - Number(tl) - (Math.random() * 3);
                }
                jsonData.close = parseFloat(close.toFixed(2));
            }
        } else {
            let totalBuyAv = 0;
            let totalSellAv = 0;
            if (totalBuy > totalSell) {
                totalBuyAv = totalBuy - totalSell;
            } else if (totalBuy < totalSell) {
                totalSellAv = totalSell - totalBuy
            }

            let rd = 400;
            if (totalBuyAv > rd) {

                // 卖出将获胜 ( CLOSE < OPEN )
                if (close > open || close == open) {
                    var tl = close - open;
                    close = Number(open) - Number(tl) - (Math.random() * 3);
                }
                jsonData.close = parseFloat(close.toFixed(2));

            } else if (totalSellAv > rd) {

                // 购买将获胜（关闭>打开）
                if (close < open || close == open) {
                    let tl = open - close;
                    close = Number(close) + Number(tl) + (Math.random() * 3);
                }
                jsonData.close = parseFloat(close.toFixed(2));
            }
        }


        PRICE_MAKETING_BUY = 0;
        PRICE_MAKETING_SELL = 0;

        /**
         * 少吃
         *
         */

        session++;
        writeSessionDB();

    }


    let title;

    if (jsonData.close > jsonData.open) { // BUY
        title = 'buy';
        BUY.push(title);
    } else { // SELL
        title = 'sell';
        SELL.push(title);
    }

    if (LIST_GET_DATA.length >= 120) {
        LIST_GET_DATA.shift();
    }
    LIST_GET_DATA.push(jsonData);


    STATIC.push(title);

    writeStaticDB();
    writeStatic();

    //timeGet = new Date().getTime();
    // 处理结果
    //HandlingBuySell(title);       
    HandlingBuySell2(title);
}

function XU_LY_QUY_BOT(PRICE_WIN, PRICE_LOSE) {

    //console.log(AMOUNT_MARKETING_WIN + ' -- ' + AMOUNT_MARKETING_LOSE);
    //console.log(PRICE_WIN + ' -- ' + PRICE_LOSE);

    // 不要打开功能
    if (!DATA_GL.PRICE_FUND_ON_OFF) return;
    //console.log('PRICE W: ' + PRICE_WIN);
    //console.log('PRICE L: ' + PRICE_LOSE);

    //console.log('MKT W: ' + AMOUNT_MARKETING_WIN);
    //console.log('MKT L: ' + AMOUNT_MARKETING_WIN);

    let price_win = PRICE_WIN - AMOUNT_MARKETING_WIN; // 这是系统支付给获胜者的金额
    let price_lose = PRICE_LOSE - AMOUNT_MARKETING_LOSE; // 这是系统从失败者那里收到的金额
    let total = price_lose - price_win; // số dư lời
    // 添加到内存中的利润/损失金额
    //console.log(total);

    let sss = session;
    DATA_GL.PRICE_FUND_PROFITS += total;
    //console.log(DATA_GL.PRICE_FUND_PROFITS);


    if (DATA_GL.PRICE_FUND_PROFITS < AMOUNT_NEGA_AMOUNT_BREAK_BRIDGE) { // 负钱系统漏洞
        // 开启无赢辅助功能
        //console.log(DATA_GL.PRICE_FUND_PROFITS);
        BTC_LESS_WIN();
        Tele.sendMessBet(`🔍Phiên hiện tại: <b>${sss--}</b> 💴: <i>${total}</i>\n🖲Hệ thống LỖ 💴: <i>${DATA_GL.PRICE_FUND_PROFITS}</i>\n🕹Gỡ tiền: <i>ON</i>`);
    } else if (DATA_GL.PRICE_FUND_PROFITS < 0) {
        Tele.sendMessBet(`🔍Phiên hiện tại: <b>${sss--}</b> 💴: <i>${total}</i>\n🖲Hệ thống đang LỖ 💴: <i>${DATA_GL.PRICE_FUND_PROFITS}</i>🗣Sắp bẻ cầu`);
    } else if (DATA_GL.PRICE_FUND_PROFITS > 0) {
        BTC_TOOL_OFF();
        Tele.sendMessBet(`🔍Phiên hiện tại: <b>${sss--}</b> 💴: <i>${total}</i>\n🖲Hệ thống LỜI 💴: <i>${DATA_GL.PRICE_FUND_PROFITS}</i>\n🕹Gỡ tiền: <i>OFF</i>`);
        DATA_GL.PRICE_FUND_PROFITS = 0;
    }
    // 如果是营销账户则退出 BOT
    if ((AMOUNT_MARKETING_WIN > 0 || AMOUNT_MARKETING_LOSE > 0) && DATA_GL.PRICE_FUND_PROFITS === 0) {
        BTC_TOOL_OFF();
    }

    //console.log(DATA_GL);

    AMOUNT_MARKETING_WIN = AMOUNT_MARKETING_LOSE = 0;
    // // 检查资金积累是否足够
    // // 下一个魔鬼小于默认投入资金
    // if(DATA_GL.PRICE_FUND_NEXT < DATA_GL.PRICE_FUND_DEFAULT){
    //     // 累计投入基金的总利润百分比（自然投注的默认值）
    //     let FUND = total / 100 * DATA_GL.PRICE_FUND_RATE;
    //     DATA_GL.PRICE_FUND_NEXT += FUND;
    // } else if(DATA_GL.PRICE_FUND_NEXT >= DATA_GL.PRICE_FUND_DEFAULT){

    // }

}

function BTC_TOOL_OFF() {
    DATA_GL.BTC.BUY = false;
    DATA_GL.BTC.SELL = false;
    DATA_GL.LESS_WIN = false;
}

function BTC_SET_BUY_WIN() {
    DATA_GL.BTC.BUY = true;
    DATA_GL.BTC.SELL = false;
    DATA_GL.LESS_WIN = false;
}

function BTC_SET_SELL_WIN() {
    DATA_GL.BTC.BUY = false;
    DATA_GL.BTC.SELL = true;
    DATA_GL.LESS_WIN = false;
}

function BTC_LESS_WIN() {
    DATA_GL.BTC.BUY = false;
    DATA_GL.BTC.SELL = false;
    DATA_GL.LESS_WIN = true;
}

//========================= 投注处理

function BetBUY(ws, data) {
    if (ANTI_BET) {
        let obj = { type: 'bet', mess: 'Vui lòng đợi phiên sau!', style: 'danger' }
        ws.send(JSON.stringify({ type: 'mess', data: obj }))
        return
    }

    //let idPlayer = data.idPlayer;

    let uid = data.uid
    let typeAccount = data.typeAccount
    let action = data.type
    let betAmount = Number(data.betAmount)
    let forceWin = data.forceWin;

    let accMarketing = data.mkt;

    for (let obj in users) {
        if (users[obj].ws == ws) {
            users[obj].uid = uid; // 如果更改帐户，则更改 ID
        }
    }


    const numberRegex = /^[]?\d+(\.\d+)?([eE][]?\d+)?$/;

    if (numberRegex.test(betAmount)) {

        // 允许下注的金额
        if (betAmount < BET_MAX) {
            let obj = { type: 'bet', mess: 'Số tiền không được nhở hơn ' + BET_MAX, style: 'danger' }
            ws.send(JSON.stringify({ type: 'mess', data: obj }))
            return
        }

        getMaretingAcc(data.email, (err, result) => {
            accMarketing = result.marketing;

            // 结尾
            getPriceUser(data, (err, result) => {
                if (err) {
                    console.log(err);
                    return;
                }
                if (!result) {
                    return
                }

                const oldBalance = result.balance
                if (result.balance >= betAmount) {
                    if (typeAccount == 1) {
                        PRICE_BUY_LIVE += betAmount
                        //PRICE_BUY_LIVE.push(betAmount);
                        updatePersonalTrading(data, (err, result) => { })
                    } else {
                        PRICE_BUY_DEMO += betAmount;
                        //PRICE_BUY_DEMO.push(betAmount);
                    }

                    if (void 0 === AMOUNT_USER_BUY[`${uid}`]) AMOUNT_USER_BUY[`${uid}`] = 0;

                    if (typeAccount == 1 && accMarketing == 1) {
                        PRICE_MAKETING_BUY += betAmount;
                    }

                    AMOUNT_USER_BUY[`${uid}`] += betAmount
                    BTC_USER_BUY[`${uid}`] = AMOUNT_USER_BUY[`${uid}`] + '||' + action + '||' + typeAccount + '||' + data.email + '||' + accMarketing + '||' + uid;

                    if (void 0 !== forceWin) {
                        BTC_USER_BUY[`${uid}`] += '||' + forceWin;
                    }

                    //console.log('MKT BET BUY: ' + accMarketing);
                    updateBalanceUser(data, (err, result) => {
                        const balance = Number(oldBalance - data['betAmount'])
                        ws.send(JSON.stringify({type: 'checkBet', data: 'ok', balance: balance}))
                    })

                    //SendNotifyTele(uid, typeAccount, 'BUY', betAmount)
                    // getPriceUser(data, (err, result) => {
                    //     if(err){
                    //         console.log(err);
                    //         return
                    //     }
                    //     let obj = {acc: typeAccount, balance: Number(result.balance), type: action}
                    //     ws.send(JSON.stringify({type: 'info', data: obj}))
                    // })
                } else if (result.balance < betAmount) {
                    let obj = { type: 'bet', mess: 'Số dư không đủ!', style: 'danger' }
                    ws.send(JSON.stringify({ type: 'mess', data: obj }))
                }
            });

        });


    }
}

function BetSELL(ws, data) {
    if (ANTI_BET) {
        let obj = { type: 'bet', mess: 'Vui lòng đợi phiên sau!', style: 'danger' }
        ws.send(JSON.stringify({ type: 'mess', data: obj }))
        return
    }

    let uid = data.uid
    let typeAccount = data.typeAccount
    let action = data.type
    let betAmount = Number(data.betAmount);
    const forceWin = data.forceWin;

    let accMarketing = data.mkt;

    for (let obj in users) {
        if (users[obj].ws == ws) {
            users[obj].uid = uid; // 如果更改帐户，则更改 ID
        }
    }


    const numberRegex = /^[]?\d+(\.\d+)?([eE][]?\d+)?$/;

    if (numberRegex.test(betAmount)) {
        // 允许下注的金额
        if (betAmount < BET_MAX) {
            let obj = { type: 'bet', mess: 'Số tiền không được nhở hơn ' + BET_MAX, style: 'danger' }
            ws.send(JSON.stringify({ type: 'mess', data: obj }))
            return
        }
        getMaretingAcc(data.email, (err, result) => {
            accMarketing = result.marketing;

            // 结尾
            getPriceUser(data, (err, result) => {
                if (err) {
                    console.log(err);
                    return;
                }
                if (!result) {
                    return
                }
                const oldBalance = result.balance
                if (result.balance >= betAmount) {
                    if (typeAccount == 1) {
                        //PRICE_SELL_LIVE.push(betAmount);
                        PRICE_SELL_LIVE += betAmount
                        updatePersonalTrading(data, (err, result) => { })
                    } else {
                        //PRICE_SELL_DEMO.push(betAmount);
                        PRICE_SELL_DEMO += betAmount;
                    }

                    if (void 0 === AMOUNT_USER_SELL[`${uid}`]) AMOUNT_USER_SELL[`${uid}`] = 0;

                    if (typeAccount == 1 && accMarketing == 1) {
                        PRICE_MAKETING_SELL += betAmount;
                    }

                    // 如果有营销账户

                    AMOUNT_USER_SELL[`${uid}`] += betAmount
                    BTC_USER_SELL[`${uid}`] = AMOUNT_USER_SELL[`${uid}`] + '||' + action + '||' + typeAccount + '||' + data.email + '||' + accMarketing + '||' + uid;

                    if (void 0 !== forceWin) {
                        BTC_USER_SELL[`${uid}`] += '||' + forceWin;
                    }

                    //console.log('MKT BET SELL: ' + accMarketing);
                    updateBalanceUser(data, (err, result) => {
                        const balance = Number(oldBalance - data['betAmount'])
                        ws.send(JSON.stringify({type: 'checkBet', data: 'ok', balance: balance}))
                    })


                } else if (result.balance < betAmount) {
                    let obj = { type: 'bet', mess: 'Số dư không đủ!', style: 'danger' }
                    ws.send(JSON.stringify({ type: 'mess', data: obj }))
                }
            })

        })

    }
}


//========================= 结束处理投注

function SendNotifyTele(accID, typeAcc, typeBet, amount) {
    let dataSys = Helper.getConfig(fileSys);
    if (dataSys.activeBetSendTelegram) {
        if (amount > 100) {
            Tele.sendMessBet(`Tài khoản: <b>${accID} (${typeAcc ? 'Live' : 'Demo'})</b>\nVừa cược: <b>${typeBet}</b> với <b>$${amount}</b>`)
        }
    }
}


function xulyInVaoHisBeCau() {


    const DATA_LIST_BE_CAU = [];

    for (let key in BTC_USER_BUY) {
        let uID = key;
        let moneyAndActionBuy = BTC_USER_BUY[uID];
        let moneyAndAction = moneyAndActionBuy.split("||");
        let money = moneyAndAction[0];
        let action = moneyAndAction[1];
        let typeAcc = moneyAndAction[2];
        let email = moneyAndAction[3];
        let mkt = moneyAndAction[4];
        if (typeAcc == 1) {
            let obj = { e: email, uid: uID, sv: SEVER_GET, bet: action, amount: money, mkt: mkt }
            DATA_LIST_BE_CAU.push(obj);
        }
    }

    for (let key in BTC_USER_SELL) {
        let uID = key;
        let moneyAndActionSell = BTC_USER_SELL[uID];
        let moneyAndAction = moneyAndActionSell.split("||");
        let money = moneyAndAction[0];
        let action = moneyAndAction[1];
        let typeAcc = moneyAndAction[2];
        let email = moneyAndAction[3];
        let mkt = moneyAndAction[4];
        if (typeAcc == 1) {
            let obj = { e: email, uid: uID, sv: SEVER_GET, bet: action, amount: money, mkt: mkt }
            DATA_LIST_BE_CAU.push(obj)
        }
    }


    if (DATA_LIST_BE_CAU.length !== 0) {
        for (let obj in users) {
            let uid = users[obj].uid;
            // 找到 ADMIN 的 UID 然后发送

            if (uid == 'ADMIN_BO') {
                //console.log(uid);
                let ws = users[obj].ws;
                //let totalPriceBUY = void 0 === eval(PRICE_BUY_LIVE.join('+')) ? 0 : eval(PRICE_BUY_LIVE.join('+'));
                //let totalPriceSELL = void 0 === eval(PRICE_SELL_LIVE.join('+')) ? 0 : eval(PRICE_SELL_LIVE.join('+'));
                let totalPriceBUY = PRICE_BUY_LIVE;
                let totalPriceSELL = PRICE_SELL_LIVE;

                ws.send(JSON.stringify({ type: 'truck', data: DATA_LIST_BE_CAU, price_buy: totalPriceBUY * 1, price_sell: totalPriceSELL * 1, mktBUY: PRICE_MAKETING_BUY * 1, mktSELL: PRICE_MAKETING_SELL * 1 }));
            }
        }
    }

}


function writeStatic() {

    let countBUY = BUY.length;
    let countSELL = SELL.length;

    //Moving
    let MovBUY = Math.floor(Math.random() * 16)
    let MovSELL = Math.floor(Math.random() * 16)
    let MovNeutral = Math.floor(Math.random() * 7)
    if (MovBUY === MovSELL) {
        MovSELL = Math.floor(Math.random() * 5)
    }

    //Oscillators
    let OscBUY = Math.floor(Math.random() * 16)
    let OscSELL = Math.floor(Math.random() * 16)
    let OscNeutral = Math.floor(Math.random() * 7)
    if (OscBUY === OscSELL) {
        OscSELL = Math.floor(Math.random() * 5)
    }

    //Summary
    let SumBUY = MovBUY + OscBUY
    let SumSELL = MovSELL + OscSELL
    let SumNeutral = MovNeutral + OscNeutral

    getLoadStaticGue = { Moving: { b: MovBUY, s: MovSELL, m: MovNeutral }, Oscillators: { b: OscBUY, s: OscSELL, m: OscNeutral }, Summary: { b: SumBUY, s: SumSELL, m: SumNeutral } }
    let obj = { ss: session, cbuy: countBUY, csell: countSELL, static: STATIC }

    wss.clients.forEach(client => {
        client.send(JSON.stringify({ type: 'static', data: obj, load: getLoadStaticGue }));
    });
}

async function HandlingBuySell2(title) {

    var TOTAL_WIN_PRICE = 0, TOTAL_LOSE_PRICE = 0;

    let countUser = Object.keys(users).length;

    for (let obj in BTC_USER_BUY) {
        let moneyAndActionBuy = BTC_USER_BUY[obj];
        let moneyAndAction = moneyAndActionBuy.split("||");
        let money = moneyAndAction[0];
        let action = moneyAndAction[1];
        let type = moneyAndAction[2];
        let email = moneyAndAction[3];
        let accMarketingBuy = moneyAndAction[4];
        let uid = moneyAndAction[5];
        let forceWin = moneyAndAction[6];
        let ws = '';

        await new Promise((res, rej) => {
            let o = 0;
            for (let av in users) {
                o++;
                if (users[av].email == email) {
                    ws = users[av].ws;
                    res();
                }
                if (o === countUser) res();
            }
        })

        if ((typeof forceWin === 'boolean' && forceWin) || action === title) { // 这是买入的胜利
            let amount = money / 100 * rateNhaThuong; // 买钱

            let amountShow = Number(amount); // 是收到的金额
            let addMo = amountShow + Number(money);

            let obj = {
                balance: addMo,
                win: amountShow,
                upID: uid,
                email: email
            }

            if (type == 1) {
                updatePriceWinLose(obj, 'w');
                TOTAL_WIN_PRICE += amountShow;
            }

            if (type == 1 && accMarketingBuy == 1) {
                AMOUNT_MARKETING_WIN += amountShow;
            }

            updateAmountWin(obj, (err, result) => { })

            let obj2 = {
                type: 'kq',
                data: { kq: 'win', money: addMo }
            }

            //console.log('XU LY BUY WIN: ' + accMarketingBuy);
            if (ws !== '') {
                ws.send(JSON.stringify(obj2));
            }

            // 保存到历史
            await SaveHistory('win', uid, type, action, SEVER_GET, amountShow, money, email, accMarketingBuy);

            await handleStreakChallenge(email);



        } else if (action !== title) {

            let obj = {
                lose: Number(money),
                upID: uid,
                email: email
            }
            updateAmountLose(obj, (err, result) => { })

            if (type == 1) {
                updatePriceWinLose(obj, 'l');
                TOTAL_LOSE_PRICE += obj.lose;
            }
            if (type == 1 && accMarketingBuy == 1) {
                AMOUNT_MARKETING_LOSE += obj.lose;
            }

            let obj2 = {
                type: 'kq',
                data: { kq: 'lose', money: Number(money) }
            }


            if (ws !== '') {
                ws.send(JSON.stringify(obj2));
            }

            // 保存到历史
            await SaveHistory('lose', uid, type, action, SEVER_GET, money, money, email, accMarketingBuy);
            await handleStreakChallenge(email);

        }

    }

    for (let obj in BTC_USER_SELL) {
        let moneyAndActionSell = BTC_USER_SELL[obj];
        let moneyAndAction = moneyAndActionSell.split("||");
        let money2 = moneyAndAction[0];
        let action2 = moneyAndAction[1];
        let type2 = moneyAndAction[2];
        let email2 = moneyAndAction[3];
        let accMarketingSell = moneyAndAction[4];
        let uid = moneyAndAction[5];
        let forceWin = moneyAndAction[6];
        let ws = '';

        await new Promise((res, rej) => {
            let o = 0;

            for (let av in users) {
                o++;
                if (users[av].email === email2) {
                    ws = users[av].ws;
                    res();
                }
                if (o === countUser) res();
            }
        })




        if ((typeof forceWin === 'boolean' && forceWin) || action2 === title) { // 这是卖出的胜利
            let amount = money2 / 100 * rateNhaThuong; // 买钱

            let amountShow = Number(amount); // 是收到的总金额
            let addMo = amountShow + Number(money2);

            let obj = {
                balance: addMo,
                win: amountShow,
                upID: uid,
                email: email2
            }

            if (type2 == 1) {
                TOTAL_WIN_PRICE += amountShow;
                updatePriceWinLose(obj, 'w');
            }
            if (type2 == 1 && accMarketingSell == 1) {
                AMOUNT_MARKETING_WIN += amountShow;
            }

            updateAmountWin(obj, (err, result) => { });

            let obj2 = {
                type: 'kq',
                data: { kq: 'win', money: addMo }
            }

            if (ws !== '')
                ws.send(JSON.stringify(obj2));

            //console.log('XU LY SELL WIN: ' + accMarketingSell);

            // 保存到历史
            await SaveHistory('win', uid, type2, action2, SEVER_GET, amountShow, money2, email2, accMarketingSell);
            await handleStreakChallenge(email2);


        } else if (action2 !== title) {

            let obj = {
                lose: Number(money2),
                upID: uid,
                email: email2
            }
            updateAmountLose(obj, (err, result) => { })

            if (type2 == 1) {
                TOTAL_LOSE_PRICE += obj.lose;
                updatePriceWinLose(obj, 'l');
            }

            if (type2 == 1 && accMarketingSell == 1) {
                AMOUNT_MARKETING_LOSE += obj.lose;
            }

            let obj2 = {
                type: 'kq',
                data: { kq: 'lose', money: Number(money2) }
            }

            //console.log('XU LY SELL LOSE: ' + accMarketingSell);

            if (ws !== '')
                ws.send(JSON.stringify(obj2));

            // 保存到历史
            await SaveHistory('lose', uid, type2, action2, SEVER_GET, money2, money2, email2, accMarketingSell);
            await handleStreakChallenge(email2);

        }

    }


    BTC_USER_BUY_BACK = BTC_USER_BUY;
    BTC_USER_SELL_BACK = BTC_USER_SELL;

    BTC_USER_BUY = [];
    BTC_USER_SELL = [];

    AMOUNT_USER_BUY = [];
    AMOUNT_USER_SELL = [];



    PRICE_BUY_LIVE = 0;
    PRICE_SELL_LIVE = 0;

    PRICE_BUY_DEMO = 0;
    PRICE_SELL_DEMO = 0;


    XU_LY_QUY_BOT(TOTAL_WIN_PRICE, TOTAL_LOSE_PRICE);
    //money, uid, type, email, marketing
    await HandlingCommissionBUY();
    await HandlingCommissionSELL();
}




// 投注时处理佣金奖金

async function HandlingCommissionBUY() {
    // 获取信息系统佣金
    let lsComm = Helper.getConfig(fileCommission);

    let UpId = ''; // 获取参考代码（如果有）
    let RefFN = ''; // 自己的参考
    //let email = ''; // 自己的邮箱
    var levelVip = 1;

    let obj = {
        penCom: 0, // 佣金率
        upID: 0,
        refID: 0, // 我的参考编号
        email: '', // 给自己发电子邮件
        fromID: 0, // 是真实账户 ID 代码
        volum: 0 // 投注金额
    }

    for (let xl in BTC_USER_BUY_BACK) {
        let moneyAndActionBuy = BTC_USER_BUY_BACK[xl];
        let moneyAndAction = moneyAndActionBuy.split("||");
        let money = moneyAndAction[0];
        //let action = moneyAndAction[1];
        let type = moneyAndAction[2];
        let email = moneyAndAction[3];
        let accMarketingBuy = moneyAndAction[4];
        let uid = moneyAndAction[5];

        if (type == 1) {
            await new Promise((res, rej) => {
                checkF0Commission(email, (err, results) => { // 获取您的信息

                    if (results.length) { // 如果存在
                        UpId = results[0].upline_id; // 获取参考代码（如果有）
                        RefFN = results[0].ref_code; // 自己的参考
                    }
                    res();
                });
            })


            if (void 0 !== UpId || UpId !== null || UpId !== '') { // 如果存在我的 F0

                await new Promise((res, rej) => {
                    listF0With7Level(UpId, (err, results) => { // 获取我的信息，包括我的 F0
                        let i = 0;
                        let tt = Object.keys(results).length;
                        for (let nb in results) {
                            let d = results[nb];

                            if (d.length > 0) {
                                levelVip = d[0].level_vip;

                                let rateVal = lsComm[i].value * 1;
                                let rateCommission = money / 100 * rateVal;

                                obj.penCom = rateCommission;
                                obj.upID = RefFN;
                                obj.refID = d[0].ref_code;
                                obj.email = d[0].email;
                                obj.fromID = uid;
                                obj.volum = money;
                                obj.mkt = accMarketingBuy;
                                obj.session = session;

                                if (i === 0) { // 我的F0一定会收到
                                    // 更新账户的佣金金额
                                    updateAmountRateCommission(obj);

                                } else {
                                    if (levelVip >= i) {
                                        obj.volum = 0;
                                        // 更新账户的佣金金额
                                        updateAmountRateCommission(obj);
                                    }
                                }
                            } else {
                                res();
                                break;
                            }
                            i++;
                        }

                    });
                })
            }
        }

    }

    //BTC_USER_BUY_BACK = [];
}

async function HandlingCommissionSELL() {
    // 获取信息系统佣金
    let lsComm = Helper.getConfig(fileCommission);

    let UpId = ''; // 获取参考代码（如果有）
    let RefFN = ''; // 自己的参考
    //let email = ''; // 自己的邮箱
    var levelVip = 1;

    let obj = {
        penCom: 0, // 佣金率
        upID: 0,
        refID: 0, // 我的参考编号
        email: '', // 给自己发电子邮件
        fromID: 0, // 是真实账户 ID 代码
        volum: 0 // 投注金额
    }


    for (let xl in BTC_USER_SELL_BACK) {
        let moneyAndActionSell = BTC_USER_SELL_BACK[xl];
        let moneyAndAction = moneyAndActionSell.split("||");
        let money2 = moneyAndAction[0];
        //let action2 = moneyAndAction[1];
        let type2 = moneyAndAction[2];
        let email2 = moneyAndAction[3];
        let accMarketingSell = moneyAndAction[4];
        let uid = moneyAndAction[5];

        if (type2 == 1) {
            await new Promise((res, rej) => {
                checkF0Commission(email2, (err, results) => { // 获取您的信息

                    if (results.length) { // 如果存在
                        UpId = results[0].upline_id; // 获取参考代码（如果有）
                        RefFN = results[0].ref_code; // 自己的参考
                    }
                    res();
                });
            })

            if (void 0 !== UpId || UpId !== null || UpId !== '') { // 如果存在我的 F0
                await new Promise((res, rej) => {
                    listF0With7Level(UpId, (err, results) => { // 获取我的信息，包括我的 F0
                        let i = 0;
                        //let tt = Object.keys(results).length;
                        //console.log(tt);
                        for (let nb in results) {
                            let d = results[nb];

                            if (d.length > 0) {

                                levelVip = d[0].level_vip;

                                let rateVal = lsComm[i].value * 1;
                                let rateCommission = money2 / 100 * rateVal;

                                obj.penCom = rateCommission;
                                obj.upID = RefFN;
                                obj.refID = d[0].ref_code;
                                obj.email = d[0].email;
                                obj.fromID = uid;
                                obj.volum = money2;
                                obj.mkt = accMarketingSell;
                                obj.session = session;

                                if (i === 0) { // 我的F0一定会收到
                                    // 更新账户的佣金金额
                                    updateAmountRateCommission(obj, (err) => { });

                                } else {
                                    if (levelVip >= i) {
                                        obj.volum = 0;
                                        // 更新账户的佣金金额
                                        updateAmountRateCommission(obj, (err) => { });
                                    }
                                }
                            } else {
                                res();
                                break;
                            }
                            i++;

                        }

                    });
                })
            }
        }

    }

    //BTC_USER_SELL_BACK = [];
}



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// 下注时结束处理佣金奖金




// 过程保存到历史


async function SaveHistory(wl, uid, typeAccount, buy_sell, currency, amountWL, amountBet, email, marketing) {

    const count = LIST_GET_DATA.length - 1;
    const op = parseFloat(LIST_GET_DATA[count].open).toFixed(2);
    const cl = parseFloat(LIST_GET_DATA[count].close).toFixed(2);

    let obj = {
        uid: uid,
        typeAccount: Number(typeAccount),
        currency: currency,
        buy_sell: buy_sell,
        amount_win: wl === 'win' ? Number(amountWL) : 0,
        amount_lose: wl === 'win' ? 0 : Number(amountWL),
        amount_bet: amountBet,
        open: op,
        close: cl,
        session: session,
        email: email,
        mkt: marketing
    }

    await insertBetOrder(obj, (err, result) => {
        if (err) {
            console.log(err);
            return;
        }
    })

}


// 完成处理保存到历史记录




//=========================

var startBotAo, numberBuy = 0, numberSell = 0;

function BOTAOStart() {

    //var PRICE_BUY_BOT = 0, PRICE_SELL_BOT = 0;

    startBotAo = setInterval(() => {
        const rd = Math.floor((Math.random() * 2) + 1);
        let rdNumBuy = 0;
        let rdNumSell = 0;
        if (rd == 1) {
            rdNumBuy = Math.floor((Math.random() * BET_MAX) + (BET_MAX * 1.5));
            rdNumSell = Math.floor((Math.random() * 10000) + 1);
        } else {
            rdNumBuy = Math.floor((Math.random() * 10000) + 1);
            rdNumSell = Math.floor((Math.random() * BET_MAX) + (BET_MAX * 1.5));
        }
        numberBuy += rdNumBuy;
        numberSell += rdNumSell;


        let getPRICE_BUY = PRICE_BUY_LIVE + numberBuy;
        let getPRICE_SELL = PRICE_SELL_LIVE + numberSell;

        numberBuy = getPRICE_BUY;
        numberSell = getPRICE_SELL;


        let total = numberBuy + numberSell;

        /**
         * 改变逻辑 -> 随机在 40 - 60% 之间
         */
        // totalPTBuy = toFixed((numberBuy/total)*100, 0);
        // totalPTSell = toFixed((numberSell/total)*100, 0);


        totalPTBuy = toFixed(getRandomArbitrary(40, 60), 0);
        totalPTSell = 100 - Number(totalPTBuy);


        wss.clients.forEach(client => {
            let json = { nbuy: numberBuy, nsell: numberSell, ptbuy: Number(totalPTBuy), ptsell: Number(totalPTSell) }

            client.send(JSON.stringify({ type: 'transVolum', data: json }));
        })

    }, 2000);
}

function BOTAOClear() {
    numberBuy = 0;
    numberSell = 0;
    clearInterval(startBotAo);
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

async function handleStreakChallenge(email) {
    return;
    try {
        const userByEmail = await new Promise((resolve, reject) => {
            db.query(`SELECT verified, nick_name FROM users WHERE email = ? AND marketing = 0`, [email], (err, results) => {
                if (err) {
                    return reject(err);
                }
                if (!results.length) {
                    return reject("Not found");
                }
                resolve(results[0]);
            })
        });

        if (userByEmail) {
            // 还没有注册KYC
            if (Number(userByEmail.verified)) {
                const configStreakChallenge = Helper.getConfig('streak-challenge');
                // 尚未配置
                if (configStreakChallenge) {
                    let listBetByUser = await new Promise((resolve, reject) => {
                        db.query(`SELECT email, amount_bet, amount_win, amount_lose, created_at FROM bet_history WHERE type_account = 1 AND DAY(created_at) = DAY(NOW()) AND email = ? ORDER BY created_at DESC`, [email], (err, results) => {
                            if (err) {
                                return reject(err);
                            }
                            resolve(results);
                        })
                    });

                    listBetByUser = Array.from(listBetByUser);

                    const currentPrize = getPrize();
                    const prize = currentPrize.sum * currentPrize.precent;

                    if (listBetByUser.length >= Number(configStreakChallenge.consecutive)) {
                        let countBetLoseOK = 0;
                        let isContinueLose = true;
                        listBetByUser.forEach((e) => {
                            if (Number(e.amount_lose) > 0 && Number(e.amount_bet) >= Number(configStreakChallenge.moneyConditional) && isContinueLose) {
                                countBetLoseOK += 1;
                            } else {
                                isContinueLose = false;
                            }
                        });

                        let countBetWinOK = 0;
                        let isContinueWin = true;
                        listBetByUser.forEach((e) => {
                            if (Number(e.amount_win) > 0 && Number(e.amount_bet) >= Number(configStreakChallenge.moneyConditional) && isContinueWin) {
                                countBetWinOK += 1;
                            } else {
                                isContinueWin = false;
                            }
                        });

                        if (countBetLoseOK >= Number(configStreakChallenge.consecutive)) {
                            db.query(`INSERT INTO streak_challenge(email, nick_name, count, prize, session, isAddByAdmin, isWin, created_at) VALUES(?,?,?,?,?,?,?,now())`, [
                                email,
                                userByEmail.nick_name,
                                countBetLoseOK,
                                prize,
                                session,
                                0,
                                0
                            ], (err, results) => {
                                if (err) {
                                    return callback(err);
                                }
                                sendNotiStreakChallenge(email, prize);
                            });
                        }

                        if (countBetWinOK >= Number(configStreakChallenge.consecutive)) {
                            db.query(`INSERT INTO streak_challenge(email, nick_name, count, prize, session, isAddByAdmin, isWin, created_at) VALUES(?,?,?,?,?,?,?,now())`, [
                                email,
                                userByEmail.nick_name,
                                countBetWinOK,
                                prize,
                                session,
                                0,
                                1
                            ], (err, results) => {
                                if (err) {
                                    return callback(err);
                                }
                                sendNotiStreakChallenge(email, prize);
                            });
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
}

async function sendNotiStreakChallenge(email, prize) {
    await new Promise((resolve, reject) => {
        db.query(`UPDATE users SET money_usdt = money_usdt + ? WHERE email = ?`, [prize, email], (err, res) => {
            if (err) {
                return reject(err);
            }

            resolve(res);
        })
    })

    const currentUser = new Promise((resolve, reject) => {
        db.query(`select nick_name from users WHERE email = ?`, [email], (err, res) => {
            if (err) {
                return reject(err);
            }

            resolve(res[0].nick_name);
        })
    })

    await new Promise((resolve, reject) => {
        db.query(`insert into trade_history (email, from_u, to_u, type_key, type, currency, amount, status, created_at)
        values(?,?,?,?,?,?,?,?,now())`,
            [
                email,
                currentUser.nick_name,
                currentUser.nick_name,
                'streak-challenge', // 快速加载
                `Giải thưởng Streak Challenge`,
                'usdt',
                prize,
                1
            ], (err, res) => {
                if (err) {
                    return reject(err);
                }

                resolve(res);
            })
    })

    SEND_THONG_BAO('streak-challenge', email, email, `Chúc mừng bạn đã nhận được giải thưởng Streak Challenge`, `Giá trị phần thưởng là $${prize}. Hãy mạnh mẽ và chiến đấu!`);
}

module.exports = { USER_ONLINE: users }