import express from "express"
import helmet from "helmet"
import { redisClient } from "./services/redis.js"
import { walletRoutes } from "./routes/wallet.js"
import { errorHandler } from "./middleware/error.js"
import { rateLimiter } from "./middleware/rate-limiter.js"

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.json())
app.use(helmet())

// Optional rate limiting middleware for demo purposes
app.use(rateLimiter)

// Routes
app.use("/api", walletRoutes)

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Check Redis connection
    await redisClient.ping()
    res.status(200).json({ status: "healthy", redis: "connected" })
  } catch (error) {
    res.status(500).json({ status: "unhealthy", error: error.message })
  }
})

// Error handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Wallet API running on port ${PORT}`)
})

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...")
  await redisClient.quit()
  process.exit(0)
})
