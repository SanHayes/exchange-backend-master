const {
    getAllTradeHis,
    getAllTradeHisTrash,
    deleteTradeHisById,
    getAllDepositHis,
    getAllDepositHisTrash,
    getAllWithDrawalHis,
    doneWithdrawal,
    getRevenueNap,
    getRevenueRut,
    getRevenueTrans,
    getShowDT,
    historyAllAddMoney,
    totalAddMoney,
    doneRefuseWithdrawal
} = require("./trade.controller");
const router = require("express");
const app = router();
const {checkToken, checkAdminToken} = require("../../auth/token_validation");

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});


app.get("/historyAll", checkAdminToken, getAllTradeHis);

app.get("/historyAllTrash", checkAdminToken, getAllTradeHisTrash);

app.patch("/deleteTradeHisById", checkAdminToken, deleteTradeHisById);

app.get("/hisDepositAll", checkToken, getAllDepositHis);

app.get("/hisDepositAllTrash", checkAdminToken, getAllDepositHisTrash);

app.get("/hisWithDrawalAll", checkToken, getAllWithDrawalHis);

app.post("/doneWithdrawal", checkAdminToken, doneWithdrawal);

app.post("/doneRefuseWithdrawal", checkAdminToken, doneRefuseWithdrawal);

app.post("/doneWithdrawalTele", doneWithdrawal);

app.get("/getRevenueNap", checkAdminToken, getRevenueNap);

app.get("/getRevenueRut", checkAdminToken, getRevenueRut);

app.get("/getRevenueTrans", checkAdminToken, getRevenueTrans);

app.get("/getRevenueTrans", checkAdminToken, getRevenueTrans);

app.post("/getShowDT", checkAdminToken, getShowDT);

app.get("/historyAllAddMoney", checkAdminToken, historyAllAddMoney);

app.get("/totalAddMoney", checkAdminToken, totalAddMoney);

module.exports = app;