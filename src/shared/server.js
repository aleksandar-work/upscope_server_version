const axios = require('axios');

const upscopeServer = axios.create({
    baseURL: 'https://api.upscope.io/',
    headers: {'x-api-key': 'JAbTfNK9GgcyEVcFU6gbrD6W3TcMGZ3SRFm58HCeaobCei55Wi'}
});

module.exports = {upscopeServer};