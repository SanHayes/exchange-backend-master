const config = require('./../config.js')
const Helper = require("../helpers");
const { setListUserOnline } = require('../api/autoNapCoin');
const { v1: uuidv1 } = require('uuid');
const express = require('express');
const app = express();
const WebSocket = require('ws');

const cors = require('cors');

app.use(cors({
    origin: '*',
    optionsSuccessStatus: 200
 }));

let httpServer;

if(!config.USE_SSL){
    httpServer = require('http').createServer(app);
}else{
	let options = Helper.ssl;
    httpServer = require('https').createServer(options, app);
}

const wss = new WebSocket.Server(
    { 
        server: httpServer, 
        //port: 80 
    }
)

const port = config.PORT_NAP
httpServer.listen(port,()=>{
    console.log(`NAP start port: ${port}`);
});

class PlayerData {
    constructor(id) {
        this.id = id
    }
}
const users = {};

wss.on('connection', ws => {
    
    ws.on('message', d => {
        let data = JSON.parse(d);
        if(data.type === 'accountDetail'){
            let obj = data.data;
            let player = new PlayerData(uuidv1(), 0);
            player.ws = ws;
            player.email = obj.email;
            users[player.id] = player;
            setListUserOnline(users);
        }

    });

    ws.on('close', message => {
        for(let obj in users) {
            if(users[obj].ws == ws) {
                delete users[obj];
                setListUserOnline(users);
                break;
            }
        }
    })
});