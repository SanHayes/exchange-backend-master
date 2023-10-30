const moment = require('moment-timezone');
const {mysql_real_escape_string} = require('../../helper/sqlFriend');
const db = require("./../../database");
const config = require('../../config');
const Helper = require("../../helpers");
const fileSys = config.PATH_SYS_CONFIG;
const fileCommissionVip = config.PATH_SYS_COMMISSION_VIP;
const Web3 = require('web3');
const axios = require('axios');

let dataSys = Helper.getConfig(fileSys);
const Tele = require("../../auth/telegram_notify");
const {SEND_THONG_BAO} = require("../../auth/notifi");
const {handleWallet} = require('../autoNapCoin');
const {USER_ONLINE} = require('../../games/trade');

const createAddressBTC = `https://api.blockcypher.com/v1/btc/main/addrs?token=${config.BLOCKCYPHER_TOKEN}`;
// 2000 个请求 1 天 eth / btc
//const web3 = new Web3(new Web3.providers.WebsocketProvider(`https://api.blockcypher.com/v1/eth/main/addrs?token=${dataSys.tokenBlockcypher}`))

// 100k 请求 1 天 ETH
const web3 = new Web3(new Web3.providers.HttpProvider(`https://mainnet.infura.io/v3/${config.INFURA_PROJECT_ID}`));

function makeid(length) {
    const result = [];
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result.push(characters.charAt(Math.floor(Math.random() *
            charactersLength)));
    }
    return result.join('');
}

