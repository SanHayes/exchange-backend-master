const sharp = require('sharp');
const path = require('path');
const db = require("../../database");
const md5 = require("md5");

class Resize {

    constructor(folder) {
        this.folder = folder
    }

    async save(buffer, nick) {

        const filename = Resize.filename(nick);
        const filepath = this.filepath(filename);

        await sharp(buffer)
            .resize(150, 150, { // size image 150x150
                fit: sharp.fit.inside,
                withoutEnlargement: true
            })
            .toFile(filepath);

        return filename;
    }

    async saveChampionBackground(buffer, nick) {

        const filename = Resize.filenameFront(nick);
        const filepath = this.filepath(filename);

        await sharp(buffer).toFile(filepath);
        return filename;
    }

    async savePassPortFront(buffer, nick, ext) {

        const filename = Resize.filenameFront(nick, ext);
        const filepath = this.filepath(filename);

        await sharp(buffer)
            .resize(800, 800, {
                fit: sharp.fit.inside,
                withoutEnlargement: true
            })
            .toFile(filepath);
        return filename;
    }

    async savePassPortBack(buffer, nick, ext) {

        const filename = Resize.filenameBack(nick, ext);
        const filepath = this.filepath(filename);

        await sharp(buffer)
            .resize(800, 800, {
                fit: sharp.fit.inside,
                withoutEnlargement: true
            })
            .toFile(filepath);
        return filename;
    }

    static filename(nick) {

        let name = `${nick}.png`
        name = md5(name + nick) + '.png';

        db.query(
            `UPDATE users SET profile_image = ? WHERE nick_name = ?`,
            [
                name,
                nick
            ], (error, results, fields) => {
                if (error) {
                    return error;
                }
            }
        )
        return name;
    }

    static filenameFront(nick, ext = `.png`) {

        let name = `id_front_${nick}${ext}`
        name = md5(name + nick) + ext;

        db.query(
            `UPDATE users SET id_front = ? WHERE nick_name = ?`,
            [
                name,
                nick
            ], (error, results, fields) => {
                if (error) {
                    return error;
                }
            }
        )
        return name;
    }

    static filenameBack(nick, ext = `.png`) {
        let name = `id_back_${nick}${ext}`
        name = md5(name + nick) + ext;

        db.query(
            `UPDATE users SET id_back = ? WHERE nick_name = ?`,
            [
                name,
                nick
            ], (error, results, fields) => {
                if (error) {
                    return error;
                }
            }
        )
        return name;
    }

    filepath(filename) {

        return path.resolve(`${this.folder}/${filename}`)
    }
}

module.exports = Resize;