const router = require("express")
const Helper = require("../helpers");
const app = router();

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});

app.get("/set-rate", (req, res) => {
    const dataSys = Helper.getConfig('stakingRate');
    res.json({success: 1, data: {stakingRate: dataSys.stakingRate}})
});

app.post("/set-rate", (req, res) => {
    const stakingRate = Number(req.body.stakingRate);

    if (stakingRate > 100) {
        res.json({success: 0, error: "% qua đêm không được vượt quá 100"})
    } else {
        Helper.setConfig("stakingRate", {stakingRate});
        res.json({success: 1, data: {stakingRate}})
    }
});

module.exports = app;