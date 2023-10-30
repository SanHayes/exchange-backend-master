const {
    createStreakChallenge,
    addUserByAdmin,
    getUserStreakChallenge,
    getStreakChallenge,
    getPrizeClient
} = require('./streak-challenge.service');

module.exports = {
    createStreakChallenge: (req, res) => {
        const config = req.body;
        createStreakChallenge(config, (err, results) => {
            if (err) {
                console.log(err);
                return res.json({
                    success: 0,
                    message: err
                })
            }
            if (!results) {
                return res.json({
                    success: 0,
                    message: "Record not Found"
                })
            }
            return res.json({
                success: 1,
                data: results
            })
        })
    },
    addUserByAdmin: (req, res) => {
        const user = req.body;
        addUserByAdmin(user, (err, results) => {
            if (err) {
                console.log(err);
                return res.json({
                    success: 0,
                    message: err
                })
            }
            if (!results) {
                return res.json({
                    success: 0,
                    message: "Record not Found"
                })
            }
            return res.json({
                success: 1,
                data: results
            })
        })
    },
    getUserStreakChallenge: (req, res) => {
        const email = req.query.email;
        getUserStreakChallenge(email, (err, results) => {
            if (err) {
                console.log(err);
                return res.json({
                    success: 0,
                    message: err
                })
            }
            if (!results) {
                return res.json({
                    success: 0,
                    message: "Record not Found"
                })
            }
            return res.json({
                success: 1,
                data: results
            })
        })
    },
    getStreakChallenge: (req, res) => {
        getStreakChallenge((err, results) => {
            if (err) {
                console.log(err);
                return res.json({
                    success: 0,
                    message: err
                })
            }
            if (!results) {
                return res.json({
                    success: 0,
                    message: "Record not Found"
                })
            }
            return res.json({
                success: 1,
                data: results
            })
        })
    },
    getPrizeClient: (req, res) => {
        getPrizeClient((err, results) => {
            if (err) {
                console.log(err);
                return res.json({
                    success: 0,
                    message: err
                })
            }
            if (!results) {
                return res.json({
                    success: 0,
                    message: "Record not Found"
                })
            }
            return res.json({
                success: 1,
                data: results
            })
        })
    },
}