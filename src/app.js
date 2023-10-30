const passport = require('passport');
const FacebookStrategy = require('passport-facebook');
const GoogleStrategy = require('passport-google-oidc');
const session = require('express-session');

const config = require('../config')
const Helper = require("../helpers");
const fileSys = config.PATH_SYS_CONFIG;
const serveStatic = require('serve-static');
const path = require('path');
const userRouter = require("./../api/users/user.router")
const tradeRouter = require("./../api/trade/trade.router")
const gameRouter = require("./../api/game/champion/champion.router");
const gameLuckyDrawRouter = require("./../api/game/luckyDraw/luckyDraw.router");
const betRouter = require("./../api/bet/bet.router")
const exChangeRouter = require("./../api/exchange/ex.router")
const StakingRouter = require("./../api/staking.router")
const Wallet = require("./../api/wallet/wallet.router")
const StreakChallenge = require("./../api/game/streakChallenge/streak-challenge.router")

const uploadAvatar = require("./../auth/upload/router")

const payPal = require("./../auth/pay/paypal")
const payVND = require('./../auth/pay/vnd')
const walletSys = require("./../api/sys.router")

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const {sign} = require('jsonwebtoken');
const {checkUserEmail, getUserByUserEmail} = require('../api/users/user.service');

const app = express();

app.use(bodyParser.json())
app.use(cors());
app.use(session({secret: 'session secret', resave: true, saveUninitialized: true}));

app.use("/api/setup", walletSys)
app.use("/api/users", userRouter)
app.use("/api/trades", tradeRouter)
app.use("/api/game", gameRouter)
app.use("/api/game1", gameLuckyDrawRouter)
app.use("/api/game2", StreakChallenge)
app.use("/api/bets", betRouter)
app.use("/api/exs", exChangeRouter)
app.use("/api/wallet", Wallet)
app.use("/api/staking", StakingRouter)

app.use("/api/auth", uploadAvatar)


app.use("/api/paypal", payPal)
app.use("/api/pay", payVND)


app.get('/status', (req, res) => {
    let dataSys = Helper.getConfig(fileSys);
    res.json({
        ok: dataSys.maintenance,
        msg: dataSys.maintenanceContent
    })
})

// Auth FB
passport.use(new FacebookStrategy({
        clientID: '528863072076583',
        clientSecret: '1e75787e3075716b816a2ec5e7d81d3b',
        callbackURL: `https://gatediamon.one/fb/callback`,
        profileFields: ['id', 'emails', 'name'],
    },
    (accessToken, refreshToken, profile, cb) => {
        cb(null, profile._json);
    }
));

app.get('/login/facebook', passport.authenticate('facebook', {
    scope: ['email', 'public_profile'],
}));

app.get('/fb/callback', (req, res, next) => {
    passport.authenticate('facebook', {
        failureRedirect: '/login',
        failureMessage: true,
    }, async (err, data) => {
        let dataSign = {};
        if (void 0 === data || void 0 === data.email) {
            dataSign = {
                success: 0,
                error: "Không tìm thấy email trên tài khoản FB này"
            };
        } else {
            dataSign = {
                success: 1,
                data,
            };

            const user = await new Promise((resolve, reject) => {
                checkUserEmail(dataSign.data.email, (err, user) => {
                    if (err) {
                        reject(err);
                    }

                    return resolve(user);
                });
            });

            if (Array.isArray(user) && user.length) {
                // 通过电子邮件注册的用户
                const userByEmail = await new Promise((resolve, reject) => {
                    getUserByUserEmail(dataSign.data.email, (err1, user1) => {
                        if (err1) {
                            reject(err1);
                        }

                        return resolve(user1);
                    });
                });

                const tokenLogin = sign({result: userByEmail}, config.TOKEN_KEY, {
                    expiresIn: "8h"
                });

                const jsontoken = sign({
                    result: {
                        success: 2,
                        tokenLogin,
                    }
                }, config.TOKEN_KEY, {
                    expiresIn: "8h"
                });
                return res.redirect(`https://gatediamon.one/login?type=success&token=${jsontoken}`);
            }
        }

        const jsontoken = sign({result: dataSign}, config.TOKEN_KEY, {
            expiresIn: "8h"
        });
        res.redirect(`https://gatediamon.one/login?type=fb&token=${jsontoken}`);
    })(req, res, next);
});

// Auth google
passport.use(new GoogleStrategy({
    clientID: '987216099971-h5lumb544v94r160anpmprbm6hbohejt.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: 'https://gatediamon.one/google/callback'
}, (issuer, profile, cb) => {
    cb(null, profile);
}));

app.get('/login/google', passport.authenticate('google', {
    scope: ['email'],
}));

app.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', {
        failureRedirect: '/login',
        failureMessage: true,
    }, async (err, data) => {
        let dataSign = {};
        if (Array.isArray(data.emails) && data.emails.length) {
            dataSign = {
                success: 1,
                data: {
                    id: data.id,
                    email: data.emails[0].value
                },
            };

            const user = await new Promise((resolve, reject) => {
                checkUserEmail(dataSign.data.email, (err, user) => {
                    if (err) {
                        reject(err);
                    }

                    return resolve(user);
                });
            });
            if (Array.isArray(user) && user.length) {
                // 通过电子邮件注册的用户
                const userByEmail = await new Promise((resolve, reject) => {
                    getUserByUserEmail(dataSign.data.email, (err1, user1) => {
                        if (err1) {
                            reject(err1);
                        }

                        return resolve(user1);
                    });
                });

                const tokenLogin = sign({result: userByEmail}, config.TOKEN_KEY, {
                    expiresIn: "8h"
                });

                const jsontoken = sign({
                    result: {
                        success: 2,
                        tokenLogin,
                    }
                }, config.TOKEN_KEY, {
                    expiresIn: "8h"
                });
                return res.redirect(`https://gatediamon.one/login?type=success&token=${jsontoken}`);
            }
        } else {
            dataSign = {
                success: 0,
                error: "Không tìm thấy email trên tài khoản Google này"
            };
        }

        const jsontoken = sign({result: dataSign}, config.TOKEN_KEY, {
            expiresIn: "8h"
        });
        res.redirect(`https://gatediamon.one/login?type=google&token=${jsontoken}`);
    })(req, res, next);
});

app.get('/uninstall', (req, res) => {
    res.json({
        ok: 1,
    })
})

app.use(serveStatic(path.join(__dirname, 'public')))

app.get(/./, (req, res) => {
    res.send({
        title: `MT`,
        time: new Date().getTime()
    })
})

app.get('/status', (req, res) => {
    res.send({
        message: `Hello ${req.body.email} !`
    })
})

const port = config.PORT_SERVER
app.listen(port, () => {
    console.log(`Server start port: ${port}`);
});
