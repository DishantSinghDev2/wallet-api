export const errorHandler = (err, req, res, next) => {
  console.error(err.stack)

  // Check if Redis error
  if (err.name === "RedisError") {
    return res.status(500).json({
      error: "Database operation failed",
      message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    })
  }

  // Default response
  res.status(500).json({
    error: "Something went wrong",
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  })
}
