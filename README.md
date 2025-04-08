# Wallet API

A high-performance Wallet API built with Node.js, Express, and Redis. Designed for deployment on RapidAPI.

## Features

- Create and manage virtual wallets with unique IDs
- Credit and debit operations with atomic transactions
- Transaction history with pagination
- Wallet statistics and summary
- Export transaction history as JSON or CSV
- Rate limiting for wallet creation

## API Endpoints

### Wallet Management
- `POST /api/assign` - Create a new wallet
- `GET /api/balance/:wallet_id` - Get wallet balance
- `POST /api/credit/:wallet_id` - Add funds to wallet
- `POST /api/debit/:wallet_id` - Remove funds from wallet
- `GET /api/transactions/:wallet_id` - Get transaction history
- `POST /api/reset/:wallet_id` - Reset wallet to zero balance
- `POST /api/delete/:wallet_id` - Delete wallet
- `GET /api/summary/:wallet_id` - Get wallet statistics
- `GET /api/export/:wallet_id` - Export transaction history

## Setup

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Set environment variables:
   - `REDIS_URL` - Redis connection URL (default: redis://localhost:6379)
   - `PORT` - Server port (default: 3000)

3. Start the server:
   \`\`\`
   npm start
   \`\`\`

## Deployment

### Docker

Build the Docker image:
\`\`\`
docker build -t wallet-api .
\`\`\`

Run the container:
\`\`\`
docker run -p 3000:3000 -e REDIS_URL=redis://redis-host:6379 wallet-api
\`\`\`

### RapidAPI Deployment

This API is designed to be deployed on RapidAPI. Follow RapidAPI's documentation for deploying your API.

## Performance Considerations

- All wallet data is stored in Redis for fast access
- Transactions use Redis MULTI/EXEC for atomicity
- Rate limiting prevents abuse
- Proper error handling for all operations

## Security

- UUID for wallet IDs to prevent guessing
- Input validation with Zod
- Helmet.js for HTTP security headers
- Atomic operations to prevent race conditions
