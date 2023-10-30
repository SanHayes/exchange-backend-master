const Helper = require("../../../helpers");
const db = require('../../../database');
const {getPrize} = require('../../../helper/getPrize');

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    getPrizeClient: (callback) => {
        return callback(null, getPrize());
    },
    createStreakChallenge: (config, callback) => {
        if (!config.user) {
            callback("User trúng giải không được để trống!");
        }

        Helper.setConfig('streak-challenge', config);

        return callback(null, 'success')
    },

    getStreakChallenge: (callback) => {
        const config = Helper.getConfig('streak-challenge');
        if (!config) {
            return callback("Không có streak challenge nào được tạo!");
        } else {
            return callback(null, config);
        }
    },

    getUserStreakChallenge: (email, callback) => {
        if (void 0 !== email) {
            db.query(`SELECT * FROM streak_challenge where email = ?`, [email], (err, results) => {
                if (err) {
                    return callback(err);
                }
                return callback(null, results);
            });
        } else {
            db.query(`SELECT * FROM streak_challenge`, [], (err, results) => {
                if (err) {
                    return callback(err);
                }
                return callback(null, results);
            });
        }
    },

    addUserByAdmin: (user, callback) => {
        if (!user.email || !user.nick_name) {
            return callback("Email, Nick name không được để trống!");
        }

        const configStreakChallenge = Helper.getConfig('streak-challenge');
        const tradeConfig = Helper.getConfig('trade');

        if (!configStreakChallenge) {
            return callback('Chưa cấu hình streak-challenge');
        }

        const prize = getRandomInt(Number(configStreakChallenge.range[0]), Number(configStreakChallenge.range[1])) * Number(configStreakChallenge.precentPrize);

        db.query(`INSERT INTO streak_challenge(email, nick_name, count, isWin, prize, session, isAddByAdmin, created_at) VALUES(?,?,?,?,?,?,?,now())`, [
            user.email,
            user.nick_name,
            user.count,
            user.isWin,
            prize,
            tradeConfig.session,
            1,
        ], (err, results) => {
            if (err) {
                return callback(err);
            }
            db.query(`SELECT * FROM streak_challenge ORDER BY id DESC LIMIT 1`, (err1, results1) => {
                if (err1) {
                    return callback(err1);
                }
                return callback(null, results1);
            });
        });
    }
}