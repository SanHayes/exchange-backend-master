const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const path = require('path')

const app = express();

app.use(cors());
app.use(bodyParser.json())


const upload = require('./uploadMiddleware')
const Resize = require('./Resize')


app.get('/me/photo/:name', (req, res) => {
    const filename = req.params.name;
    if (!/^[a-z0-9]+$/.test(filename.replace(path.extname(filename), ''))) {
        return res.json({msg: 'Access denied'});
    }

    const imagePath = path.join(__dirname, `/avatars/${filename}`);
    res.sendFile(imagePath, err => {
        if (err) {
            res.status(err.status).end('.');
        }
    })
})

app.get('/me/photo/passport/:name', (req, res) => {
    const filename = req.params.name;
    if (!/^[a-z0-9]+$/.test(filename.replace(path.extname(filename), ''))) {
        return res.json({msg: 'Access denied'});
    }
    const imagePath = path.join(__dirname, `/passports/${filename}`);
    res.sendFile(imagePath, err => {
        if (err) {
            res.status(err.status).end('.');
        }
    })
})

app.get('/photo/champions/:name', (req, res) => {
    const filename = req.params.name;
    if (!/^[a-z0-9]+$/.test(filename.replace(path.extname(filename), ''))) {
        return res.json({msg: 'Access denied'});
    }
    const imagePath = path.join(__dirname, `/champions/${filename}`);
    res.sendFile(imagePath, err => {
        if (err) {
            res.status(err.status).end('.');
        }
    })
})

app.post('/avatar', upload.single('image'), async (req, res) => {
    // folder upload
    const imagePath = path.join(__dirname, '/avatars');
    // call class Resize
    let nick = req.body.nick;
    const fileUpload = new Resize(imagePath);


    if (!req.file) {
        res.status(401)
            .json({success: 0, error: 'Please provide an image'})
        return
    }

    await fileUpload.save(req.file.buffer, nick)

    return res.status(200)
        .json({success: 1, error: 'Upload success'})
})

app.post('/champion', upload.single('image'), async (req, res) => {
    // folder upload
    const imagePath = path.join(__dirname, '/champions');
    // call class Resize
    let nick = req.body.nick;
    const fileUpload = new Resize(imagePath);

    if (!req.file) {
        res.status(401)
            .json({success: 0, error: 'Please provide an image'})
        return
    }

    const fileName = await fileUpload.saveChampionBackground(req.file.buffer, nick)

    return res.status(200)
        .json({success: 1, data: fileName});
})

app.post('/passport/front', upload.single('image'), async (req, res) => {
    // folder upload
    const imagePath = path.join(__dirname, '/passports');
    // call class Resize
    let nick = req.body.nick;
    const fileUpload = new Resize(imagePath);

    if (!req.file) {
        res.status(401)
            .json({success: 0, error: 'Please provide an image'})
        return
    }

    const originalname = req.file.originalname
    const ext = path.extname(originalname)

    await fileUpload.savePassPortFront(req.file.buffer, nick, ext)

    return res.status(200)
        .json({success: 1, error: 'Upload success'})
})

app.post('/passport/back', upload.single('image'), async (req, res) => {
    // folder upload
    const imagePath = path.join(__dirname, '/passports');
    // call class Resize
    let nick = req.body.nick;
    const fileUpload = new Resize(imagePath);

    if (!req.file) {
        res.status(401)
            .json({success: 0, error: 'Please provide an image'})
        return
    }

    const originalname = req.file.originalname
    const ext = path.extname(originalname)

    await fileUpload.savePassPortBack(req.file.buffer, nick, ext)

    return res.status(200)
        .json({success: 1, error: 'Upload success'})
})

module.exports = app;