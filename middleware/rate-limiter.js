import { redisClient } from "../services/redis.js"

// Simple rate limiter for demo/public API purposes
// This helps prevent abuse in RapidAPI free tier
export const rateLimiter = async (req, res, next) => {
  try {
    // Only apply rate limiting to the assign endpoint to limit new wallet creation
    if (req.path === "/api/assign") {
      const ip = req.ip || req.headers["x-forwarded-for"] || "unknown"
      const key = `ratelimit:${ip}:wallets`

      // Get current count
      const count = await redisClient.get(key)
      const maxWallets = 10 // Max 10 wallets per IP per day

      if (count && Number.parseInt(count) >= maxWallets) {
        return res.status(429).json({
          error: "Too many wallet creation requests",
          message: "Maximum daily wallet creation limit reached. Try again tomorrow.",
        })
      }

      // Increment counter and set expiry if new
      if (!count) {
        await redisClient.setEx(key, 86400, "1") // 24 hours expiry
      } else {
        await redisClient.incr(key)
      }
    }

    next()
  } catch (error) {
    // If rate limiting fails, still allow the request to proceed
    console.error("Rate limit error:", error)
    next()
  }
}
