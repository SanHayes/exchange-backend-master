module.exports = {
    apps: [
        {
            name: 'exchange-server',
            script: 'server.js',
            ignore_watch:[
                'config',
                'certs',
                'htmlMail',
            ],
        },
    ],
};
