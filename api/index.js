const { createServer } = require('@vercel/node');
const app = require('../server');

module.exports = createServer(app);
