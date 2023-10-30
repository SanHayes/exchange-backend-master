const fs = require('fs');
const conf = require('./config.js');
const path = require('path');

let getConfig = config => {
    let text = fs.readFileSync(path.resolve(__dirname, './config/' + config + '.json'), 'utf8');
    try {
        text = JSON.parse(text);
        return text;
    } catch (e) {
        return null;
    }
}

let setConfig = (config, data) => {
    fs.writeFileSync(path.resolve(__dirname, './config/' + config + '.json'), JSON.stringify(data), err => {
    });
    data = null;
}

let phoneCrack = phone => {
    let data = phone.match(/^[\+]?(?:[(][0-9]{1,3}[)]|(?:84|0))/im);
    if (data) {
        return {
            region: data[0],
            phone: phone.slice(data[0].length, phone.length),
        };
    }
    return data;
}

let ssl = {
    key: fs.readFileSync(path.resolve(__dirname, conf.CF_SSL.key), 'utf8'),
    cert: fs.readFileSync(path.resolve(__dirname, conf.CF_SSL.cert), 'utf8'),
    rejectUnauthorized: false,
    requestCert: true,
    agent: false
};

module.exports = {
    getConfig,
    setConfig,
    ssl,
    phoneCrack
}