const router = require("express")
const app = router();
const config = require('../config')
const Helper = require("../helpers");
const fileSys = config.PATH_SYS_CONFIG
const fileSysCommission = config.PATH_SYS_COMMISSION


app.use((req, res, next) => {
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});


app.get("/getRateCommission", (req, res) => {
    //let Sys = fs.readFileSync(fileSysCommission)
    const dataSys = Helper.getConfig(fileSysCommission);
    res.json({success: 1, data: dataSys})
});

app.post("/saveRateCommission", (req, res) => {

    //@todo 先注释，不保存，待改良
    // const dataSys = req.body;
    // Helper.setConfig(fileSysCommission, dataSys);
    res.json({success: 1})
});

app.get("/wallet", (req, res) => {

    const dataSys = Helper.getConfig(fileSys);

    let obj = {
        qUSDT: dataSys.quotePriceUSDT, // 价格接近美元
        qETH: dataSys.quotePriceETH, // 价格接近美元
        qBTC: dataSys.quotePriceBTC, // 价格接近美元
        qBNB: dataSys.quotePriceBNB, //  价格接近美元
        qPaypal: dataSys.quotePricePAYPAL, //  USD报价BNB
        qVND: dataSys.quotePriceVND,

        tCUseSys: dataSys.typeCurrUseSys, // 系统使用的货币

        mDBTC: dataSys.minDepositBTC, // 最低存款
        mDETH: dataSys.minDepositETH, // 最低存款
        mDUSDT: dataSys.minDepositUSDT, // 最低存款
        mDPaypal: dataSys.minDepositPaypal, // 最低存款

        mWBTC: dataSys.minWithdrawalBTC, // 最低提款
        mWETH: dataSys.minWithdrawalETH, // 最低提款
        mWUSDT: dataSys.minWithdrawalUSDT, // 最低提款
        mWPaypal: dataSys.minWithdrawalPaypal, // 最低提款

        iAWPaypal: dataSys.isActiveWalletPaypal, // 在系统中开启/关闭用于充值和充值的COIN
        iAWVND: dataSys.isActiveWalletVND, // 在系统中开启/关闭用于充值和充值的COIN
        bankInfo: dataSys.bankInfo,
        iAWETH: dataSys.isActiveWalletETH, // 在系统中开启/关闭用于充值和充值的COIN
        iAWUSDT: dataSys.isActiveWalletUSDT, // 在系统中开启/关闭用于充值和充值的COIN
        iAWBTC: dataSys.isActiveWalletBTC, // 在系统中开启/关闭用于充值和充值的COIN

        fDPaypalNB: dataSys.feeRutPaypalNoiBo,
        fDPaypalAcc: dataSys.feeRutPaypalAcc,
        fDBTCNB: dataSys.feeRutBTCNoiBo,
        fDBTCAcc: dataSys.feeRutBTCAcc,
        fDETHNB: dataSys.feeRutETHNoiBo,
        fDETHERC20: dataSys.feeRutETHERC20,
        fDUSDTNB: dataSys.feeRutUSDTNoiBo,
        fDUSDTBEP20: dataSys.feeRutUSDTBEP20,
        fDUSDTERC20: dataSys.feeRutUSDTERC20
    }
    res.json({success: 1, data: obj})
});

app.get("/supports", (req, res) => {
    const dataSys = Helper.getConfig(fileSys);
    res.json({success: 1, data: dataSys.support})
});


module.exports = app;