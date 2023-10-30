const router = require("express");
const app = router();
const {checkToken, checkAdminToken} = require("../../../auth/token_validation");
const {
    createStreakChallenge,
    addUserByAdmin,
    getUserStreakChallenge,
    getStreakChallenge,
    getPrizeClient
} = require('./streak-challenge.controller');

app.get("/streak-challenge", checkToken, getStreakChallenge);
app.post("/streak-challenge", checkAdminToken, createStreakChallenge);
app.post("/streak-challenge-user", checkAdminToken, addUserByAdmin);
app.get("/streak-challenge-user", checkToken, getUserStreakChallenge);
app.get("/prize", checkToken, getPrizeClient);

module.exports = app;