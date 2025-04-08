import { createClient } from "redis"

// Create Redis client - this will use environment variables provided by deployment
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
})

// Redis error handling
redisClient.on("error", (err) => {
  console.error("Redis error:", err)
})

// Connect to Redis
await redisClient.connect()
console.log("Connected to Redis")

export { redisClient }