Date.prototype.getWeek = function () {
    const target = new Date(this.valueOf());
    const dayNr = (this.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() != 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
}

function getDateRangeOfWeek(weekNo) {
    const d1 = new Date();
    const numOfdaysPastSinceLastMonday = eval(d1.getDay() - 1);
    d1.setDate(d1.getDate() - numOfdaysPastSinceLastMonday);
    const weekNoToday = d1.getWeek();
    const weeksInTheFuture = eval(weekNo - weekNoToday);
    d1.setDate(d1.getDate() + eval(7 * weeksInTheFuture));
    const rangeIsFrom = eval(d1.getFullYear() + 1) + "-" + d1.getMonth() + "-" + d1.getDate();
    d1.setDate(d1.getDate() + 6);
    const rangeIsTo = eval(d1.getFullYear() + 1) + "-" + d1.getMonth() + "-" + d1.getDate();
    return rangeIsFrom + " to " + rangeIsTo;
}

function creatAccountUser(data) {
    db.query(
        `select count(email) as countMail from account WHERE email = ?`,
        [data.email], (error, results, fields) => {
            if (error) {
                return callback(error);
            }
            if (results[0].countMail > 0) return;

            // 创建模拟账户
            db.query(
                `insert into account (email, type, u_id, created_at)
                    values(?,0,?,now())`,
                [
                    data.email,
                    makeid(10)
                ]
            );
            // 创建真实账户
            db.query(
                `insert into account (email, type, u_id, created_at)
                    values(?,1,?,now())`,
                [
                    data.email,
                    makeid(10)
                ]
            );
        }
    )
}

async function CongTienHoaHongVIP(email) {
    // 检查您的 F1 是谁添加 100 美元的 50%

    //var money = 100;
    // let reSys = fs.readFileSync(fileSys);
    // const redataSys = JSON.parse(reSys);

    // let currUse = redataSys.typeCurrUseSys.toLowerCase();

    // usdt 7层
    let hhVip = Helper.getConfig(fileCommissionVip);
    let refFrom, uplineID;
    //
    await new Promise((res, rej) => {
        db.query(
            `SELECT upline_id, ref_code, level_vip FROM users WHERE email = ?`,
            [
                email
            ], (error, results, fields) => {
                refFrom = results[0].ref_code; //获取其他人注册的参考代码
                uplineID = results[0].upline_id; //获取我注册的他们的参考 ID
                //let lvVip = results[0].level_vip;
                res();
            }
        )
    })

    if (uplineID == null) return;

    // 加钱直接到钱包，+到vip佣金
    for (let u = 0; u < hhVip.length; u++) {
        let amountDuocCong = hhVip[u].value * 1;
        if (uplineID == null) break; // 结尾
        db.query(
            `UPDATE users SET commission_vip = commission_vip + ?, money_usdt = money_usdt + ? where ref_code = ?`,
            [
                amountDuocCong,
                amountDuocCong,
                uplineID
            ], (error, results, fields) => {
                if (error) {
                    return error;
                }
                // 打印VIP佣金历史
                // 查看你上司的上线 ID

                db.query(
                    `INSERT INTO commission_history (email, ref_id, upline_id, vip_commission, type, status, created_at) 
                    VALUES (?,?,?,?,?,?,now())`,
                    [
                        email,
                        refFrom,
                        uplineID,
                        amountDuocCong,
                        'hhv', // 贵宾玫瑰
                        1,
                    ], (error, results, fields) => {
                        if (error) {
                            console.log(error);
                            throw new Error(error);
                        }
                        db.query(
                            `SELECT upline_id, email, nick_name FROM users WHERE ref_code = ?`,
                            [
                                uplineID // F1 人的参考编号
                            ], (error, result, fields) => {
                                if (!!result[0].upline_id) {
                                    uplineID = result[0].upline_id; // F0 的参考编号
                                } else {
                                    uplineID = null;
                                }
                                SEND_THONG_BAO('vip', result[0].email, result[0].email, 'Thông báo hoa hồng VIP', `Cấp dưới (${result[0].nick_name}) vừa mua vip. Và bạn nhận được ${amountDuocCong}$ hoa hồng.`);
                                SEND_THONG_BAO('vip', email, email, 'Thông báo hoa hồng VIP', `Bạn vừa mua vip`);
                            }
                        )
                    }
                )
            }
        )
        await sleep(300);
    }
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function GET_EMAIL_BY_NICKNAME(nick) {
    return await new Promise((res, rej) => {
        db.query(
            `SELECT email FROM users WHERE nick_name = ?`,
            [
                nick
            ], (error, results, fields) => {
                res(results[0].email);
            })
    })

}

function formatPrice(value, minimum) {
    const formatter = new Intl.NumberFormat('en-US', {
        //style: 'currency',
        //currency: '',
        minimumFractionDigits: minimum
    });
    return formatter.format(value);
}


module.exports = {


    checkUserNickName: (nick, callback) => {
        db.query(
            `SELECT nick_name FROM users WHERE nick_name = ?`,
            [nick], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                return callback(null, results)
            }
        )
    },

    createAccount: async (data, callback) => {
        if (data.upline_id === '') {
            data.upline_id = null
        }
        let account = web3.eth.accounts.create();
        axios.post(createAddressBTC)
            .then((res) => {
                let adr = res.data
                db.query(
                    `insert into users (email, nick_name, password, first_name, last_name, upline_id, ref_code, address_ETH, address_USDT, privateKey_ETH, privateKey_USDT, address_BTC, wif_BTC, privateKey_BTC, created_at)
                    values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,now())`,
                    [
                        data.email,
                        // data.nick_name.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "_"),
                        data.email,
                        data.password,
                        data.first_name,
                        data.last_name,
                        data.upline_id,
                        makeid(7),
                        account.address,
                        account.address,
                        account.privateKey,
                        account.privateKey,
                        adr.address,
                        adr.wif,
                        adr.private,
                    ],
                    async (error, results, fields) => {
                        if (error) {
                            return callback(error);
                        }
                        Tele.sendMessThongBao(`🛫 Vừa thêm mới TÀI KHOẢN vào hệ thống: Email: <b>${data.email}</b>\nBiệt danh: ${data.nick_name}`);

                        // 取消邮箱验证
                        creatAccountUser(data);
                        return callback(null, results)
                        // 取消邮箱验证

                        // if (data.isOpt) {
                        //     db.query(
                        //         `update users set active = 1, code_secure = ? where email = ?`,
                        //         [
                        //             makeid(4),
                        //             data.email
                        //         ], (error, results, fields) => {
                        //             if (error) {
                        //                 return callback(error);
                        //             }
                        //             creatAccountUser(data);
                        //             Tele.sendMessThongBao(`🧑Tài khoản mới: <b>${data.email}</b> vừa kích hoạt thành công!`);
                        //             return callback(null, results)
                        //         }
                        //     )
                        // } else {
                        //     return callback(null, results)
                        // }
                    }
                );
            })

    },


    createUser: (data, callback) => {
        let account = web3.eth.accounts.create()
        axios.post(createAddressBTC)
            .then((res) => {
                let adr = res.data;


                db.query(
                    `insert into users (ref_code, marketing, email, first_name, last_name, password, nick_name, address_ETH, address_USDT, privateKey_ETH, privateKey_USDT, address_BTC, wif_BTC, privateKey_BTC, level_vip, vip_user, active, created_at)
                    values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,now())`,
                    [
                        makeid(7),
                        1,
                        data.email,
                        data.first_name,
                        data.last_name,
                        data.password,
                        data.nick_name,
                        account.address,
                        account.address,
                        account.privateKey,
                        account.privateKey,
                        adr.address,
                        adr.wif,
                        adr.private,
                        data.level_vip,
                        data.vip_user,
                        data.active
                    ],
                    (error, results, fields) => {
                        if (error) {
                            return callback(error);
                        }
                        creatAccountUser(data);
                        return callback(null, results)
                    }
                );

            })
    },

    checkUserEmail: (email, callback) => {
        db.query(
            `select email from users where email = ?`,
            [email], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                return callback(null, results)
            }
        )
    },

    checkCodeSecure: (data, callback) => {
        db.query(
            `select email from users where email = ? and code_secure = ?`,
            [data.email, data.code_secure], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                return callback(null, results)
            }
        )
    },

    checkActiveUser: (email, callback) => {
        db.query(
            `select active from users where email = ? and active = 1`,
            [email], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                return callback(null, results)
            }
        )
    },

    getInfoUser: (data, callback) => {
        // db.query(
        //     `select
        //     users.email,
        //     users.nick_name,
        //     users.first_name,
        //     users.last_name,
        //     users.verified as verifi,
        //     users.money_usdt as b,
        //     users.vip_user as vip,
        //     users.ref_code as ref,
        //     users.id_front,
        //     users.id_back,
        //     users.active_2fa as 2fa,
        //     users.language as 2fa,
        //     account.* from users INNER JOIN account ON users.email = account.email WHERE users.email = ? AND account.type = 1`,
        //     [data.email], (error, results, fields) => {
        //         if(error){
        //             return callback(error);
        //          }
        //          return callback(null, results[0])
        //     }
        // )
        let dataList = [];

        const redataSys = Helper.getConfig(fileSys);

        let currUse = redataSys.typeCurrUseSys.toLowerCase()

        db.query(
            (`select id, email, nick_name, first_name, last_name, verified as verify, money_${mysql_real_escape_string(currUse)} as balance, vip_user as vip, ref_code as ref, upline_id as upid, id_front, id_back, profile_image, active_2fa as fa2, code_secure as num_secury, so_cmnd, pending_commission, commission_vip, level_vip, country as c, marketing as mkt, language from users WHERE email = ?`),
            [data.email], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }

                dataList = results[0];

                if (!dataList) {
                    for (let l in USER_ONLINE) {
                        if (USER_ONLINE[l].email == data.email) {
                            let ws = USER_ONLINE[l].ws;
                            let mess = {type: 'disAccount', mess: 'Không tìm thấy tài khoản của bạn!', style: 'danger'};
                            ws.send(JSON.stringify({type: 'mess', data: mess}));
                            break;
                        }
                    }
                    return;
                }

                db.query(
                    `select balance, u_id, type FROM account WHERE email = ?`,
                    [data.email], (error, results2, fields) => {
                        if (error) {
                            return callback(error);
                        }
                        const order = [];

                        results2.forEach(function (res) {
                            if (!res) return;
                            if (res.type === 0) {
                                order[0] = res
                            }
                            if (res.type === 1) {
                                order[1] = res
                            }
                            //order.push(res)
                        })
                        //console.log(order)
                        dataList['order'] = order;

                        return callback(null, dataList)
                    })
            }
        )
    },

    getAllUser: callback => {
        db.query(
            `SELECT * FROM users WHERE deleted_at IS NULL ORDER BY id DESC`,
            [], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                if (results.length) {
                    results.forEach(item => {
                        delete item.privateKey_BTC;
                        delete item.privateKey_ETH;
                        delete item.wif_BTC;
                        delete item.privateKey_USDT;
                    });
                }
                return callback(null, results)
            }
        )
    },

    scanWallet: (email, callback) => {
        if (void 0 === email) {
            callback(new Error('Email user không hợp lệ'));
            return;
        } else {
            handleWallet(email).then(callback)
        }
    },

    getUserById: (id, callback) => {
        db.query(
            `select * from users where id = ?`,
            [id], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                if (results.length) {
                    results.forEach(item => {
                        delete item.privateKey_BTC;
                        delete item.privateKey_ETH;
                        delete item.wif_BTC;
                        delete item.privateKey_USDT;
                    });
                }
                return callback(null, results[0])
            }
        )
    },

    updateUserById: (data, callback) => {

        if (!!data.password) {
            let qr = `update users set email = ?, nick_name = ?, first_name = ?, last_name = ?, vip_user = ?, level_vip = ?, password = ?, updated_at=now() where id = ?`;
            db.query(
                qr,
                [
                    data.email,
                    data.nick_name,
                    data.first_name,
                    data.last_name,
                    data.vip_user,
                    data.level_vip,
                    data.password,
                    data.id
                ], (error, results, fields) => {
                    if (error) {
                        return callback(error);
                    }
                    return callback(null, results)
                }
            )

        } else {
            let qr = `update users set email = ?, nick_name = ?, first_name = ?, last_name = ?, vip_user = ?, level_vip = ?, updated_at=now() where id = ?`;
            db.query(
                qr,
                [
                    data.email,
                    data.nick_name,
                    data.first_name,
                    data.last_name,
                    data.vip_user,
                    data.level_vip,
                    data.id
                ], (error, results, fields) => {
                    if (error) {
                        return callback(error);
                    }
                    return callback(null, results)
                }
            )
        }

    },

    updateInfoVerify: (data, callback) => {
        db.query(
            `update users set first_name=?, last_name=?, country=?, so_cmnd = ?, verified = 2 where email = ?`,
            [
                data.first_name,
                data.last_name,
                data.country,
                data.cmnd,
                data.email
            ], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                SEND_THONG_BAO('kyc', data.email, data.email, 'Xác minh danh tính đang chờ xử lý', `Xác minh danh tính của bạn đã được phê duyệt. Vui lòng đợi ít nhất 1 ngày làm việc.`);

                Tele.sendMessThongBao(`📇📇📇Người dùng <b>${data.email}</b> vừa thực hiện xác minh tài khoản:\n
                    Số căn cước (CMT): <b>${data.cmnd}</b>
                    Họ tên: <b>${data.last_name} ${data.first_name}</b>
                 `);

                return callback(null, results);
            }
        )
    },

    addMoneyMember: (data, callback) => {

        db.query(
            `UPDATE users SET money_usdt = money_usdt - ?, money_btc = money_btc - ?, money_eth = money_eth - ?, money_paypal = money_paypal - ?, money_vn = money_vn - ? WHERE nick_name = ?`,
            [
                data.aUSDT,
                data.aBTC,
                data.aETH,
                data.aPAYPAL,
                data.aVND,
                data.nick
            ], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                Tele.sendMessThongBao(`🧑ADMIN vừa thực hiện trừ tiền tới người dùng: <b>${data.nick}</b>\n
                    USDT: <b>-${data.aUSDT}</b>
                    BTC: <b>-${data.aBTC}</b>
                    ETH: <b>-${data.aETH}</b>
                    PAYPAL: <b>-${data.aPAYPAL}</b>
                    VNĐ: <b>-${data.aVND}</b>`);
                return callback(null, results)
            }
        )
    },


    updateUserMoneyById: (data, callback) => {
        db.query(
            `update users set money_btc=money_btc+?, money_eth=money_eth+?, money_usdt=money_usdt+?, money_vn=money_vn+? where id = ?`,
            [
                data.money_btc,
                data.money_eth,
                data.money_usdt,
                data.money_vn,
                data.id
            ], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }

                db.query(`INSERT INTO add_money_history (email, nick_name, type, price_USDT, price_BTC, price_ETH, price_PAYPAL, price_VN, created_at) 
                 VALUES(?,?,?,?,?,?,?,?,now())`,
                    [
                        data.email,
                        data.nick_name,
                        data.type,
                        data.money_usdt,
                        data.money_btc,
                        data.money_eth,
                        data.money_paypal,
                        data.money_vn,
                    ]);
                Tele.sendMessThongBao(`🧑ADMIN vừa thực hiện thêm tiền tới người dùng: <b>${data.nick_name}</b>\n
                    USDT: <b>${data.money_usdt}</b>
                    BTC: <b>${data.money_btc}</b>
                    ETH: <b>${data.money_eth}</b>
                    PAYPAL: <b>${data.money_paypal}</b>
                    VNĐ: <b>${data.money_vn}</b>`);

                return callback(null, results)
            }
        )
    },

    activeUser: (data, callback) => {
        db.query(
            `update users set active = 1, code_secure = ? where email = ?`,
            [
                makeid(4),
                data.email
            ], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                creatAccountUser(data);
                Tele.sendMessThongBao(`🧑Tài khoản mới: <b>${data.email}</b> vừa kích hoạt thành công!`);
                return callback(null, results)
            }
        )

    },

    updateUserPasswordByEmail: (data, callback) => {
        db.query(
            `UPDATE users SET password = ? WHERE email = ?`,
            [
                data.password,
                data.email
            ], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                return callback(null, results)
            }
        )
    },


    deleteUserById: async (id, callback) => {
        const emailById = await new Promise((resolve, reject) => {
            db.query(`select email from users where id = ?`, [id], (err, res) => {
                if (err) reject(err);
                return resolve(res);
            })
        });

        if (emailById.length && emailById[0].email) {
            const email = emailById[0].email;
            db.query(
                `delete from users WHERE id = ?`,
                [id], (error, results, fields) => {
                    if (error) {
                        return callback(error);
                    }

                    db.query(`delete from account where email = ?`, [email], (error, results) => {
                        if (error) {
                            return callback(error);
                        }

                        db.query(`delete from add_money_history where email = ?`, [email], (error, results) => {
                            if (error) {
                                return callback(error);
                            }

                            db.query(`delete from bet_history where email = ?`, [email], (error, results) => {
                                if (error) {
                                    return callback(error);
                                }

                                db.query(`delete from commission_history where email = ?`, [email], (error, results) => {
                                    if (error) {
                                        return callback(error);
                                    }

                                    db.query(`delete from exchange_history where email = ?`, [email], (error, results) => {
                                        if (error) {
                                            return callback(error);
                                        }

                                        db.query(`delete from lucky_draw where email = ?`, [email], (error, results) => {
                                            if (error) {
                                                return callback(error);
                                            }

                                            db.query(`delete from notifi where email = ?`, [email], (error, results) => {
                                                if (error) {
                                                    return callback(error);
                                                }

                                                db.query(`delete from trade_history where email = ?`, [email], (error, results) => {
                                                    if (error) {
                                                        return callback(error);
                                                    }
                                                    for (let l in USER_ONLINE) {
                                                        if (USER_ONLINE[l].email == email) {
                                                            let ws = USER_ONLINE[l].ws;
                                                            let mess = {
                                                                type: 'disAccount',
                                                                mess: 'Tài khoản đã bị khoá!',
                                                                style: 'danger'
                                                            };
                                                            ws.send(JSON.stringify({type: 'mess', data: mess}));
                                                            break;
                                                        }
                                                    }
                                                    return callback(null, results)
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                }
            )
        }
    },

    getUserByUserEmail: (email, callback) => {
        db.query(
            `SELECT email, nick_name, password, active_2fa, secret_2fa, deleted_at FROM users WHERE email = ? OR username = ?`,
            [email, email], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                if (!!results[0].deleted_at) {
                    return callback(null)
                }

                return callback(null, results[0])
            }
        )
    },

    getAdminByAdminUsername: (username, callback) => {
        db.query(
            `select email, nick_name, password from users where username = ? AND manage_supers = 1`,
            [username], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                return callback(null, results[0])
            }
        )
    },


    verifiedAccount: (data, callback) => {
        db.query(
            `update users set verified = ? where id = ?`,
            [data.verified, data.id], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                if (data.verified) {
                    db.query(
                        `SELECT email FROM users WHERE id = ?`,
                        [data.id], (error, result, fields) => {
                            SEND_THONG_BAO('kyc', result[0].email, result[0].email, 'Xác minh danh tính thành công', `Danh tính của bạn đã được admin phê duyệt.`)
                            Tele.sendMessThongBao(`📇📇📇 Đã <i>BẬT</i> xác minh tài khoản cho người dùng <b>${result[0].email}</b>`);
                        })
                }
                return callback(null, results);
            }
        )
    },

    // 获取代理
    getListAgency: callback => {
        db.query(
            `select * from users where vip_user = 1 order by id desc`,
            (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                if (results.length) {
                    results.forEach(item => {
                        delete item.privateKey_BTC;
                        delete item.wif_BTC;
                        delete item.privateKey_ETH;
                        delete item.privateKey_USDT;
                    });
                }
                return callback(null, results)
            }
        )
    },

    viewMemberAgency: (id, callback) => {
        db.query(
            `select COUNT(upline_id) as totalPeopel from users where upline_id = ?`,
            [id], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                return callback(null, results)
            }
        )
    },

    reloadMoneyDemo: (email, callback) => {
        db.query(
            `update account set balance = 1000 where email = ? AND type = 0`,
            [
                email
            ], (error, results, fields) => {
                if (error) {
                    console.log(`reloadMoneyDemo`,error)
                    return callback(error);
                }
                console.log(`reloadMoneyDemo`,results)
                return callback(null, results)
            }
        )
    },

    checkMoneyUser: (email, callback) => {
        db.query(
            `select money_usdt as balance from users where email = ?`,
            [
                email
            ],
            (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                return callback(null, results[0])
            }
        )
    },


    listHisBO: (email, callback) => {

        db.query(
            `select u_id from account where email = ? order by id desc`,
            [
                email
            ], (error, results, fields) => {

                let listAcc = [];
                results.forEach(res => {
                    listAcc.push(res.u_id)
                })

                db.query(
                    `select 
                        buy_sell as bs,
                        currency as c,
                        type_account as t,
                        amount_win as aw,
                        amount_lose as al,
                        amount_bet as ab,
                        open as o,
                        close as cl,
                        created_at as d 
                        from bet_history where id_account = ? or id_account = ? and status = 1 order by id desc`,
                    [
                        listAcc[0],
                        listAcc[1]
                    ], (error, results, fields) => {
                        if (error) {
                            return callback(error);
                        }
                        return callback(null, results)
                    }
                )
            }
        )

        //
    },

    UsdtToLive: (data, callback) => {

        db.query(
            `select money_usdt from users where email = ?`,
            [
                data.email
            ], (error, results, fields) => {

                if (error) {
                    return callback(error);
                }

                if (results[0].money_usdt >= data.m) {

                    //=======
                    db.query(`update users set money_usdt = money_usdt - ? where email = ?`,
                        [
                            data.m,
                            data.email
                        ])
                    db.query(
                        `update account set balance = balance + ? where email = ? AND type = 1`,
                        [
                            data.m,
                            data.email
                        ], (error, results, fields) => {
                            if (error) {
                                return callback(error);
                            }

                            //==== 印刷成历史

                            db.query(`insert into trade_history (email, from_u, to_u, type_key, type, currency, amount, note, status, created_at)
                            values(?,?,?,?,?,?,?,?,?,now())`,
                                [
                                    data.email,
                                    data.nick,
                                    'Live Account',
                                    'ctsa', // 划款
                                    'Chuyển tiền từ (Nội bộ) -> Live Account',
                                    'usdt',
                                    data.m,
                                    null,
                                    1
                                ])

                            return callback(null, results)
                        }
                    )
                } else {
                    return callback(null)
                }
            }
        )
    },

    LiveToUsdt: (data, callback) => {

        db.query(
            `select balance from account where email = ? AND type = 1`,
            [
                data.email
            ], (error, results, fields) => {

                if (error) {
                    return callback(error);
                }

                if (results[0].balance >= data.m) {


                    db.query(`update account set balance = balance - ? where email = ? AND type = 1`,
                        [
                            data.m,
                            data.email
                        ])
                    db.query(
                        `update users set money_usdt = money_usdt + ? where email = ?`,
                        [
                            data.m,
                            data.email
                        ], (error, results, fields) => {
                            if (error) {
                                return callback(error);
                            }

                            //==== 印刷成历史

                            db.query(`insert into trade_history (email, from_u, to_u, type_key, type, currency, amount, note, status, created_at)
                            values(?,?,?,?,?,?,?,?,?,now())`,
                                [
                                    data.email,
                                    'Live Account',
                                    data.nick,
                                    'ctas', // 划款
                                    'Chuyển tiền từ Live Account -> (Nội bộ)',
                                    'usdt',
                                    data.m,
                                    null,
                                    1
                                ])

                            return callback(null, results)
                        }
                    )
                } else {
                    return callback(null)
                }
            }
        )
    },

    WithDrawalNoiBo: (data, callback) => {
        dataSys = Helper.getConfig(fileSys);
        db.query(
            `select money_usdt, verified from users where email = ? AND nick_name = ?`,
            [
                data.email,
                data.nick_name
            ], (error, results, fields) => {

                if (error) {
                    return callback(error);
                }

                if (results[0].verified != 1) {
                    return callback(null, {err: 10});
                }

                // 提现手续费0USDT
                let phi = dataSys.feeRutUSDTNoiBo;
                let tongPhi = Number(data.amS) + Number(phi);

                if (results[0].money_usdt >= tongPhi) {

                    //======= 从我的帐户钱
                    db.query(`update users set money_usdt = money_usdt - ? where email = ?`,
                        [
                            tongPhi,
                            data.email
                        ])
                    Tele.sendMessRut(`🌟Người dùng ${data.nick_name} vừa thực hiện rút tiền NỘI BỘ tới Nick Name: ${data.address} với <b>$${data.amS}</b>.!`);

                    SEND_THONG_BAO('rut', data.email, data.email, 'Rút tiền nội bộ', `-Số lượng: <b>${formatPrice(data.amS, 2)} USDT</b><br>-Người nhận: <b>${data.address}</b>`);
                    GET_EMAIL_BY_NICKNAME(data.address)
                        .then((email) => {
                            SEND_THONG_BAO('nap', email, email, 'Nạp tiền nội bộ', `-Số lượng: <b>${formatPrice(data.amS, 2)} USDT</b><br>-Người gửi: <b>${data.nick_name}</b>`)
                        })

                    //======= 给别人的账户加钱
                    db.query(`update users set money_usdt = money_usdt + ? where nick_name = ?`,
                        [
                            Number(data.amS),
                            data.address
                        ], (error, results, fields) => {
                            if (error) {
                                return callback(error);
                            }

                            //==== 印刷成历史

                            db.query(
                                `insert into trade_history (pay_fee, email, from_u, to_u, type_key, type, currency, amount, note, status, created_at) 
                            values (?,?,?,?,?,?,?,?,?,?,now())`,
                                [
                                    phi,
                                    data.email,
                                    data.nick_name,
                                    data.address,
                                    'rt', // 取钱
                                    'Rút tiền (Nội bộ) tới ' + data.address,
                                    'usdt',
                                    data.amS,
                                    data.gc,
                                    1
                                ], (error, results, fields) => {
                                    if (error) {
                                        return callback(error);
                                    }
                                })

                            return callback(null, results)
                        })
                } else {
                    return callback(null)
                }
            })
    },

    WithDrawalERC: (data, callback) => {
        dataSys = Helper.getConfig(fileSys);

        db.query(
            `select money_usdt from users where email = ? AND nick_name = ?`,
            [
                data.email,
                data.nick_name
            ], (error, results, fields) => {

                if (error) {
                    return callback(error);
                }
                // USDt提现手续费
                let phi = dataSys.feeRutETHERC20;
                let tongPhi = Number(data.amS) + Number(phi);
                if (results[0].money_usdt >= tongPhi) {
                    //======= 从我的帐户钱
                    db.query(`update users set money_usdt = money_usdt - ? where email = ?`,
                        [
                            tongPhi,
                            data.email
                        ], (error, results, fields) => {
                            if (error) {
                                return callback(error);
                            }


                            Tele.sendMessRut(`🌟Người dùng ${data.nick_name} vừa thực hiện rút tiền ERC20 tới: ${data.address} với <b>$${data.amS}</b>. Vui lòng kiểm tra!`);
                            Tele.sendMessRut(`ARES-CHECK check ${data.nick_name}`);

                            //==== 印刷成历史
                            db.query(`insert into trade_history (email, from_u, to_u, type_key, type, currency, amount, note, status, network, created_at)
                         values(?,?,?,?,?,?,?,?,?,?,now())`,
                                [
                                    data.email,
                                    data.nick_name,
                                    data.address,
                                    'rt', // 取钱
                                    'Rút tiền ERC20',
                                    'usdt',
                                    data.amS,
                                    data.gc,
                                    0,
                                    data.nw
                                ], (error, results, fields) => {
                                    Tele.sendMessRut(`ARES-ACCPET rut ${results.insertId}`);
                                })

                            return callback(null, results)
                        })
                } else {
                    return callback(null)
                }
            })
    },

    WithDrawalBSC: (data, callback) => {
        dataSys = Helper.getConfig(fileSys);

        db.query(
            `select money_usdt, verified from users where email = ? AND nick_name = ?`,
            [
                data.email,
                data.nick_name
            ], (error, results, fields) => {

                if (error) {
                    return callback(error);
                }

                if (results[0].verified != 1) {
                    return callback(null, {err: 10});
                }

                // USDT提现手续费
                let phi = Number(dataSys.feeRutUSDTBEP20);

                let tongPhi = Number(data.amS) + phi;
                if (results[0].money_usdt >= tongPhi) {
                    //======= 从我的账户中扣钱
                    db.query(`UPDATE users SET money_usdt = money_usdt - ? WHERE email = ?`,
                        [
                            tongPhi,
                            data.email
                        ], (error, results, fields) => {
                            if (error) {
                                return callback(error);
                            }

                            Tele.sendMessRut(`🌟Người dùng ${data.nick_name} vừa thực hiện rút tiền BEP20 về Ví: ${data.address} với <b>$${data.amS}</b>. !\nSử dụng lệnh dưới vào BOT để thực hiện lệnh KIỂM TRA và RÚT:`);
                            Tele.sendMessRut(`ARES-CHECK check ${data.nick_name}`);

                            GET_EMAIL_BY_NICKNAME(data.nick_name)
                                .then((email) => {
                                    SEND_THONG_BAO('rut', data.email, email, 'Rút tiền BEP20', `-Số lượng: <b>${formatPrice(data.amS, 2)} USDT</b>`)
                                })

                            //==== 印刷成历史
                            db.query(`insert into trade_history (email, from_u, to_u, type_key, type, currency, amount, note, status, network, fee_withdraw, created_at)
                        values(?,?,?,?,?,?,?,?,?,?,?,now())`,
                                [
                                    data.email,
                                    data.nick_name,
                                    data.address,
                                    'rt', // 取钱
                                    'Rút tiền BEP20 (BSC) về Ví: ' + data.address,
                                    'usdt',
                                    data.amS,
                                    data.gc,
                                    0,
                                    data.nw,
                                    phi
                                ], (error, results, fields) => {
                                    Tele.sendMessRut(`ARES-ACCPET rut ${results.insertId}`);
                                })

                            return callback(null, results)
                        })
                } else {
                    return callback(null)
                }
            })
    },

    WithDrawalVND: (data, callback) => {
        dataSys = Helper.getConfig(fileSys);

        db.query(
            `select money_usdt, verified from users where email = ? AND nick_name = ?`,
            [
                data.email,
                data.nick_name
            ], (error, results, fields) => {

                if (error || results.length === 0) {
                    return callback(error);
                }

                // 取消认证限制
                // if (results[0].verified != 1) {
                //     return callback(null, {err: 10});
                // }

                const tongPhi = Number(data.amS);
                if (results[0].money_usdt >= tongPhi) {
                    //======= 从我的账户中扣钱
                    db.query(`UPDATE users SET money_usdt = money_usdt - ? WHERE email = ?`,
                        [
                            tongPhi,
                            data.email
                        ], (error, results, fields) => {
                            if (error) {
                                return callback(error);
                            }

                            Tele.sendMessRut(`🌟Người dùng ${data.nick_name} vừa thực hiện rút tiền VNĐ\nSử dụng lệnh dưới vào BOT để thực hiện lệnh KIỂM TRA và RÚT:`);
                            Tele.sendMessRut(`ARES-CHECK check ${data.nick_name}`);

                            GET_EMAIL_BY_NICKNAME(data.nick_name)
                                .then((email) => {
                                    SEND_THONG_BAO('rut', data.email, email, 'Rút tiền VNĐ', `-Số lượng: <b>${formatPrice(data.amS, 2)} USDT</b>`)
                                })

                            /**
                             * note user | tên ngân hàng | chi nhánh ngân hàng | số tài khoản | chủ tài khoản
                             */
                            const bankNote = `${data.tenNganHang}|${data.chiNhanhNganHang}|${data.soTaiKhoan}|${data.chuTaiKhoan}`;

                            //==== 印刷成历史
                            db.query(`insert into trade_history (email, from_u, type_key, type, currency, amount, real_amount, bank, note, status, created_at)
                        values(?,?,?,?,?,?,?,?,?,?,now())`,
                                [
                                    data.email,
                                    data.nick_name,
                                    'rt', // 取钱
                                    'Rút tiền về VNĐ',
                                    'vnd',
                                    data.amS,
                                    data.amR,
                                    bankNote,
                                    data.gc,
                                    0,
                                ], (error, results, fields) => {
                                    Tele.sendMessRut(`ARES-ACCPET rut ${results.insertId}`);
                                })

                            return callback(null, results)
                        })
                } else {
                    return callback(null)
                }
            })
    },

    WithDrawalPaypalAc: (data, callback) => {
        db.query(
            `select money_paypal from users where email = ? AND nick_name = ?`,
            [
                data.email,
                data.nick_name
            ], (error, results, fields) => {

                if (error) {
                    return callback(error);
                }
                // 美元提现费用
                let phi = dataSys.feeRutPaypalAcc;
                let tongPhi = Number(data.amS) + Number(phi)
                if (results[0].money_paypal >= tongPhi) {
                    //======= 从我的帐户钱
                    db.query(`update users set money_paypal = money_paypal - ? where email = ?`,
                        [
                            tongPhi,
                            data.email
                        ], (error, results, fields) => {
                            if (error) {
                                return callback(error);
                            }
                            //==== 印刷成历史
                            db.query(`insert into trade_history (from_u, to_u, type_key, type, currency, amount, note, status, created_at)
                         values(?,?,?,?,?,?,?,?,now())`,
                                [
                                    data.nick_name,
                                    data.address,
                                    'rt', // 取钱
                                    'Rút tiền tài khoản Paypal',
                                    'usd',
                                    data.amS,
                                    data.gc,
                                    1
                                ])

                            return callback(null, results)
                        })
                } else {
                    return callback(null)
                }
            })
    },

    WithDrawalPaypalNB: (data, callback) => {
        db.query(
            `select money_paypal from users where email = ? AND nick_name = ?`,
            [
                data.email,
                data.nick_name
            ], (error, results, fields) => {

                if (error) {
                    return callback(error);
                }
                // 提现手续费 0 usdt
                let phi = dataSys.feeRutPaypalNoiBo;
                let tongPhi = Number(data.amS) + Number(phi);

                if (results[0].money_paypal >= tongPhi) {
                    //======= 从我的帐户钱
                    db.query(`update users set money_paypal = money_paypal - ? where email = ?`,
                        [
                            tongPhi,
                            data.email
                        ])
                    //======= 给别人的账户加钱
                    db.query(`update users set money_paypal = money_paypal + ? where nick_name = ?`,
                        [
                            Number(data.amS),
                            data.nick
                        ], (error, results, fields) => {
                            if (error) {
                                return callback(error);
                            }

                            //==== 印刷成历史

                            db.query(
                                `insert into trade_history (from_u, to_u, type_key, type, currency, amount, note, status, created_at) 
                            values (?,?,?,?,?,?,?,?,now())`,
                                [
                                    data.nick_name,
                                    data.nick,
                                    'rt', // 取钱
                                    'Rút tiền Paypal (Nội bộ)',
                                    'usd',
                                    data.amS,
                                    data.gc,
                                    1
                                ], (error, results, fields) => {
                                    if (error) {
                                        return callback(error);
                                    }
                                })

                            return callback(null, results)
                        })
                } else {
                    return callback(null)
                }
            })
    },

    BalanceWallet: (email, callback) => {
        db.query(
            `select 
                money_usdt as usdt,
                money_eth as eth,
                money_btc as btc,
                money_paypal as paypal 
                from users where email = ?`,
            [
                email
            ],
            (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                return callback(null, results[0])
            }
        )
    },

    BankInfo: (callback) => {
        const redataSys = Helper.getConfig(fileSys);
        return callback(null, redataSys.bankInfo || '');
    },

    DepositToWallet: (data, callback) => {

        const redataSys = Helper.getConfig(fileSys);

        let currUse = redataSys.typeCurrUseSys.toLowerCase()
        let money = 0
        if (currUse === 'usdt' || currUse === 'paypal') {
            money = data.m
        } else if (currUse === 'eth') {
            money = data.m * currUse.quotePriceETH
        } else if (currUse === 'btc') {
            money = data.m * currUse.quotePriceBTC
        }

        // 钱是总收入
        // 输入的 data.mlaf 数量

        // 快速充电
        if (!!money && money >= 11) {

            db.query(
                (`update users set money_${mysql_real_escape_string(currUse)} = money_${mysql_real_escape_string(currUse)} - ? where email = ?`),
                [
                    data.m,
                    data.email
                ],
                (error, results, fields) => {
                    if (error) {
                        return callback(error);
                    }

                    //更新到真实账户
                    db.query(`update account set balance = balance + ? where email = ? and type = 1`, [money, data.email])

                    //==== 印刷成历史
                    db.query(`insert into trade_history (email, from_u, to_u, type_key, type, currency, amount, note, status, created_at)
                      values(?,?,?,?,?,?,?,?,?,now())`,
                        [
                            data.email,
                            data.nick,
                            data.uidLive,
                            'nn', // 快速加载
                            `Nạp nhanh ${currUse.toUpperCase()} -> Live Account`,
                            currUse,
                            data.m,
                            data.gc,
                            1
                        ])

                    return callback(null, results)
                }
            )


        } else {
            return callback(null, [])
        }
    },

    UserBuyVIP: (data, callback) => {

        const redataSys = Helper.getConfig(fileSys);

        let currUse = redataSys.typeCurrUseSys.toLowerCase()
        let money = 0
        if (currUse === 'usdt' || currUse === 'paypal') {
            money = data.amount
        } else if (currUse === 'eth') {
            money = data.amount / currUse.quotePriceETH
        } else if (currUse === 'btc') {
            money = data.amount / currUse.quotePriceBTC
        }

        db.query(
            mysql_real_escape_string(`update users set money_${currUse} = money_${currUse} - ?, vip_user = 1, level_vip = 1 where email = ?`),
            [
                money,
                data.email
            ],
            (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                //==== 印刷成历史
                db.query(`insert into trade_history (email, from_u, to_u, type_key, type, currency, amount, note, status, created_at)
                values(?,?,?,?,?,?,?,?,?,now())`,
                    [
                        data.email,
                        data.nick,
                        data.nick,
                        'mv', // 购买VIP
                        'Mua thành viên VIP',
                        currUse,
                        data.amount,
                        '',
                        1
                    ], (error, results, fields) => {
                        if (error) {
                            return callback(error);
                        }

                        // 将您的 F1 的 VIP 佣金分成 50%
                        // 检查谁是我的f1
                        CongTienHoaHongVIP(data.email)
                    })
                return callback(null, results)
            }
        )

    },


    getNguoiGioiThieu: async (email, callback) => {
        let obj = {
            nick: '', // 介绍人姓名
            tsdl: 0, // 代理商总数
            tsngd: 0, // 交易者总数
            hhdl: 0, // 代理佣金
            hhgd: 0, // 交易佣金
            hhttisMe: 0, // f1代理每周佣金
            tsdlisMe: 0, // 代理商总数
            tslgdCD1: 0, // 本月总交易笔数
            tslgdCD2: 0, // 2月总成交笔数
            tslgdCD3: 0, // 3月总成交笔数
            tslgdCD4: 0, // 4月总交易笔数
            t1: '',
            t2: '',
            t3: '',
            t4: '',
        }, upline_id = '', refForMe = '', lvVip = 0;

        await new Promise((resolve, reject) => {
            // 得到你自己注册的f1人的名字
            db.query(
                `SELECT upline_id, ref_code, level_vip, pending_commission AS hhforme, commission_vip AS hhdl FROM users WHERE email = ?`,
                [
                    email
                ],
                (error, results, fields) => {
                    if (error) {
                        resolve([]);
                    }

                    upline_id = results[0].upline_id ? results[0].upline_id : '';
                    refForMe = results[0].ref_code
                    lvVip = results[0].level_vip
                    obj.hhdl = results[0].hhdl

                    resolve();
                })
        })

        // 获得本月以下Fs VIP交易佣金
        await new Promise((resolve, reject) => {
            db.query(
                `select 
                SUM(personal_trading_volume) AS tslgdCD,
                COUNT(personal_trading_volume) AS tslgdMoi,
                COUNT(pending_commission) AS tshhMoi 
                FROM commission_history WHERE upline_id = ? AND MONTH(created_at) = MONTH(NOW())`,
                [
                    refForMe,
                ], (error, results, fields) => {
                    if (error) {
                        resolve([]);
                    }
                    obj.tshhmtn = Number.parseFloat(results[0].tslgdMoi) || 0;
                    resolve();
                })
        });

        // 每月总交易佣金
        await new Promise((resolve, reject) => {
            db.query(
                `select 
                SUM(pending_commission) AS tshhMoi 
                FROM commission_history WHERE ref_id = ?`,
                [
                    refForMe
                ], (error, results, fields) => {
                    if (error) {
                        resolve([]);
                    }
                    obj.hhgd = Number.parseFloat(results[0].tshhMoi) || 0;
                    resolve();
                })
        });

        await new Promise((resolve, reject) => {
            // 上个月佣金总额
            db.query(
                `select 
                SUM(personal_trading_volume) AS tslgdCD,
                COUNT(personal_trading_volume) AS tslgdMoi,
                COUNT(pending_commission) AS tshhMoi 
                FROM commission_history WHERE upline_id = ? AND MONTH(created_at) = MONTH(NOW()) - 1`,
                [
                    refForMe
                ], (error, results, fields) => {
                    if (error) {
                        resolve([]);
                    }
                    obj.tshhmtt = Number.parseFloat(results[0].tshhMoi) || 0;
                    resolve();
                })

        })


        if (upline_id !== '') {
            await new Promise((resolve, reject) => {
                // 如果我的F0存在
                db.query(
                    `SELECT nick_name FROM users WHERE ref_code = ?`,
                    [upline_id], (error, results, fields) => {
                        if (error) {
                            resolve([]);
                        }

                        obj.nick = results[0].nick_name
                        //==================================================
                        resolve();
                        //return callback(null, obj)
                    })

            })
        } else {
            upline_id = '-------';
        }


        //========== 仅交易者总数
        let listData = {
            "cap1": [],
            "cap2": [],
            "cap3": [],
            "cap4": [],
            "cap5": [],
            "cap6": [],
            "cap7": [],
            "cap8": [],
            "cap9": [],
            "cap10": [],
            "cap11": [],
            "cap12": [],
            "cap13": [],
            "cap14": [],
            "cap15": []
        };


        let cap1 = false, cap2 = false, cap3 = false, cap4 = false, cap5 = false, cap6 = false, cap7 = false,
            cap8 = false;
        // 获得等级 1
        await new Promise((res, rej) => {
            db.query(
                `SELECT ref_code, vip_user, created_at, pricePlay FROM users WHERE upline_id = ?`,
                [
                    refForMe
                ], (error, result, fields) => {
                    if (result.length > 0) {
                        result.forEach((ele) => {
                            listData['cap1'].push(ele);
                            cap1 = true;
                        })
                    }
                    res();
                }
            )
        })

        if (cap1) {
            for (let i = 0; i < listData['cap1'].length; i++) {
                await new Promise((resolve, reject) => {
                    db.query(
                        `SELECT ref_code, vip_user, created_at, pricePlay FROM users WHERE upline_id = ?`,
                        [
                            listData['cap1'][i].ref_code
                        ], (error, result, fields) => {
                            if (result.length > 0) {
                                result.forEach((ele) => {
                                    listData['cap2'].push(ele);
                                });
                                cap2 = true;
                            }
                            resolve();
                        }
                    )
                })
            }
        }

        if (cap2) {
            for (let i = 0; i < listData['cap2'].length; i++) {
                await new Promise((resolve, reject) => {
                    db.query(
                        `SELECT ref_code, vip_user, created_at, pricePlay FROM users WHERE upline_id = ?`,
                        [
                            listData['cap2'][i].ref_code
                        ], (error, result, fields) => {
                            if (result.length > 0) {
                                result.forEach((ele) => {
                                    listData['cap3'].push(ele);
                                });
                                cap3 = true;
                            }
                            resolve();
                        }
                    )
                })
            }
        }

        if (cap3) {
            for (let i = 0; i < listData['cap3'].length; i++) {
                await new Promise((resolve, reject) => {

                    db.query(
                        `SELECT ref_code, vip_user, created_at, pricePlay FROM users WHERE upline_id = ?`,
                        [
                            listData['cap3'][i].ref_code
                        ], (error, result, fields) => {
                            if (result.length > 0) {
                                result.forEach((ele) => {
                                    listData['cap4'].push(ele);
                                });
                                cap4 = true;
                            }
                            resolve();
                        }
                    )
                })
            }
        }

        if (cap4) {
            for (let i = 0; i < listData['cap4'].length; i++) {
                await new Promise((resolve, reject) => {
                    db.query(
                        `SELECT ref_code, vip_user, created_at, pricePlay FROM users WHERE upline_id = ?`,
                        [
                            listData['cap4'][i].ref_code
                        ], (error, result, fields) => {
                            if (result.length > 0) {
                                result.forEach((ele) => {
                                    listData['cap5'].push(ele);
                                });
                                cap5 = true;
                            }
                            resolve();
                        }
                    )
                })
            }
        }

        if (cap5) {
            for (let i = 0; i < listData['cap5'].length; i++) {
                await new Promise((resolve, reject) => {
                    db.query(
                        `SELECT ref_code, vip_user, created_at, pricePlay FROM users WHERE upline_id = ?`,
                        [
                            listData['cap5'][i].ref_code
                        ], (error, result, fields) => {
                            if (result.length > 0) {
                                result.forEach((ele) => {
                                    listData['cap6'].push(ele);
                                });
                                cap6 = true;
                            }
                            resolve();
                        }
                    )
                })
            }
        }

        if (cap6) {
            for (let i = 0; i < listData['cap6'].length; i++) {
                await new Promise((resolve, reject) => {
                    db.query(
                        `SELECT ref_code, vip_user, created_at, pricePlay FROM users WHERE upline_id = ?`,
                        [
                            listData['cap6'][i].ref_code
                        ], (error, result, fields) => {
                            if (result.length > 0) {
                                result.forEach((ele) => {
                                    listData['cap7'].push(ele);
                                });
                                cap7 = true;
                            }
                            resolve();

                        }
                    )
                })
            }
        }

        if (cap7) {
            for (let i = 0; i < listData['cap7'].length; i++) {
                await new Promise((resolve, reject) => {
                    db.query(
                        `SELECT ref_code, vip_user, created_at, pricePlay FROM users WHERE upline_id = ?`,
                        [
                            listData['cap7'][i].ref_code
                        ], (error, result, fields) => {
                            if (result.length > 0) {
                                result.forEach((ele) => {
                                    listData['cap8'].push(ele);
                                });
                                cap8 = true;
                            }
                            resolve();

                        }
                    )
                })
            }
        }
        let TSNGD = 0,
            TSDL = 0,
            TSNGDTN = 0, // 本月交易者总数
            TSNGDTT = 0, // 上月总交易员
            TSDLM = 0, // 本月新任总代理
            TSDLTT = 0, // 上个月新任总代理
            tslgdCD1_local = 0, // 低于本月总交易量
            tslgdCD2_local = 0,
            tslgdCD3_local = 0,
            tslgdCD4_local = 0;

        const listUplineID = [];

        for (let l in listData) {
            let d = listData[l];
            if (d.length > 0) {
                TSNGD += d.length;
                for (let i = 0; i < d.length; i++) {
                    listUplineID.push(d[i].ref_code);

                    const monthByTSNGD = moment(d[i].created_at).month();

                    tslgdCD1_local += await new Promise((resolve, reject) => {
                        db.query(
                            `SELECT SUM(personal_trading_volume) AS tslgdCD FROM commission_history WHERE upline_id = ? AND type = ? AND MONTH(created_at) = MONTH(NOW())`,
                            [
                                d[i].ref_code,
                                'klgd'
                            ], (error, results, fields) => {
                                if (error) {
                                    reject(error);
                                }
                                resolve(Number.parseFloat(results[0].tslgdCD) || 0);
                            })

                    });

                    tslgdCD2_local += await new Promise((resolve, reject) => {
                        db.query(
                            `SELECT SUM(personal_trading_volume) AS tslgdCD FROM commission_history WHERE upline_id = ? AND type = ? AND MONTH(created_at) = MONTH(NOW()) - 1`,
                            [
                                d[i].ref_code,
                                'klgd'
                            ], (error, results, fields) => {
                                if (error) {
                                    reject(error);
                                }
                                resolve(Number.parseFloat(results[0].tslgdCD) || 0);
                            })

                    });

                    tslgdCD3_local += await new Promise((resolve, reject) => {
                        db.query(
                            `SELECT SUM(personal_trading_volume) AS tslgdCD FROM commission_history WHERE upline_id = ? AND type = ? AND MONTH(created_at) = MONTH(NOW()) - 2`,
                            [
                                d[i].ref_code,
                                'klgd'
                            ], (error, results, fields) => {
                                if (error) {
                                    reject(error);
                                }
                                resolve(Number.parseFloat(results[0].tslgdCD) || 0);
                            })

                    });

                    tslgdCD4_local += await new Promise((resolve, reject) => {
                        db.query(
                            `SELECT SUM(personal_trading_volume) AS tslgdCD FROM commission_history WHERE upline_id = ? AND type = ? AND MONTH(created_at) = MONTH(NOW()) - 3`,
                            [
                                d[i].ref_code,
                                'klgd'
                            ], (error, results, fields) => {
                                if (error) {
                                    reject(error);
                                }
                                resolve(Number.parseFloat(results[0].tslgdCD) || 0);
                            })

                    });

                    const currentMonthTSNGD = moment().month();
                    const currentLastMonthTSNGD = moment().subtract(1, 'months').month();
                    const currentLastMonthTSNGD2 = moment().subtract(2, 'months').month();
                    const currentLastMonthTSNGD3 = moment().subtract(3, 'months').month();

                    if (currentMonthTSNGD === monthByTSNGD) {
                        TSNGDTN += 1;
                    }

                    if (currentLastMonthTSNGD === monthByTSNGD) {
                        TSNGDTT += 1;
                    }

                    if (currentLastMonthTSNGD2 === monthByTSNGD) {
                        tslgdCD3_local += Number.parseFloat(d[i].pricePlay);
                    }

                    if (currentLastMonthTSNGD3 === monthByTSNGD) {
                        tslgdCD4_local += Number.parseFloat(d[i].pricePlay);
                    }

                    if (d[i].vip_user == 1) {
                        if (currentMonthTSNGD === monthByTSNGD) {
                            TSDLM += 1;
                        }

                        if (currentLastMonthTSNGD === monthByTSNGD) {
                            TSDLTT += 1;
                        }

                        TSDL++;
                    }
                }
            }
        }

        obj.tsngd = TSNGD;
        obj.tsdl = TSDL;
        obj.tslgdmtn = TSNGDTN; // 本月交易者总数
        obj.tslgdmtt = TSNGDTT; // 上月交易者总数
        obj.tsdlmtn = TSDLM; // 本月新任总代理
        obj.tsdlmtt = TSDLTT; // 上个月新任总代理
        obj.tslgdCD1 = tslgdCD1_local; // 低于本月总交易量
        obj.tslgdCD2 = tslgdCD2_local; // 上月下属交易总额
        obj.tslgdCD3 = tslgdCD3_local; // 上个月总子交易太
        obj.tslgdCD4 = tslgdCD4_local; // 上个月的子交易总数

        // 我自己
        //==============================
        //==============================
        //==============================
        let listAgent = await new Promise((resolve, reject) => {
            // 自己的代理总数（已购买vip）
            // AND vip_user = ?
            db.query(
                `SELECT email FROM users WHERE upline_id = ? AND vip_user = ?`,
                [
                    refForMe,
                    1
                ], (error, results, fields) => {
                    if (error) {
                        resolve([]);
                    }
                    if (results[0]) {
                        obj.tsdlisMe = results.length
                    }
                    resolve(results);
                })

        })


        await new Promise((resolve, reject) => {
            // 本周我的总代理佣金
            let min = 0;
            let max = listAgent.length;
            if (max == 0) resolve();
            let totalDLVip = obj.tsdlisMe
            listAgent.forEach(function (item) {
                //SELECT SUM(personal_trading_volume) AS hhttisMe FROM commission_history WHERE upline_id = ? AND WEEKOFYEAR(created_at) = WEEKOFYEAR(NOW())
                db.query(
                    `SELECT SUM(amount_bet) AS hhttisMe FROM bet_history WHERE email = ? AND type_account = ? AND marketing = ? AND WEEKOFYEAR(created_at) = WEEKOFYEAR(NOW())`,
                    [
                        item.email, // f1代理代码
                        1,
                        0
                        //refForMe,
                    ], (error, results, fields) => {
                        if (error) {
                            resolve([]);
                        }
                        if (!!results[0].hhttisMe) {
                            min++;
                            let hhTuanNay = obj.hhttisMe += Number.parseFloat(results[0].hhttisMe);
                            // 如果总佣金足够，则更新VIP级别
                            if (lvVip <= 8) {
                                if (totalDLVip == 3 && hhTuanNay >= 2000) {
                                    db.query(`UPDATE users SET level_vip = 2 WHERE ref_code = ?`, [refForMe])
                                } else if (totalDLVip == 4 && hhTuanNay >= 4000) {
                                    db.query(`UPDATE users SET level_vip = 3 WHERE ref_code = ?`, [refForMe])
                                } else if (totalDLVip == 5 && hhTuanNay >= 8000) {
                                    db.query(`UPDATE users SET level_vip = 4 WHERE ref_code = ?`, [refForMe])
                                } else if (totalDLVip == 6 && hhTuanNay >= 16000) {
                                    db.query(`UPDATE users SET level_vip = 5 WHERE ref_code = ?`, [refForMe])
                                } else if (totalDLVip == 7 && hhTuanNay >= 32000) {
                                    db.query(`UPDATE users SET level_vip = 6 WHERE ref_code = ?`, [refForMe])
                                } else if (totalDLVip == 8 && hhTuanNay >= 64000) {
                                    db.query(`UPDATE users SET level_vip = 7 WHERE ref_code = ?`, [refForMe])
                                } else if (totalDLVip == 9 && hhTuanNay >= 128000) {
                                    db.query(`UPDATE users SET level_vip = 8 WHERE ref_code = ?`, [refForMe])
                                }
                            }
                            if (min == max) resolve();
                        } else {
                            resolve();
                        }
                    })
            });
        })

        // 取4个月以下的交易总数
        let currentDate = new Date()
        //let thangnay =  new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
        let cach1thang = new Date(currentDate.getFullYear(), currentDate.getMonth())
        let cach2thang = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
        let cach3thang = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2)
        let cach4thang = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3)

        obj.t1 = cach1thang
        obj.t2 = cach2thang
        obj.t3 = cach3thang
        obj.t4 = cach4thang
        //================================================
        // 这个月
        await new Promise((resolve, reject) => {
            // 新交易者总数
            for (let a = 0; a < 4; a++) {
                db.query(
                    `select COUNT(id) AS tsngdMoi 
                    FROM users WHERE upline_id IN (?) AND marketing = ? AND pricePlay > 0 AND WEEKOFYEAR(created_at) = WEEKOFYEAR(NOW()) - ?`,
                    [
                        listUplineID,
                        0,
                        a
                    ], (error, results, fields) => {
                        if (error) {
                            resolve([]);
                        }

                        if (Array.isArray(results) && void 0 !== results[0].tsngdMoi) {
                            obj['tsngdMoi' + a] = results[0].tsngdMoi;
                        } else {
                            obj['tsngdMoi' + a] = 0;
                        }
                        if (a === 3) resolve();
                    })

            }
        })
        await new Promise((resolve, reject) => {
            // 今天新经销商总数
            for (let b = 0; b < 4; b++) {
                db.query(
                    `select 
                    COUNT(vip_user) AS tsdlMoi 
                    FROM users WHERE upline_id IN (?) AND vip_user = 1 AND marketing = ? AND WEEKOFYEAR(created_at) = WEEKOFYEAR(NOW()) - ?`,
                    [
                        listUplineID,
                        0,
                        b
                    ], (error, results, fields) => {
                        if (error) {
                            resolve([]);
                        }
                        if (Array.isArray(results) && void 0 !== results[0].tsdlMoi) {
                            obj['tsdlMoi' + b] = results[0].tsdlMoi;
                        } else {
                            obj['tsdlMoi' + b] = 0;
                        }

                        if (b === 3) resolve();
                    })

            }
        })
        await new Promise((resolve, reject) => {
            // 今天的新佣金总数
            for (let c = 0; c < 4; c++) {
                db.query(
                    `select 
                    COUNT(pending_commission) AS tshhMoi 
                    FROM commission_history WHERE upline_id IN (?) AND WEEKOFYEAR(created_at) = WEEKOFYEAR(NOW()) - ?`,
                    [
                        listUplineID,
                        c
                    ], (error, results, fields) => {
                        if (error) {
                            resolve([]);
                        }
                        if (Array.isArray(results) && void 0 !== results[0].tshhMoi) {
                            obj['tshhMoi' + c] = results[0].tshhMoi;
                        } else {
                            obj['tshhMoi' + c] = 0;
                        }
                        if (c === 3) resolve();

                    })

            }
        })
        //================================================
        // 上个月
        await new Promise((resolve, reject) => {
            // 上月新增交易员总数
            //select
            //COUNT(personal_trading_volume) AS tsngdMoi
            //FROM commission_history WHERE upline_id = ?
            for (let d = 0; d < 4; d++) {
                db.query(
                    `select COUNT(id) AS tsngdMoi 
                    FROM users WHERE upline_id IN (?) AND marketing = ? AND pricePlay > 0 AND WEEKOFYEAR(created_at) = WEEKOFYEAR(NOW()) - ? AND MONTH(created_at) = MONTH(NOW()) - 1`,
                    [
                        listUplineID,
                        0,
                        d
                    ], (error, results, fields) => {
                        if (error) {
                            resolve([]);
                        }
                        if (Array.isArray(results) && void 0 !== results[0].tsngdMoi) {
                            obj['tsngdTTMoi' + d] = results[0].tsngdMoi;
                        } else {
                            obj['tsngdTTMoi' + d] = 0;
                        }
                        if (d === 3) resolve();
                    })

            }
        })
        await new Promise((resolve, reject) => {
            // 上月新增经销商总数
            for (let f = 0; f < 4; f++) {
                db.query(
                    `select 
                    COUNT(vip_user) AS tsdlMoi 
                    FROM users WHERE upline_id IN (?) AND vip_user = 1 AND marketing = ? AND WEEKOFYEAR(created_at) = WEEKOFYEAR(NOW()) - ? AND MONTH(created_at) = MONTH(NOW()) - 1`,
                    [
                        listUplineID,
                        0,
                        f
                    ], (error, results, fields) => {
                        if (error) {
                            resolve([]);
                        }
                        if (Array.isArray(results) && void 0 !== results[0].tsdlMoi) {
                            obj['tsdlTTMoi' + f] = results[0].tsdlMoi;
                        } else {
                            obj['tsdlTTMoi' + f] = 0;
                        }
                        if (f === 3) resolve();
                    })

            }
        })
        await new Promise((resolve, reject) => {
            // 上个月新佣金总额
            for (let g = 0; g < 4; g++) {
                db.query(
                    `select 
                    COUNT(pending_commission) AS tshhMoi 
                    FROM commission_history WHERE upline_id IN (?) AND WEEKOFYEAR(created_at) = WEEKOFYEAR(NOW()) - ? AND MONTH(created_at) = MONTH(NOW()) - 1`,
                    [
                        listUplineID,
                        g
                    ], (error, results, fields) => {
                        if (error) {
                            resolve([]);
                        }
                        if (Array.isArray(results) && void 0 !== results[0].tshhMoi) {
                            obj['tshhTTMoi' + g] = results[0].tshhMoi;
                        } else {
                            obj['tshhTTMoi' + g] = 0;
                        }
                        if (g === 3) resolve();
                    })

            }

        })

        return callback(null, obj);
    },


    getBoStatistics: async (email, callback) => {
        // 获取电子邮件的真实帐户

        var obj = {
            //bet_amount: order_amount,
            down: 0, // 销售数量
            down_rate: 0, // 卖出率

            lose: 0,
            profits: 0, // 利润
            refund: 0, // 退款
            revenue: 0, // 总收入

            trades: 0, // 交易总额


            up: 0, // 购买次数
            up_rate: 0, // 购买率

            win: 0,
            win_rate: 0
        }, uid = 0;
        await new Promise((resolve, reject) => {
            db.query(
                `select * from account where email = ? and type = 1`,
                [
                    email
                ],
                (error, results, fields) => {
                    if (results.length === 0) {
                        //return callback(null);
                        return resolve()
                    }
                    let rs = results[0];
                    uid = rs.u_id;

                    let win = rs.win;
                    let lose = rs.lose;
                    //let withdrawal = results[0].withdrawal
                    //let deposit = results[0].deposit
                    let order_amount = rs.order_amount;

                    let total = win + lose;

                    let rateWin = (win / total) * 100;

                    obj.profits = win - lose; // 利润
                    obj.revenue = win; // 总收入

                    obj.trades = order_amount; // 交易总额
                    obj.win_rate = rateWin
                    resolve();
                })
        })
        if (uid == 0) {
            return callback(null);
        }
        await new Promise((resolve, reject) => {
            // 取胜负总数
            db.query(
                `SELECT 
                COUNT(amount_win) AS totalWin
                FROM bet_history WHERE id_account = ? AND type_account = 1 AND amount_win > 0`,
                [
                    uid
                ], (error, result, fields) => {
                    if (error) {
                        return callback(error);
                    }

                    obj.win = result[0].totalWin
                    resolve();
                })
        })
        await new Promise((resolve, reject) => {
            db.query(
                `SELECT 
                COUNT(amount_lose) AS totalLose
                FROM bet_history WHERE id_account = ? AND type_account = 1 AND amount_lose > 0`,
                [
                    uid
                ], (error, result, fields) => {
                    if (error) {
                        return callback(error);
                    }

                    obj.lose = result[0].totalLose
                    resolve();
                })

        })
        await new Promise((resolve, reject) => {
            db.query(
                `SELECT 
                COUNT(buy_sell) AS totalBUY
                FROM bet_history WHERE id_account = ? AND buy_sell = ? AND type_account = 1`,
                [
                    uid,
                    'buy'
                ], (error, result, fields) => {
                    if (error) {
                        return callback(error);
                    }
                    obj.up = result[0].totalBUY
                    resolve();
                })
        })
        await new Promise((resolve, reject) => {
            db.query(
                `SELECT 
                COUNT(buy_sell) AS totalSell
                FROM bet_history WHERE id_account = ?  AND buy_sell = ? AND type_account = 1`,
                [
                    uid,
                    'sell'
                ], (error, result, fields) => {
                    if (error) {
                        return callback(error);
                    }

                    obj.down = result[0].totalSell

                    let tt = obj.up + obj.down

                    let rateUp = (obj.up / tt) * 100

                    obj.up_rate = rateUp
                    resolve();
                })
        })

        return callback(null, obj);
    },

    getBoStatisticsCurrentDay: async (email, callback) => {
        const obj = {
            win: 0,
            lose: 0,
        };
        await new Promise((resolve, reject) => {
            // 取胜负总数
            db.query(
                `SELECT 
                SUM(amount_bet) AS totalWin
                FROM bet_history WHERE email = ? AND type_account = 1 AND amount_win > 0 AND CAST(created_at AS DATE) = CAST(CURRENT_DATE() AS DATE)`,
                [email], (error, result, fields) => {
                    if (error) {
                        return callback(error);
                    }

                    obj.win = result[0].totalWin || 0;
                    resolve();
                })
        })
        await new Promise((resolve, reject) => {
            db.query(
                `SELECT 
                SUM(amount_lose) AS totalLose
                FROM bet_history WHERE email = ? AND type_account = 1 AND amount_lose > 0 AND CAST(created_at AS DATE) = CAST(CURRENT_DATE() AS DATE)`,
                [email], (error, result, fields) => {
                    if (error) {
                        return callback(error);
                    }

                    obj.lose = result[0].totalLose || 0;
                    resolve();
                })

        })

        return callback(null, obj);
    },

    getListHisOrder: (email, callback) => {
        // 获取电子邮件的真实帐户
        db.query(
            `select u_id from account where email = ? and type = 1`,
            [
                email
            ],
            (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                if (results.length === 0) {
                    return callback(null, results[0])
                }
                let rs = results[0]
                var uid = rs.u_id

                // 获取真实账户订单列表
                db.query(
                    `select 
                        amount_bet as ab,
                        amount_lose as al,
                        amount_win as aw,
                        buy_sell as bs,
                        close as c,
                        open as o,
                        created_at as d,
                        session as oss,
                        currency as cu from bet_history where id_account = ? and type_account = 1 ORDER BY id DESC LIMIT 20`,
                    [
                        uid
                    ],
                    (error, results, fields) => {
                        if (error) {
                            return callback(error);
                        }

                        return callback(null, results)


                    })

            })

    },

    getListHisOrderDate: (data, callback) => {
        // 获取电子邮件的真实帐户
        db.query(
            `select u_id from account where email = ? and type = 1`,
            [
                data.email
            ],
            (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                if (!results) {
                    return callback(null, results[0])
                }
                let rs = results[0]
                let uid = rs.u_id

                // 获取真实账户订单列表
                db.query(
                    `SELECT 
                        amount_bet as ab,
                        amount_lose as al,
                        amount_win as aw,
                        buy_sell as bs,
                        close as c,
                        open as o,
                        created_at as d,
                        session as oss,
                        currency as cu FROM bet_history WHERE (id_account = ? and type_account = 1) AND (created_at >= ? AND created_at < ?) ORDER BY id DESC`,
                    [
                        uid,
                        data.s,
                        data.e + ' 23:59:59'
                    ],
                    (error, results, fields) => {
                        if (error) {
                            return callback(error);
                        }

                        return callback(null, results)


                    })

            })

    },


    getListHisTradeWallet: (nick, callback) => {

        db.query(
            `SELECT * FROM trade_history WHERE from_u = ? OR to_u = ? ORDER BY id DESC LIMIT 10`,
            [
                nick,
                nick
            ],
            (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                // 总回收率
                db.query(
                    `SELECT COUNT(from_u) AS totalCount FROM trade_history WHERE from_u = ? OR to_u = ?`,
                    [
                        nick,
                        nick
                    ],
                    (error, result, fields) => {
                        if (error) {
                            return callback(error);
                        }
                        results['count'] = result[0].totalCount
                        return callback(null, results)
                    })
            })

    },

    getListHisTradeWalletPage: (data, callback) => {
        // 获取电子邮件的真实帐户
        let count_per_page = 10;
        let page_number = Number(data.page)
        if (page_number == 1) page_number = 0
        let next_offset = (page_number - 1) * count_per_page

        db.query(
            `SELECT * FROM trade_history WHERE from_u = ? AND type_key != ? ORDER BY id DESC LIMIT ? OFFSET ? `,
            [
                data.nick,
                'hh',
                count_per_page,
                next_offset > 0 ? next_offset : 0
            ],
            (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                return callback(null, results)
            })
    },


    getListHisTradeWalletHH: (email, callback) => {
        db.query(
            `SELECT ref_code FROM users WHERE email = ?`,
            [
                email,
            ], (error, res, fields) => {
                let ref_id = res[0].ref_code;
                // 获取电子邮件的真实帐户
                db.query(
                    `SELECT * FROM commission_history WHERE (upline_id = ? AND type = ?) OR (ref_id = ? AND type = ?) ORDER BY id DESC LIMIT 10`,
                    [
                        ref_id,
                        'hhv',
                        ref_id,
                        'klgd',
                    ],
                    (error, results, fields) => {
                        if (error) {
                            return callback(error);
                        }
                        results['count'] = results.length;
                        return callback(null, results)
                    })
            })
    },


    getListHisTradeWalletHHPage: (data, callback) => {
        // 获取电子邮件的真实帐户
        let count_per_page = 10;
        let page_number = Number(data.page)
        if (page_number == 1) page_number = 0
        let next_offset = page_number * count_per_page
        db.query(
            `SELECT ref_code FROM users WHERE email = ?`,
            [
                data.email,
            ], (error, res, fields) => {
                let ref_id = res[0].ref_code;
                db.query(
                    `SELECT * FROM commission_history WHERE (upline_id = ? AND type = ?) OR (ref_id = ? AND type = ?) ORDER BY id DESC LIMIT ? OFFSET ?`,
                    [
                        ref_id,
                        'hhv',
                        ref_id,
                        'klgd',
                        count_per_page,
                        next_offset
                    ],
                    (error, results, fields) => {
                        if (error) {
                            return callback(error);
                        }
                        return callback(null, results)
                    })
            })

    },


    getListHisTradeWalletWGD: (nick, callback) => {
        // 获取电子邮件的真实帐户
        db.query(
            `SELECT * FROM trade_history WHERE (from_u = ? OR to_u = ?) AND (type_key = ? OR type_key = ?) ORDER BY id DESC LIMIT 10`,
            [
                nick,
                nick,
                'ctas',
                'ctsa'
            ],
            (error, results, fields) => {
                if (error) {
                    return callback(error);
                }

                // 总回收率
                db.query(
                    `SELECT COUNT(from_u) AS totalCount FROM trade_history WHERE (from_u = ? OR to_u = ?) AND (type_key = ? OR type_key = ?)`,
                    [
                        nick,
                        nick,
                        'ctas',
                        'ctsa'
                    ],
                    (error, result, fields) => {
                        if (error) {
                            return callback(error);
                        }
                        results['count'] = result[0].totalCount
                        return callback(null, results)
                    })
            })

    },

    getListHisTradeWalletWGDPage: (data, callback) => {
        // 获取电子邮件的真实帐户
        let count_per_page = 10;
        let page_number = Number(data.page)
        if (page_number == 1) page_number = 0
        let next_offset = page_number * count_per_page

        db.query(
            `SELECT * FROM trade_history WHERE from_u = ? AND type_key = ? OR type_key = ? ORDER BY id DESC LIMIT ? OFFSET ? `,
            [
                data.nick,
                'ctas',
                'ctsa',
                count_per_page,
                next_offset
            ],
            (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                return callback(null, results)
            })
    },


    getComDetails: (email, callback) => {
        // 拿
        db.query(
            `select ref_code from users where email = ?`,
            [
                email
            ],
            (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                if (!results) {
                    return callback(null, results[0])
                }
                let rs = results[0]
                let uid = rs.ref_code

                db.query(
                    `SELECT 
                        SUM(pending_commission) AS thanhtoan, 
                        COUNT(pending_commission) AS soluongGD,
                        COUNT(upline_id) AS sonhaGD,
                        created_at AS dt 
                        FROM commission_history WHERE upline_id = ? GROUP BY DAY(created_at) ORDER BY id DESC LIMIT 10`,
                    [
                        uid
                    ],
                    (error, results, fields) => {
                        if (error) {
                            return callback(error);
                        }

                        // 总回收率
                        db.query(
                            `SELECT 
                                COUNT(pending_commission) AS totalCount 
                                FROM commission_history WHERE upline_id = ? GROUP BY DAY(created_at) ORDER BY id DESC`,
                            [
                                uid
                            ],
                            (error, result, fields) => {
                                if (error) {
                                    return callback(error);
                                }
                                if (result.length != 0) {
                                    results['count'] = result[0].totalCount
                                } else {
                                    results['count'] = 0
                                }

                                return callback(null, results)
                            })
                    })

            })


    },

    getComDetailsPage: (data, callback) => {
        // 获取电子邮件的真实帐户
        let count_per_page = 10;
        let page_number = Number(data.page)
        if (page_number == 1) page_number = 0
        let next_offset = page_number * count_per_page

        // 获取电子邮件的真实帐户
        db.query(
            `select ref_code from users where email = ?`,
            [
                data.email
            ],
            (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                if (!results) {
                    return callback(null, results[0])
                }
                let rs = results[0]
                let uid = rs.ref_code

                db.query(
                    `SELECT 
                        SUM(pending_commission) AS thanhtoan, 
                        COUNT(pending_commission) AS soluongGD,
                        COUNT(upline_id) AS sonhaGD,
                        created_at AS dt 
                        FROM commission_history WHERE upline_id = ? GROUP BY DAY(created_at) ORDER BY id DESC LIMIT ? OFFSET ? `,
                    [
                        uid,
                        count_per_page,
                        next_offset
                    ],
                    (error, results, fields) => {
                        if (error) {
                            return callback(error);
                        }
                        return callback(null, results)

                    })

            })
    },

    getComDetailsDate: async (data, callback) => {
        let Rs = [];

        await new Promise((res, rej) => {
            // 拿
            db.query(
                `select ref_code from users where email = ?`,
                [
                    data.email
                ],
                (error, results, fields) => {
                    if (error) {
                        //return callback(error);
                        res(Rs);
                    }
                    if (!results) {
                        //return callback(null, results[0])
                        res(Rs);
                    }
                    let rs = results[0];
                    let uid = rs.ref_code;

                    let daysBetween = (Date.parse(data.e) - Date.parse(data.s)) / (24 * 3600 * 1000)

                    if (daysBetween < 0) {
                        //return callback(null, Rs)
                        res(Rs);
                    }

                    daysBetween++; // 加 1 天

                    let min = 0;

                    if (data.t == 1) {
                        // 交易佣金量
                        for (let i = 0; i < daysBetween; i++) {
                            db.query(
                                `SELECT 
                                    SUM(pending_commission) AS thanhtoan, 
                                    SUM(personal_trading_volume) AS klgd,
                                    COUNT(pending_commission) AS soluongGD,
                                    DATE_FORMAT(created_at, '%Y-%m-%d') AS dt 
                                    FROM commission_history WHERE type = ? AND ref_id = ? AND DAY(created_at) = DAY(?) - ? GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')`,
                                [
                                    'klgd', // 交易佣金
                                    uid,
                                    data.e,
                                    i
                                ],
                                (error, results, fields) => {
                                    if (error) {
                                        //return callback(error);
                                        res(Rs);
                                    }
                                    min++;
                                    if (Array.isArray(results) && results.length > 0) Rs.push(results[0]);
                                    if (min == daysBetween) res();
                                })
                        }
                    } else {
                        // 交易 VIP 佣金量
                        for (let i = 0; i < daysBetween; i++) {
                            db.query(
                                `SELECT 
                                    SUM(vip_commission) AS doanhso, 
                                    created_at AS dt 
                                    FROM commission_history WHERE type = ? AND ref_id = ? AND DAY(created_at) = DAY(?) - ? GROUP BY DAY(created_at)`,
                                [
                                    'hhv',
                                    uid,
                                    data.e,
                                    i
                                ],
                                (error, results, fields) => {
                                    if (error) {
                                        res(error);
                                    }
                                    min++;
                                    if (results.length > 0) Rs.push(results[0])
                                    if (min == daysBetween) res();
                                })
                        }
                    }

                })
        })
        return callback(null, Rs);
    },

    getAgencySearchLevel: async (data, callback) => {

        let dt = moment().tz("Asia/Ho_Chi_Minh");
        let dt1 = moment().tz("Asia/Ho_Chi_Minh");
        let dt2 = moment().tz("Asia/Ho_Chi_Minh");

        let cach30ngay = dt.subtract(30, 'days').format("YYYY-MM-DD");
        let cach7ngay = dt1.subtract(7, 'days').format("YYYY-MM-DD");
        let cach1ngay = dt2.subtract(1, 'days').format("YYYY-MM-DD");


        //let currentDate = new Date()
        //let cach30ngay =  new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDay() - 30)
        //let cach7ngay =  new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDay() - 7)
        //let cach1ngay =  new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDay() - 1)

        //let c30n =  cach30ngay.getFullYear() + '-' + cach30ngay.getMonth() + '-' + cach30ngay.getDay()
        //let c7n =  cach7ngay.getFullYear() + '-' + cach7ngay.getMonth() + '-' + cach7ngay.getDay()
        //let c1n =  cach1ngay.getFullYear() + '-' + cach1ngay.getMonth() + '-' + cach1ngay.getDay()

        let c30n = cach30ngay;
        let c7n = cach7ngay;
        let c1n = cach1ngay;

        let n = data.kc, ac = 0;

        if (n == 30) {
            ac = c30n;
        } else if (n == 7) {
            ac = c7n;
        } else if (n == 1) {
            ac = c1n;
        } else {
            ac = 0;
        }

        let refID, UpID, listCap = [];
        let Level = data.id;
        // 获取我的 7 名下属的名单
        let listData = {
            "cap1": [],
            "cap2": [],
            "cap3": [],
            "cap4": [],
            "cap5": [],
            "cap6": [],
            "cap7": [],
            "cap8": [],
            "cap9": [],
            "cap10": [],
            "cap11": [],
            "cap12": [],
            "cap13": [],
            "cap14": [],
            "cap15": []
        };

        await new Promise((res, rej) => {
            db.query(
                `SELECT upline_id, ref_code FROM users WHERE email = ?`,
                [
                    data.email
                ],
                (error, results, fields) => {
                    if (error) {
                        res([]);
                    }
                    if (!results) {
                        res([]);
                    }
                    let rs = results[0];
                    refID = rs.ref_code; // 我的参考代码
                    UpID = rs.upline_id;
                    res();
                }
            )


        });

        // let dataList = await new Promise((res, rej) => {
        // 	//SELECT  upline_id, ref_code
        // 	//FROM (SELECT * FROM users
        //     //            ORDER BY upline_id) users_sorted,
        //     //            (SELECT @pv := 'RYIFCWS') initialisation
        //     //    WHERE find_in_set(upline_id, @pv)
        //     //    AND length(@pv := concat(@pv, ',', ref_code));

        //     db.query(`with recursive cte (level_vip, tklgd, ref_code, upline_id, nick_name) as (
        // 			  select     level_vip,
        // 						 pricePlay,
        // 						 ref_code,
        // 						 upline_id,
        // 						 nick_name
        // 			  from       users
        // 			  where      upline_id = ?
        // 			  union all
        // 			  select     p.level_vip,
        // 						 p.pricePlay,
        // 						 p.ref_code,
        // 						 p.upline_id,
        // 						 p.nick_name
        // 			  from       users p
        // 			  inner join cte
        // 					  on p.upline_id = cte.ref_code
        // 			)
        // 			select * from cte;`,
        //         [
        // 			refID
        // 		], (error, result, fields) => {
        // 			//console.log(result);
        //             //let count = result.length;
        //             //if(count > 0){
        //                 res(result)
        //             //}
        //         }
        //     )

        // });

        let cap1 = false, cap2 = false, cap3 = false, cap4 = false, cap5 = false, cap6 = false, cap7 = false;
        // 获得1级
        await new Promise((res, rej) => {
            db.query(
                `SELECT level_vip, pricePlay AS tklgd, ref_code, upline_id, nick_name FROM users WHERE upline_id = ?`,
                [
                    refID
                ], (error, result, fields) => {
                    if (result.length > 0) {
                        result.forEach((ele) => {
                            listData['cap1'].push(ele);
                        })
                        cap1 = true;
                    }
                    res();
                }
            )
        })


        if (cap1) {
            for (let i = 0; i < listData['cap1'].length; i++) {
                await new Promise((resolve, reject) => {

                    db.query(
                        `SELECT level_vip, pricePlay AS tklgd, ref_code, upline_id, nick_name FROM users WHERE upline_id = ?`,
                        [
                            listData['cap1'][i].ref_code
                        ], (error, result, fields) => {
                            if (result.length > 0) {
                                result.forEach((ele) => {
                                    listData['cap2'].push(ele);
                                });
                                cap2 = true;
                            }
                            resolve();
                        }
                    )
                })
            }
        }

        if (cap2) {
            for (let i = 0; i < listData['cap2'].length; i++) {
                await new Promise((resolve, reject) => {

                    db.query(
                        `SELECT level_vip, pricePlay AS tklgd, ref_code, upline_id, nick_name FROM users WHERE upline_id = ?`,
                        [
                            listData['cap2'][i].ref_code
                        ], (error, result, fields) => {
                            if (result.length > 0) {
                                result.forEach((ele) => {
                                    listData['cap3'].push(ele);
                                });
                                cap3 = true;
                            }
                            resolve();
                        }
                    )
                })
            }
        }

        if (cap3) {
            for (let i = 0; i < listData['cap3'].length; i++) {
                await new Promise((resolve, reject) => {

                    db.query(
                        `SELECT level_vip, pricePlay AS tklgd, ref_code, upline_id, nick_name FROM users WHERE upline_id = ?`,
                        [
                            listData['cap3'][i].ref_code
                        ], (error, result, fields) => {
                            if (result.length > 0) {
                                result.forEach((ele) => {
                                    listData['cap4'].push(ele);
                                });
                                cap4 = true;
                            }
                            resolve();
                        }
                    )
                })
            }
        }

        if (cap4) {
            for (let i = 0; i < listData['cap4'].length; i++) {
                await new Promise((resolve, reject) => {

                    db.query(
                        `SELECT level_vip, pricePlay AS tklgd, ref_code, upline_id, nick_name FROM users WHERE upline_id = ?`,
                        [
                            listData['cap4'][i].ref_code
                        ], (error, result, fields) => {
                            if (result.length > 0) {
                                result.forEach((ele) => {
                                    listData['cap5'].push(ele);
                                });
                                cap5 = true;
                            }
                            resolve();
                        }
                    )
                })
            }
        }

        if (cap5) {
            for (let i = 0; i < listData['cap5'].length; i++) {
                await new Promise((resolve, reject) => {

                    db.query(
                        `SELECT level_vip, pricePlay AS tklgd, ref_code, upline_id, nick_name FROM users WHERE upline_id = ?`,
                        [
                            listData['cap5'][i].ref_code
                        ], (error, result, fields) => {
                            if (result.length > 0) {
                                result.forEach((ele) => {
                                    listData['cap6'].push(ele);
                                });
                                cap6 = true;
                            }
                            resolve();
                        }
                    )
                })
            }
        }

        if (cap6) {
            for (let i = 0; i < listData['cap6'].length; i++) {
                await new Promise((resolve, reject) => {
                    db.query(
                        `SELECT level_vip, pricePlay AS tklgd, ref_code, upline_id, nick_name FROM users WHERE upline_id = ?`,
                        [
                            listData['cap6'][i].ref_code
                        ], (error, result, fields) => {
                            if (result.length > 0) {
                                result.forEach((ele) => {
                                    listData['cap7'].push(ele);
                                });
                                cap7 = true;
                            } else {
                                cap7 = false;
                            }
                            resolve();

                        }
                    )
                })
            }
        }

        //if(cap7){
        //   for(let i = 0;  i < listData['cap7'].length; i++){
        //       db.query(
        //           `SELECT level_vip, pricePlay AS tklgd, ref_code, upline_id, nick_name FROM users WHERE upline_id = ?`,
        //           [
        //               listData['cap7'][i].ref_code
        //           ], (error, result, fields) => {
        //               if(result.length > 0){
        //                   result.forEach((ele) => {
        //                       listData['cap7'].push(ele);
        //                   });
        //                  //cap7 = true;
        //              }
        //          }
        //      )
        //      await sleep(50);
        //  }
        //}

        // if(dataList.length > 0){
        //     let u = 0, check = '';
        //     dataList.forEach((ele) => {
        // 		if(check != ele.upline_id){
        // 			u++;
        // 			check = ele.upline_id;
        // 		}
        // 		if(u <= 7){
        // 			listData[`cap${u}`].push(ele);
        // 		}

        //     })

        // }

        //await sleep(100);

        for (let i = 0; i < listData[`cap${Level}`].length; i++) {
            let qrr = `SELECT SUM(pending_commission) AS thhn FROM commission_history WHERE ref_id = ? AND type = ? AND created_at > '${mysql_real_escape_string(ac)}'`;
            db.query((qrr),
                [
                    listData[`cap${Level}`][i].ref_code,
                    'klgd'
                ],
                (error2, resu, fields2) => {
                    if (resu[0].thhn !== null) {
                        listData[`cap${Level}`][i].thhn = resu[0].thhn;
                    } else {
                        listData[`cap${Level}`][i].thhn = 0;
                    }

                });
            await sleep(100);

        }


        return callback(null, listData[`cap${Level}`]);

    },


    getAgencySearchName: async (data, callback) => {

        if (data.name == '') return callback(null);

        let dt = moment().tz("Asia/Ho_Chi_Minh");
        let dt1 = moment().tz("Asia/Ho_Chi_Minh");
        let dt2 = moment().tz("Asia/Ho_Chi_Minh");

        let cach30ngay = dt.subtract(30, 'days').format("YYYY-MM-DD");
        let cach7ngay = dt1.subtract(7, 'days').format("YYYY-MM-DD");
        let cach1ngay = dt2.subtract(1, 'days').format("YYYY-MM-DD");

        let c30n = cach30ngay;
        let c7n = cach7ngay;
        let c1n = cach1ngay;

        let n = data.kc, ac = 0;

        if (n == 30) {
            ac = c30n;
        } else if (n == 7) {
            ac = c7n;
        } else if (n == 1) {
            ac = c1n;
        } else {
            ac = 0;
        }

        let listData = await new Promise((res, rej) => {
            db.query(
                `select ref_code from users where email = ?`,
                [
                    data.email
                ],
                (error, results, fields) => {
                    if (error) {
                        res([])
                    }
                    if (!results) {
                        res([])
                    }
                    let rs = results[0]
                    let uid = rs.ref_code; // 我的参考代码
                    let name = data.name

                    let qr = ''

                    // 获取代理信息
                    if (ac == 0) {
                        qr = `select level_vip, pricePlay AS tklgd, nick_name, ref_code from users where nick_name LIKE CONCAT('%${mysql_real_escape_string(name)}%') ORDER BY id DESC`
                    } else {
                        qr = `select level_vip, pricePlay AS tklgd, nick_name, ref_code from users where (nick_name LIKE CONCAT('%${mysql_real_escape_string(name)}%') AND created_at > '${mysql_real_escape_string(ac)}') ORDER BY id DESC`
                    }

                    db.query((qr),
                        [
                            uid
                        ],
                        (error, results, fields) => {
                            if (error) {
                                rej(error);
                            }
                            if (results.length == 0) {
                                return callback(null);
                            }
                            res(results)
                        })

                })
        });

        await new Promise((res, rej) => {
            let qrr = '';
            //if(ac == 0){
            //    qrr = `select SUM(personal_trading_volume) AS thhn from commission_history where ref_id = ? ORDER BY id DESC`
            //}else{
            qrr = `SELECT SUM(pending_commission) AS thhn FROM commission_history WHERE ref_id = ? AND type = ? AND created_at > '${mysql_real_escape_string(ac)}'`
            //}

            let min = 0;
            let max = listData.length;

            if (max == 0) res([]);

            listData.forEach(function (result) {
                // 获取佣金信息 // individual_trading_volume AS thhn,
                db.query((qrr),
                    [
                        result.ref_code,
                        'klgd'
                    ],
                    (error, resu, fields) => {
                        if (void 0 !== resu) listData[min].thhn = resu[0].thhn;
                        min++;
                        if (min == max) res(listData);
                    })
            });
        });

        return callback(null, listData)
    },

    updateSecret2FA: (data, callback) => {
        db.query(
            `UPDATE users SET active_2fa = 1, secret_2fa = ?, code_secure = ? WHERE email = ?`,
            [
                data.s,
                null,
                data.e
            ], (error, results, fields) => {
                if (error) {
                    return error;
                }
                return callback(null, results)
            }
        )
    },

    Disabled2FA: (email, callback) => {
        db.query(
            `UPDATE users SET active_2fa = 0, secret_2fa = null, code_secure = null WHERE email = ?`,
            [
                email
            ], (error, results, fields) => {
                if (error) {
                    return error;
                }
                return callback(null, results)
            }
        )
    },

    updateCodeSecure: (data, callback) => {
        db.query(
            `UPDATE users SET code_secure = ? WHERE email = ?`,
            [
                data.code,
                data.email
            ], (error, results, fields) => {
                if (error) {
                    return error;
                }
                return callback(null, results)
            }
        )
    },

    getSecrect2FA: (email, callback) => {
        db.query(
            `select secret_2fa from users where email = ?`,
            [
                email,
            ], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }

                return callback(null, results[0])
            }
        )
    },

    checkCodeSecure2FA: (data, callback) => {
        db.query(
            `select code_secure, password from users where email = ? AND code_secure = ?`,
            [
                data.email,
                data.code
            ], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }

                return callback(null, results[0])
            }
        )
    },

    getListAnalytics: async (data, callback) => {
        const obj = {
            nNDK: 0, // 用户号码
            nNDXM: 0,  // 验证者数量
            nDL: 0, // 代理号码（VIP会员）
            tsTN: 0, // 存款总额

            tsNNT: 0, // 储户总数

            tsNNT7N: 0, // 近7天内存款人总数
            tsFee: 0, // 费用税
            tsTNFEE: 0, // 总收入（减去税费）
            tsTNPAYPAL: 0, // 用户总收入

            tsTNUSD: 0, // 存款总额 美元
            tsTNBTC: 0, // 比特币存款总额
            tsTNETH: 0, // ETH 充值总额
            tsTNVN: 0 // 存款总额 VN
        }

        await new Promise((res, rej) => {
            //=====================
            db.query(
                `SELECT COUNT(id) as nNDK, 
                    SUM(money_paypal) as tsTNPAYPAL, 
                    SUM(money_eth) as tsTNETH, 
                    SUM(money_btc) as tsTNBTC, 
                    SUM(money_usdt) as tsTNUSD, 
                    SUM(money_vn) as tsTNVN 
                    FROM users WHERE active = 1 AND marketing = 0`, (error, results, fields) => {
                    if (error) {
                        return callback(error);
                    }

                    obj.nNDK = results[0].nNDK
                    obj.tsTNPAYPALN = results[0].tsTNPAYPAL

                    obj.tsTNUSDN = results[0].tsTNUSD;
                    obj.tsTNBTCN = results[0].tsTNBTC;
                    obj.tsTNETHN = results[0].tsTNETH;
                    obj.tsTNVNN = results[0].tsTNVN;
                    res();
                })
        })

        await new Promise((res, rej) => {
            //===================
            db.query(
                `SELECT COUNT(id) as nNDXM FROM users WHERE verified = 1`, (error, results, fields) => {
                    if (error) {
                        return callback(error);
                    }

                    obj.nNDXM = results[0].nNDXM;
                    res();
                })
        })

        await new Promise((res, rej) => {
            //===================
            db.query(
                `SELECT COUNT(id) as nDL FROM users WHERE vip_user = 1`, (error, results, fields) => {
                    if (error) {
                        return callback(error);
                    }

                    obj.nDL = results[0].nDL;
                    res();
                })
        })

        await new Promise((res, rej) => {
            //===================
            //===================
            db.query(
                `SELECT SUM(amount) AS tsTNUSD, SUM(pay_fee) AS Fee, SUM(real_amount) AS tnBNB FROM trade_history WHERE type_key = ? AND status = 1`,
                [
                    'nt'
                ],
                (error, results, fields) => {
                    if (error) {
                        return callback(error);
                    }

                    obj.tsTNUSD = results[0].tsTNUSD;
                    obj.tsFee = results[0].Fee;

                    //let total = results[0].tsTN - results[0].Fee;
                    obj.tsTNThuc = results[0].tnBNB;
                    res();
                })
        })

        await new Promise((res, rej) => {
            //===================
            //===================
            db.query(
                `SELECT COUNT(from_u) as tsNNT FROM trade_history WHERE status = 1 AND type_key = ? GROUP BY from_u`,
                [
                    'nt'
                ]
                , (error, results, fields) => {
                    if (error) {
                        return callback(error);
                    }

                    if (results.length != 0) {
                        obj.tsNNT = results[0].tsNNT;
                    }
                    res();
                })
        })

        await new Promise((res, rej) => {
            //===================
            db.query(
                `SELECT COUNT(from_u) as tsNNT7N FROM trade_history WHERE status = 1 AND type_key = ? AND WEEKOFYEAR(created_at) = WEEKOFYEAR(NOW()) GROUP BY from_u`,
                [
                    'nt'
                ]
                , (error, results, fields) => {
                    if (error) {
                        return callback(error);
                    }

                    obj.tsNNT7N = results.length > 0 ? results[0].tsNNT7N : 0;
                    res();
                })
        })

        await new Promise((res, rej) => {
            //===================
            db.query(
                `SELECT SUM(amount_win) AS tsWin, SUM(amount_lose) AS tsLose FROM bet_history WHERE marketing = ? AND status = 1 AND type_account = ?`,
                [
                    0,
                    1 // 真实账户
                ]
                , (error, results, fields) => {
                    if (error) {
                        return callback(error);
                    }

                    obj.tsWin = results.length > 0 ? results[0].tsWin : 0;
                    obj.tsLose = results.length > 0 ? results[0].tsLose : 0;
                    res();
                })
        })

        await new Promise((res, rej) => {
            //===================
            db.query(
                `SELECT SUM(pending_commission) AS tsHHong FROM commission_history WHERE marketing = ? AND type = ?`,
                [
                    0,
                    'klgd',
                ]
                , (error, results, fields) => {
                    if (error) {
                        return callback(error);
                    }
                    obj.tsHHong = results.length > 0 ? results[0].tsHHong : 0;
                    res();
                })
        })

        return callback(null, obj);

    },

    thongKeGetListF1F7: async (query, callback) => {
        const refForMe = await new Promise((resolve, reject) => {
            db.query(`select ref_code from users where email = ?`, [query.email], (err, data) => {
                if (err) {
                    return reject(err);
                }
                if (Array.isArray(data) && data.length) {
                    return resolve(data[0].ref_code);
                }
                return callback(null, [])
            })
        })

        //========== 仅限交易者总数
        let listData = {
            cap1: [],
            cap2: [],
            cap3: [],
            cap4: [],
            cap5: [],
            cap6: [],
            cap7: [],
            cap8: [],
            cap9: [],
            cap10: [],
            cap11: [],
            cap12: [],
            cap13: [],
            cap14: [],
            cap15: [],
        };

        let cap1 = false,
            cap2 = false,
            cap3 = false,
            cap4 = false,
            cap5 = false,
            cap6 = false,
            cap7 = false,
            cap8 = false;

        const refItems = [];

        // lấy cấp 1
        await new Promise((res, rej) => {
            db.query(
                `SELECT ref_code, email FROM users WHERE upline_id = ?`,
                [refForMe],
                (error, result, fields) => {
                    if (result.length > 0) {
                        result.forEach((ele) => {
                            listData["cap1"].push(ele);
                            refItems.push({ref_code: ele.ref_code, email: ele.email});
                            cap1 = true;
                        });
                    }
                    res();
                }
            );
        });

        if (cap1) {
            for (let i = 0; i < listData["cap1"].length; i++) {
                db.query(
                    `SELECT ref_code, email FROM users WHERE upline_id = ?`,
                    [listData["cap1"][i].ref_code],
                    (error, result, fields) => {
                        if (result.length > 0) {
                            result.forEach((ele) => {
                                listData["cap2"].push(ele);
                                refItems.push({ref_code: ele.ref_code, email: ele.email});
                            });
                            cap2 = true;
                        }
                    }
                );
                await sleep(50);
            }
        }

        if (cap2) {
            for (let i = 0; i < listData["cap2"].length; i++) {
                db.query(
                    `SELECT ref_code, email FROM users WHERE upline_id = ?`,
                    [listData["cap2"][i].ref_code],
                    (error, result, fields) => {
                        if (result.length > 0) {
                            result.forEach((ele) => {
                                listData["cap3"].push(ele);
                                refItems.push({ref_code: ele.ref_code, email: ele.email});
                            });
                            cap3 = true;
                        }
                    }
                );
                await sleep(50);
            }
        }

        if (cap3) {
            for (let i = 0; i < listData["cap3"].length; i++) {
                db.query(
                    `SELECT ref_code, email FROM users WHERE upline_id = ?`,
                    [listData["cap3"][i].ref_code],
                    (error, result, fields) => {
                        if (result.length > 0) {
                            result.forEach((ele) => {
                                listData["cap4"].push(ele);
                                refItems.push({ref_code: ele.ref_code, email: ele.email});
                            });
                            cap4 = true;
                        }
                    }
                );
                await sleep(50);
            }
        }

        if (cap4) {
            for (let i = 0; i < listData["cap4"].length; i++) {
                db.query(
                    `SELECT ref_code, email FROM users WHERE upline_id = ?`,
                    [listData["cap4"][i].ref_code],
                    (error, result, fields) => {
                        if (result.length > 0) {
                            result.forEach((ele) => {
                                listData["cap5"].push(ele);
                                refItems.push({ref_code: ele.ref_code, email: ele.email});
                            });
                            cap5 = true;
                        }
                    }
                );
                await sleep(50);
            }
        }

        if (cap5) {
            for (let i = 0; i < listData["cap5"].length; i++) {
                db.query(
                    `SELECT ref_code, email FROM users WHERE upline_id = ?`,
                    [listData["cap5"][i].ref_code],
                    (error, result, fields) => {
                        if (result.length > 0) {
                            result.forEach((ele) => {
                                listData["cap6"].push(ele);
                                refItems.push({ref_code: ele.ref_code, email: ele.email});
                            });
                            cap6 = true;
                        }
                    }
                );
                await sleep(50);
            }
        }

        if (cap6) {
            for (let i = 0; i < listData["cap6"].length; i++) {
                db.query(
                    `SELECT ref_code, email FROM users WHERE upline_id = ?`,
                    [listData["cap6"][i].ref_code],
                    (error, result, fields) => {
                        if (result.length > 0) {
                            result.forEach((ele) => {
                                listData["cap7"].push(ele);
                                refItems.push({ref_code: ele.ref_code, email: ele.email});
                            });
                            cap7 = true;
                        }
                    }
                );
                await sleep(50);
            }
        }

        if (cap7) {
            for (let i = 0; i < listData["cap7"].length; i++) {
                db.query(
                    `SELECT ref_code, email FROM users WHERE upline_id = ?`,
                    [listData["cap8"][i].ref_code],
                    (error, result, fields) => {
                        if (result.length > 0) {
                            result.forEach((ele) => {
                                listData["cap8"].push(ele);
                                refItems.push({ref_code: ele.ref_code, email: ele.email});
                            });
                            cap8 = true;
                        }
                    }
                );
                await sleep(50);
            }
        }

        if (!refItems.length) {
            return callback(null, [])
        }

        let sql = `select email, sum(amount_win) as tongWin, sum(amount_lose) as tongThua, sum(amount_bet) as tongDatCuoc from bet_history where`;

        if (refItems.length) {
            sql += ' email in (?) and'
        }

        sql += ' type_account = 1'

        let f = '';
        if (void 0 !== query.f) {
            switch (query.f) {
                case 'hom-nay':
                    f = ' and DAY(created_at) = DAY(NOW())'
                    break;
                case 'hom-qua':
                    f = ' and DAY(created_at) = DAY(NOW()) - 1'
                    break;
                case 'tuan-nay':
                    f = ' and WEEK(created_at)=WEEK(now())'
                    break;
                case 'tuan-truoc':
                    f = ' and WEEK(created_at)=WEEK(now()) - 1'
                    break;
                case 'thang-nay':
                    f = ' and MONTH(created_at)=MONTH(now())'
                    break;
                case 'thang-truoc':
                    f = ' and MONTH(created_at)=MONTH(now()) - 1'
                    break;

                default:
                    break;
            }
        }

        if (void 0 !== query.from && void 0 !== query.to) {
            // YYYY-MM-DD
            f += ` and created_at BETWEEN '${query.from}' and '${query.to}'`;
        }

        sql += f;
        sql += ' GROUP BY email'

        let thongKe = await new Promise((resolve, reject) => {
            db.query(sql, [refItems.map((e) => e.email)], ((err, data) => {
                if (err) {
                    reject(err);
                }
                resolve(data);
            }))
        });

        const napRut = await new Promise((resolve, reject) => {
            let sql1 = `SELECT * from trade_history WHERE`;

            if (thongKe.length) {
                sql1 += ' email in (?) and'
            }

            sql1 += ` (type_key = 'nt' OR type_key = 'rt') ${f}`

            db.query(sql1, [thongKe.map((e) => e.email)], ((err, data) => {
                if (err) {
                    reject(err);
                }
                resolve(data);
            }))
        });

        function groupBy(objectArray, property) {
            return objectArray.reduce(function (acc, obj) {
                var key = obj[property];
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(obj);
                return acc;
            }, {});
        }

        if (thongKe.length) {
            const napRutByEmail = groupBy(napRut, 'email');
            thongKe = thongKe.map((e) => {
                e.napRut = napRutByEmail[e.email] || [];
                return e;
            })
        }

        return callback(null, thongKe)
    },

    changeAccType: async (data, callback) => {
        // if (data.type === 1) {
        //     await new Promise((resolve, reject) => {
        //         db.query(`SELECT COUNT(ref_code) as isParent FROM users WHERE ref_code = (select upline_id from users WHERE id = ?)`, [data.id], (err, res) => {
        //             if (err) {
        //                 return reject(err);
        //             }
        //             if (res[0].isParent > 0) {
        //                 return callback(null, -1);
        //             } else {
        //                 return resolve("");
        //             }
        //         })
        //     });
        // }

        db.query(
            `UPDATE users SET marketing = ?, updated_at=now() WHERE id = ?`,
            [
                data.type,
                data.id
            ], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                db.query(
                    `SELECT nick_name FROM users WHERE id = ?`,
                    [
                        data.id
                    ], (error, results, fields) => {
                        let nick = results[0].nick_name;
                        if (data.type == 1) {
                            Tele.sendMessThongBao(`🧑ADMIN vừa thực hiện <i>BẬT</i> Marketing người dùng: <b>${nick}</b>`);
                        } else {
                            Tele.sendMessThongBao(`🧑ADMIN vừa thực hiện <i>TẮT</i> Marketing người dùng: <b>${nick}</b>`);
                        }
                    });
                return callback(null, results)
            }
        )
    },

    changPassAd: (data, callback) => {
        db.query(
            `UPDATE users SET password = ? WHERE id = ?`,
            [
                data.pass,
                1
            ], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                return callback(null, results)
            }
        )
    },

    getLiveAccount: async (ref, callback) => {
        const email = await new Promise((resolve, reject) => {
            db.query(
                `SELECT email FROM users WHERE ref_code = ?`,
                [ref], (error, results, fields) => {
                    if (error) {
                        return reject(error);
                    }
                    return resolve(results[0].email)
                }
            )
        });

        db.query(
            `SELECT * FROM account WHERE email = ?`,
            [email], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                return callback(null, results)
            }
        )
    },

    getSuperior: async (ref, callback) => {
        db.query(
            `SELECT * FROM users WHERE ref_code = ?`,
            [ref], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                if (results.length) {
                    results.forEach(item => {
                        delete item.privateKey_BTC;
                        delete item.wif_BTC;
                        delete item.privateKey_ETH;
                        delete item.privateKey_USDT;
                    });
                }
                return callback(null, results[0])
            }
        )
    },

    getListF1F7: async (data, callback) => {
        let refID = data.ref;
        //let listCap = [];
        // lấy danh sách 7 cấp dưới của mình
        let listData = {
            "cap1": [],
            "cap2": [],
            "cap3": [],
            "cap4": [],
            "cap5": [],
            "cap6": [],
            "cap7": [],
            "cap8": [],
            "cap9": [],
            "cap10": [],
            "cap11": [],
            "cap12": [],
            "cap13": [],
            "cap14": [],
            "cap15": []
        };
        // let listCap = {
        // 	"cap1": [],
        // 	"cap2": [],
        // 	"cap3": [],
        // 	"cap4": [],
        // 	"cap5": [],
        // 	"cap6": [],
        // 	"cap7": []
        // };
        //listCap['cap1'].push(refID);

        let obj = {};

        // let uIdAccount = await new Promise((resolve, reject)=>{
        //     // get account name
        //     db.query(
        //         `SELECT u_id FROM account WHERE email = ? AND type = 1`,
        //         [
        //             data.email
        //         ],
        //         (error, results, fields) => {
        //             if(error){
        //                 return callback(error);
        //             }
        //             resolve(results[0].u_id);
        //         })
        // })

        await new Promise((resolve, reject) => {
            // tổng số lượng giao dịch cấp dưới tháng này
            //SELECT SUM(personal_trading_volume) AS tslgdCD FROM commission_history WHERE from_upid = ? AND ref_id = ? AND MONTH(created_at) = MONTH(NOW())
            db.query(
                `SELECT SUM(personal_trading_volume) AS tslgdCD FROM commission_history WHERE upline_id = ? AND type = ? AND MONTH(created_at) = MONTH(NOW())`,
                [
                    //uIdAccount,
                    refID,
                    'klgd'
                ], (error, results, fields) => {
                    if (error) {
                        resolve([]);
                    }
                    obj.tslgdCD1 = Number.parseFloat(results[0].tslgdCD) || 0;
                    resolve();
                })

        })
        await new Promise((resolve, reject) => {
            // tổng số lượng giao dịch cấp dưới cách 1 tháng

            db.query(
                `SELECT SUM(personal_trading_volume) AS tslgdCD FROM commission_history WHERE upline_id = ? AND type = ? AND MONTH(created_at) = MONTH(NOW()) - 1`,
                [
                    //uIdAccount,
                    refID,
                    'klgd'
                ], (error, results, fields) => {
                    if (error) {
                        resolve([]);
                    }
                    obj.tslgdCD2 = results[0].tslgdCD || 0;
                    resolve();
                })

        })
        await new Promise((resolve, reject) => {

            // tổng số lượng giao dịch cấp dưới cách 2 tháng

            db.query(
                `SELECT SUM(personal_trading_volume) AS tslgdCD FROM commission_history WHERE upline_id = ? AND type = ? AND MONTH(created_at) = MONTH(NOW()) - 2`,
                [
                    //uIdAccount,
                    refID,
                    'klgd'
                ], (error, results, fields) => {
                    if (error) {
                        resolve([]);
                    }
                    obj.tslgdCD3 = results[0].tslgdCD || 0;
                    resolve();
                })


        })
        await new Promise((resolve, reject) => {
            // cách 3 tháng
            db.query(
                `select SUM(personal_trading_volume) AS tslgdCD FROM commission_history WHERE upline_id = ? AND type = ? AND MONTH(created_at) = MONTH(NOW()) - 3`,
                [
                    //uIdAccount,
                    refID,
                    'klgd'
                ], (error, results, fields) => {
                    if (error) {
                        resolve([]);
                    }
                    obj.tslgdCD4 = results[0].tslgdCD || 0;
                    resolve();
                })

        })

        // lấy danh sách 7 cấp
        // let max = false;

        // for(let i = 0; i < 7; i++){
        //     db.query(
        //         `SELECT ref_code FROM users WHERE upline_id = ?`,
        //         [
        //             refID
        //         ], (error, result, fields) => {
        //             if(result.length > 0){
        //                 result.forEach((ele) => {
        //                     listCap['cap1'].push(ele.ref_code);
        //                 })
        //                 //refID = result[0].ref_code;
        //             }else{
        //                 max = true;
        //             }
        //         }
        //     )
        //     if(max) break;
        //     await sleep(200);
        // }

        let cap1 = false, cap2 = false, cap3 = false, cap4 = false, cap5 = false, cap6 = false, cap7 = false;
        // lấy cấp 1
        await new Promise((res, rej) => {
            db.query(
                `SELECT level_vip, pricePlay AS tklgd, priceWin, priceLose, ref_code, upline_id, nick_name, email FROM users WHERE upline_id = ?`,
                [
                    refID
                ], async (error, result, fields) => {
                    if (result.length > 0) {
                        await Promise.all(result.map(async (ele) => {
                            const res = await new Promise((resolve, reject) => {
                                db.query(`SELECT sum(amount) as amount from trade_history WHERE email = ? AND type_key ='nt'`, [ele.email], (error, results) => {
                                    if (error) {
                                        return reject(error);
                                    }
                                    return resolve(results);
                                });
                            });
                            ele.amt = res[0].amount || 0;
                            listData['cap1'].push(ele);
                            cap1 = true;
                        }))
                    }

                    res();

                }
            )
        })

        if (cap1) {
            for (let i = 0; i < listData['cap1'].length; i++) {
                db.query(
                    `SELECT level_vip, pricePlay AS tklgd, priceWin, priceLose, ref_code, upline_id, nick_name, email FROM users WHERE upline_id = ?`,
                    [
                        listData['cap1'][i].ref_code
                    ], async (error, result, fields) => {
                        if (void 0 !== result) {
                            if (result.length > 0) {
                                await Promise.all(result.map(async (ele) => {
                                    const res = await new Promise((resolve, reject) => {
                                        db.query(`SELECT sum(amount) as amount from trade_history WHERE email = ? AND type_key ='nt'`, [ele.email], (err, res) => {
                                            if (err) {
                                                return reject(err);
                                            }

                                            return resolve(res);
                                        })
                                    })
                                    ele.amt = res[0].amount || 0;
                                    listData['cap2'].push(ele);
                                }));
                                cap2 = true;
                            }
                        }
                    }
                )
                await sleep(50);
            }
        }

        if (cap2) {
            for (let i = 0; i < listData['cap2'].length; i++) {
                db.query(
                    `SELECT level_vip, pricePlay AS tklgd, priceWin, priceLose, ref_code, upline_id, nick_name, email FROM users WHERE upline_id = ?`,
                    [
                        listData['cap2'][i].ref_code
                    ], async (error, result, fields) => {
                        if (result.length > 0) {
                            await Promise.all(result.map(async (ele) => {
                                const res = await new Promise((resolve, reject) => {
                                    db.query(`SELECT sum(amount) as amount from trade_history WHERE email = ? AND type_key ='nt'`, [ele.email], (err, res) => {
                                        if (err) {
                                            return reject(err);
                                        }

                                        return resolve(res);
                                    })
                                })
                                ele.amt = res[0].amount || 0;
                                listData['cap3'].push(ele);
                            }));
                            cap3 = true;
                        }
                    }
                )
                await sleep(50);
            }
        }

        if (cap3) {
            for (let i = 0; i < listData['cap3'].length; i++) {

                db.query(
                    `SELECT level_vip, pricePlay AS tklgd, priceWin, priceLose, ref_code, upline_id, nick_name, email FROM users WHERE upline_id = ?`,
                    [
                        listData['cap3'][i].ref_code
                    ], async (error, result, fields) => {
                        if (result.length > 0) {
                            await Promise.all(result.map(async (ele) => {
                                const res = await new Promise((resolve, reject) => {
                                    db.query(`SELECT sum(amount) as amount from trade_history WHERE email = ? AND type_key ='nt'`, [ele.email], (err, res) => {
                                        if (err) {
                                            return reject(err);
                                        }

                                        return resolve(res);
                                    })
                                })
                                ele.amt = res[0].amount || 0;
                                listData['cap4'].push(ele);
                            }));
                            cap4 = true;
                        }
                    }
                )
                await sleep(50);
            }
        }

        if (cap4) {
            for (let i = 0; i < listData['cap4'].length; i++) {
                db.query(
                    `SELECT level_vip, pricePlay AS tklgd, priceWin, priceLose, ref_code, upline_id, nick_name, email FROM users WHERE upline_id = ?`,
                    [
                        listData['cap4'][i].ref_code
                    ], async (error, result, fields) => {
                        if (result.length > 0) {
                            await Promise.all(result.map(async (ele) => {
                                const res = await new Promise((resolve, reject) => {
                                    db.query(`SELECT sum(amount) as amount from trade_history WHERE email = ? AND type_key ='nt'`, [ele.email], (err, res) => {
                                        if (err) {
                                            return reject(err);
                                        }

                                        return resolve(res);
                                    })
                                })
                                ele.amt = res[0].amount || 0;
                                listData['cap5'].push(ele);
                            }));
                            cap5 = true;
                        }
                    }
                )
                await sleep(50);
            }
        }

        if (cap5) {
            for (let i = 0; i < listData['cap5'].length; i++) {
                db.query(
                    `SELECT level_vip, pricePlay AS tklgd, priceWin, priceLose, ref_code, upline_id, nick_name, email FROM users WHERE upline_id = ?`,
                    [
                        listData['cap5'][i].ref_code
                    ], async (error, result, fields) => {
                        if (result.length > 0) {
                            await Promise.all(result.map(async (ele) => {
                                const res = await new Promise((resolve, reject) => {
                                    db.query(`SELECT sum(amount) as amount from trade_history WHERE email = ? AND type_key ='nt'`, [ele.email], (err, res) => {
                                        if (err) {
                                            return reject(err);
                                        }

                                        return resolve(res);
                                    })
                                })
                                ele.amt = res[0].amount || 0;
                                listData['cap6'].push(ele);
                            }));
                            cap6 = true;
                        }
                    }
                )
                await sleep(50);
            }
        }

        if (cap6) {
            for (let i = 0; i < listData['cap6'].length; i++) {
                db.query(
                    `SELECT level_vip, pricePlay AS tklgd, priceWin, priceLose, ref_code, upline_id, nick_name, email FROM users WHERE upline_id = ?`,
                    [
                        listData['cap6'][i].ref_code
                    ], async (error, result, fields) => {
                        if (result.length > 0) {
                            await Promise.all(result.map(async (ele) => {
                                const res = await new Promise((resolve, reject) => {
                                    db.query(`SELECT sum(amount) as amount from trade_history WHERE email = ? AND type_key ='nt'`, [ele.email], (err, res) => {
                                        if (err) {
                                            return reject(err);
                                        }

                                        return resolve(res);
                                    })
                                })
                                ele.amt = res[0].amount || 0;
                                listData['cap7'].push(ele);
                            }));
                            cap7 = true;
                        }
                    }
                )
                await sleep(50);
            }
        }

        //if(cap7){
        //   for(let i = 0;  i < listData['cap7'].length; i++){
        //      db.query(
        //           `SELECT level_vip, pricePlay AS tklgd, ref_code, upline_id, nick_name FROM users WHERE upline_id = ?`,
        //         [
        //               listData['cap7'][i].ref_code
        //          ], (error, result, fields) => {
        //              if(result.length > 0){
        //                   result.forEach((ele) => {
        //                      listData['cap7'].push(ele);
        //                   });
        //cap7 = true;
        //               }
        //           }
        //      )
        //      await sleep(50);
        //  }
        // }


        // await new Promise((res, rej) => {
        // 	//SELECT  upline_id, ref_code
        // 	//FROM (SELECT * FROM users
        //     //            ORDER BY upline_id) users_sorted,
        //     //            (SELECT @pv := 'RYIFCWS') initialisation
        //     //    WHERE find_in_set(upline_id, @pv)
        //     //    AND length(@pv := concat(@pv, ',', ref_code));

        //     db.query(`with recursive cte (level_vip, tklgd, ref_code, upline_id, nick_name) as (
        // 			  select     level_vip,
        // 						 pricePlay,
        // 						 ref_code,
        // 						 upline_id,
        // 						 nick_name
        // 			  from       users
        // 			  where      upline_id = ?
        // 			  union all
        // 			  select     p.level_vip,
        // 						 p.pricePlay,
        // 						 p.ref_code,
        // 						 p.upline_id,
        // 						 p.nick_name
        // 			  from       users p
        // 			  inner join cte
        // 					  on p.upline_id = cte.ref_code
        // 			)
        // 			select * from cte;`,
        //         [
        // 			refID
        // 		], (error, result, fields) => {

        //             let count = result.length;
        // 			if(count === 0) res();
        //             if(count > 0){
        //                 let i = 0, u = 0, check = '';
        //                 result.forEach((ele) => {
        // 					if(check != ele.upline_id){
        // 						u++;
        // 						check = ele.upline_id
        // 					}
        // 					if(u <= 7){
        // 						listData[`cap${u}`].push(ele);
        // 					}
        // 					res();
        //                 })

        //             }
        //         }
        //     )

        // });

        let listD = {
            data: listData,
            obj: obj
        }

        return callback(null, listD);
    },


    getListCmsHis: async (data, callback) => {
        let email = data.e;

        let rs = [];
        await new Promise((resolve, reject) => {

            db.query(
                `SELECT * FROM commission_history WHERE email = ? AND type = ?`,
                [
                    email,
                    'klgd'
                ], (error, results, fields) => {
                    rs = results;
                    resolve();
                })

        })


        return callback(null, rs);
    },

    getListNotifi: async (data, callback) => {
        let email = data.e;

        let rs = [];
        await new Promise((resolve, reject) => {

            db.query(
                // `SELECT * FROM notifi WHERE cu_email = ? OR email = ? ORDER BY id DESC`,
                `SELECT * FROM notifi WHERE cu_email = ? ORDER BY id DESC`,
                [
                    email,
                    // email
                ], (error, results, fields) => {
                    rs = results;

                    resolve();
                })

        })


        return callback(null, rs);
    },

    updateListNotifi: async (data, callback) => {
        let email = data.e;

        await new Promise((resolve, reject) => {

            db.query(
                `UPDATE notifi SET views = ? WHERE cu_email = ?`,
                [
                    1,
                    email
                ], (error, results, fields) => {
                    resolve();
                })

        })

        return callback(null);
    }

}
