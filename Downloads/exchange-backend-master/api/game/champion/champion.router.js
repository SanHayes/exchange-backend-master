const router = require("express");
const app = router();
const {checkToken, checkAdminToken} = require("../../../auth/token_validation");
const {
    getAllChampions,
    createChampion,
    deleteChampion,
    modifyChampion,
    getActiveGames
} = require("./champion.controller");

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    next();
});

app.get("/champions", checkToken, getAllChampions);

app.post("/champion", checkAdminToken, createChampion);

app.delete("/champion/:id", checkAdminToken, deleteChampion);

app.put("/champion/:id", checkAdminToken, modifyChampion);

app.get("/active-games", checkToken, getActiveGames);

module.exports = app;
