const {setIntervalAsync} = require('set-interval-async/dynamic')
const Tele = require("../auth/telegram_notify")
const {sendCoinBNBByAdmin, sendCoinBep20, getUSDTFrom, isAdminBNBAvaiable} = require('./coin-core');
const config = require('../config')
const Helper = require("../helpers");
const {SAVE_LOG_NOTIFI} = require('../auth/notifi');
var db = require("../database");
const fileSys = config.PATH_SYS_CONFIG

const TIME_SCAN_WALLET_USER = 1000; // ms
const TIME_SCAN_ADDRESS_ADMIN = 5000; // 5s

let queuePeddingUsers = {};

let LIST_USERS_ONLINE = {};
let pauseTransferBNB = false; // 如果管理员钱包没有足够的 BNB，转账将停止

async function handleWallet(email) {
    const userQuery = await new Promise((resolve, reject) => {
        db.query(`select address_USDT, privateKey_USDT, nick_name from users where email = ?`, [email], (err, res) => {
            if (err) {
                reject(err);
            }

            resolve(res[0]);
        })
    });

    if (void 0 === userQuery) return;

    if (queuePeddingUsers[email]) return;
    const usdtUser = await getUSDTFrom(userQuery.address_USDT);

    let dataSys = Helper.getConfig(fileSys);
    let addressFrom = dataSys.ADDRESS_ETH_TRANSACTION;
    let KeyFrom = dataSys.PRIVATE_KEY_ETH_TRANSACTION;
    let addressNhanTien = dataSys.ADDRESS_ETH_USDT;

    const MIN_USDT_TRANSFER = Number(dataSys.minDepositUSDT) || 0.001;

    if (usdtUser >= MIN_USDT_TRANSFER) {
        queuePeddingUsers[email] = true;
        try {
            const resSendBNB = await sendCoinBNBByAdmin(
                addressFrom,
                KeyFrom,
                userQuery.address_USDT,
            );
            Tele.sendMessNap(`Admin vừa chuyển ${resSendBNB.bscchuyen} BNB tới ví user ${email}.\n Phí chuyển ${resSendBNB.phi} BNB.\n Hash: ${resSendBNB.txHash}`);

            await sleep(15000); // Dừng 15s để đợi tài khoản user nhận đc tiền

            const resSendBep20 = await sendCoinBep20(
                userQuery.address_USDT,
                userQuery.privateKey_USDT,
                addressNhanTien,
                usdtUser,
            );
            Tele.sendMessNap(resSendBep20);

            await sleep(15000); // Dừng 15s để đợi tài khoản user nhận đc tiền

            await new Promise((resolve2, reject2) => {
                db.query(
                    `UPDATE users SET money_usdt = money_usdt + ? WHERE email = ?`,
                    [
                        Number(usdtUser),
                        email,
                    ], (error, results) => {
                        if (error) reject2(error);
                        resolve2(results);
                    }
                )
            });

            await new Promise((resolve1, reject1) => {
                db.query(`INSERT INTO trade_history (email, from_u, type_key, type, currency, amount, real_amount, pay_fee, network, status, created_at)
        values(?,?,?,?,?,?,?,?,?,?,now())`,
                    [
                        email,
                        userQuery.nick_name,
                        'nt',
                        'Nạp tiền USDT (BEP 20)',
                        'usdt',
                        Number(usdtUser),
                        Number(resSendBNB.bscchuyen),
                        Number(resSendBNB.phi),
                        'bep20',
                        1,
                    ], (err, results) => {
                        if (err) reject1(err);
                        else {
                            sendMessNap(`Nạp thành công $${usdtUser}!`, email, Number(usdtUser));
                            resolve1(results);
                        }
                    });
            })

            delete queuePeddingUsers[email];
        } catch (error) {
            console.error('Xảy ra lỗi', error);
            pauseTransferBNB = true;
            Tele.sendMessNap(error);
            // Xóa lệnh này để tiến hành gửi lại BNB
            delete queuePeddingUsers[email];
        }
    }
}

// Scan ví user
setIntervalAsync(async () => {
    if (pauseTransferBNB) return;
    for (const item in LIST_USERS_ONLINE) {
        const email = LIST_USERS_ONLINE[item].email;
        await handleWallet(email);
    }
}, TIME_SCAN_WALLET_USER);

// 处理管理员钱包没有足够BNB的情况
setIntervalAsync(async () => {
    let dataSys = Helper.getConfig(fileSys);
    let addressFrom = dataSys.ADDRESS_ETH_TRANSACTION;
    const amountBNBAdmin = await isAdminBNBAvaiable(addressFrom);
    if (amountBNBAdmin) {
        pauseTransferBNB = false;
    } else {
        pauseTransferBNB = true;
    }
}, TIME_SCAN_ADDRESS_ADMIN);

function setListUserOnline(users) {
    LIST_USERS_ONLINE = users;
}

function sendMessNap(mess, email, usd, style = 'success') {
    for (let obj in LIST_USERS_ONLINE) {
        let em = LIST_USERS_ONLINE[obj].email;
        if (em === email) {
            SAVE_LOG_NOTIFI('nap', email, email, "Nạp tiền BEP20", `- Số lượng: ${usd} USDT`);
            let ws = LIST_USERS_ONLINE[obj].ws;
            ws.send(JSON.stringify({
                data: {
                    mess,
                    style,
                    usd,
                },
                type: 'mess'
            }));
        }
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve('');
        }, ms)
    })
}

module.exports = {
    setListUserOnline,
    handleWallet,
}