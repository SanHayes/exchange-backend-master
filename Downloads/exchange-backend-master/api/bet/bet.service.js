const db = require("./../../database");


module.exports = {
    getAllBetHis: (query, callback) => {
        let sql = `SELECT * FROM bet_history WHERE status = 1`

        if (void 0 !== query.email) {
            sql += ` and email = '${query.email}'`;
        }

        if (void 0 !== query.f) {
            let f = '';
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
            sql += f;
        }

        if (void 0 !== query.from && void 0 !== query.to) {
            // YYYY-MM-DD
            sql += ` and created_at BETWEEN '${query.from}' and '${query.to}'`;
        }

        sql += ' ORDER BY id DESC LIMIT 1000';
        db.query(
            sql,
            [], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                return callback(null, results)
            }
        )
    },

    getAllBetHisTrash: callback => {
        db.query(
            `SELECT * FROM bet_history WHERE status = 0 ORDER BY id desc `,
            [], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                return callback(null, results)
            }
        )
    },


    deleteBetHisById: (data, callback) => {
        db.query(
            `UPDATE bet_history SET status = ? WHERE id = ?`,
            [data.val,
                data.id
            ], (error, results, fields) => {
                if (error) {
                    return callback(error);
                }
                return callback(null, results)
            }
        )
    },

}