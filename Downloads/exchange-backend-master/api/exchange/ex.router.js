const {
    getAllExHis,
    getAllExHisTrash,
    deleteExHisById,
    walletTrans,
    getExChangeUser
} = require("./ex.controller");
const router = require("express");
const app = router();
const {checkToken, checkAdminToken} = require("../../auth/token_validation");

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});


app.get("/historyEx", checkAdminToken, getAllExHis);

app.get("/historyExTrash", checkAdminToken, getAllExHisTrash);

app.patch("/deleteEx", checkAdminToken, deleteExHisById);

app.post("/trans", checkToken, walletTrans)

app.get("/hisUser", checkToken, getExChangeUser)


module.exports = app;