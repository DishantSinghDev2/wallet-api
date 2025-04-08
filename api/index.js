import { createServer } from '@vercel/node';
import app from '../server';

module.exports = createServer(app);
