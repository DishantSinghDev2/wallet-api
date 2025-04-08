import express from "express"
import { v4 as uuidv4 } from "uuid"
import { redisClient } from "../services/redis.js"
import { validateAssign, validateCredit, validateDebit } from "../middleware/validation.js"

const router = express.Router()

// Create a new wallet
router.post("/assign", validateAssign, async (req, res, next) => {
  try {
    const walletId = uuidv4()
    const now = Date.now()

    const wallet = {
      wallet_id: walletId,
      balance: 0,
      created_at: now,
      last_updated: now,
    }

    // Store wallet in Redis
    await redisClient.hSet(`wallet:${walletId}`, wallet)

    res.status(201).json(wallet)
  } catch (error) {
    next(error)
  }
})

// Get wallet balance
router.get("/balance/:wallet_id", async (req, res, next) => {
  try {
    const { wallet_id } = req.params

    // Get wallet from Redis
    const wallet = await redisClient.hGetAll(`wallet:${wallet_id}`)

    if (!wallet || Object.keys(wallet).length === 0) {
      return res.status(404).json({ error: "Wallet not found" })
    }

    // Parse numeric values
    wallet.balance = Number.parseFloat(wallet.balance)
    wallet.created_at = Number.parseInt(wallet.created_at)
    wallet.last_updated = Number.parseInt(wallet.last_updated)

    res.json(wallet)
  } catch (error) {
    next(error)
  }
})

// Credit wallet
router.post("/credit/:wallet_id", validateCredit, async (req, res, next) => {
  try {
    const { wallet_id } = req.params
    const { amount, reason = "" } = req.body

    // Start a Redis transaction
    const multi = redisClient.multi()

    // Check if wallet exists
    const wallet = await redisClient.hGetAll(`wallet:${wallet_id}`)
    if (!wallet || Object.keys(wallet).length === 0) {
      return res.status(404).json({ error: "Wallet not found" })
    }

    const now = Date.now()
    const transaction_id = uuidv4()
    const currentBalance = Number.parseFloat(wallet.balance) || 0
    const newBalance = currentBalance + amount

    // Update wallet balance
    multi.hSet(`wallet:${wallet_id}`, {
      balance: newBalance,
      last_updated: now,
    })

    // Create transaction record
    const transaction = {
      transaction_id,
      type: "credit",
      amount,
      reason,
      timestamp: now,
      balance_after_transaction: newBalance,
    }

    // Store transaction - using Redis List for transaction history
    multi.rPush(`wallet:${wallet_id}:tx`, JSON.stringify(transaction))

    // Execute transaction
    await multi.exec()

    res.json({
      wallet_id,
      credited_amount: amount,
      new_balance: newBalance,
      transaction_id,
      timestamp: now,
    })
  } catch (error) {
    next(error)
  }
})

// Debit wallet
router.post("/debit/:wallet_id", validateDebit, async (req, res, next) => {
  try {
    const { wallet_id } = req.params
    const { amount, reason = "" } = req.body

    // Check if wallet exists
    const wallet = await redisClient.hGetAll(`wallet:${wallet_id}`)
    if (!wallet || Object.keys(wallet).length === 0) {
      return res.status(404).json({ error: "Wallet not found" })
    }

    const currentBalance = Number.parseFloat(wallet.balance) || 0

    // Check if there's enough balance
    if (currentBalance < amount) {
      return res.status(400).json({
        error: "Insufficient funds",
        current_balance: currentBalance,
        requested_amount: amount,
      })
    }

    // Start a Redis transaction
    const multi = redisClient.multi()

    const now = Date.now()
    const transaction_id = uuidv4()
    const newBalance = currentBalance - amount

    // Update wallet balance
    multi.hSet(`wallet:${wallet_id}`, {
      balance: newBalance,
      last_updated: now,
    })

    // Create transaction record
    const transaction = {
      transaction_id,
      type: "debit",
      amount,
      reason,
      timestamp: now,
      balance_after_transaction: newBalance,
    }

    // Store transaction
    multi.rPush(`wallet:${wallet_id}:tx`, JSON.stringify(transaction))

    // Execute transaction
    await multi.exec()

    res.json({
      wallet_id,
      debited_amount: amount,
      new_balance: newBalance,
      transaction_id,
      timestamp: now,
    })
  } catch (error) {
    next(error)
  }
})

// Get transactions
router.get("/transactions/:wallet_id", async (req, res, next) => {
  try {
    const { wallet_id } = req.params
    const limit = Number.parseInt(req.query.limit) || 20
    const offset = Number.parseInt(req.query.offset) || 0

    // Check if wallet exists
    const exists = await redisClient.exists(`wallet:${wallet_id}`)
    if (!exists) {
      return res.status(404).json({ error: "Wallet not found" })
    }

    // Get transactions from Redis with pagination
    const transactions = await redisClient.lRange(`wallet:${wallet_id}:tx`, -(offset + limit), -(offset + 1))

    if (!transactions || transactions.length === 0) {
      return res.json({ wallet_id, transactions: [] })
    }

    // Parse each transaction from JSON string
    const parsedTransactions = transactions.map((tx) => JSON.parse(tx)).reverse()

    res.json({
      wallet_id,
      count: parsedTransactions.length,
      transactions: parsedTransactions,
    })
  } catch (error) {
    next(error)
  }
})

// Reset wallet
router.post("/reset/:wallet_id", async (req, res, next) => {
  try {
    const { wallet_id } = req.params

    // Check if wallet exists
    const exists = await redisClient.exists(`wallet:${wallet_id}`)
    if (!exists) {
      return res.status(404).json({ error: "Wallet not found" })
    }

    const now = Date.now()

    // Update wallet to reset balance
    await redisClient.hSet(`wallet:${wallet_id}`, {
      balance: 0,
      last_updated: now,
    })

    // Delete transaction history
    await redisClient.del(`wallet:${wallet_id}:tx`)

    res.json({
      wallet_id,
      balance: 0,
      reset_at: now,
      message: "Wallet reset successfully",
    })
  } catch (error) {
    next(error)
  }
})

// Delete wallet
router.post("/delete/:wallet_id", async (req, res, next) => {
  try {
    const { wallet_id } = req.params

    // Check if wallet exists
    const exists = await redisClient.exists(`wallet:${wallet_id}`)
    if (!exists) {
      return res.status(404).json({ error: "Wallet not found" })
    }

    // Start a Redis transaction
    const multi = redisClient.multi()

    // Delete wallet and transaction history
    multi.del(`wallet:${wallet_id}`)
    multi.del(`wallet:${wallet_id}:tx`)

    // Execute transaction
    await multi.exec()

    res.json({
      wallet_id,
      deleted_at: Date.now(),
      message: "Wallet deleted successfully",
    })
  } catch (error) {
    next(error)
  }
})

// Get wallet summary
router.get("/summary/:wallet_id", async (req, res, next) => {
  try {
    const { wallet_id } = req.params

    // Check if wallet exists
    const wallet = await redisClient.hGetAll(`wallet:${wallet_id}`)
    if (!wallet || Object.keys(wallet).length === 0) {
      return res.status(404).json({ error: "Wallet not found" })
    }

    // Get all transactions
    const txStrings = await redisClient.lRange(`wallet:${wallet_id}:tx`, 0, -1)
    const transactions = txStrings.map((tx) => JSON.parse(tx))

    // Calculate summary
    let totalCredits = 0
    let totalDebits = 0
    const transactionCount = transactions.length
    let lastTransactionTimestamp = null

    transactions.forEach((tx) => {
      if (tx.type === "credit") {
        totalCredits += tx.amount
      } else if (tx.type === "debit") {
        totalDebits += tx.amount
      }

      // Track the latest transaction timestamp
      if (!lastTransactionTimestamp || tx.timestamp > lastTransactionTimestamp) {
        lastTransactionTimestamp = tx.timestamp
      }
    })

    const averageTransactionSize = transactionCount > 0 ? (totalCredits + totalDebits) / transactionCount : 0

    res.json({
      wallet_id,
      balance: Number.parseFloat(wallet.balance),
      total_credits: totalCredits,
      total_debits: totalDebits,
      transaction_count: transactionCount,
      average_transaction_size: averageTransactionSize,
      last_transaction_timestamp: lastTransactionTimestamp,
      created_at: Number.parseInt(wallet.created_at),
      last_updated: Number.parseInt(wallet.last_updated),
    })
  } catch (error) {
    next(error)
  }
})

// Export transaction history
router.get("/export/:wallet_id", async (req, res, next) => {
  try {
    const { wallet_id } = req.params
    const format = req.query.format?.toLowerCase() || "json"

    // Check if wallet exists
    const exists = await redisClient.exists(`wallet:${wallet_id}`)
    if (!exists) {
      return res.status(404).json({ error: "Wallet not found" })
    }

    // Get all transactions
    const txStrings = await redisClient.lRange(`wallet:${wallet_id}:tx`, 0, -1)
    const transactions = txStrings.map((tx) => JSON.parse(tx))

    if (format === "csv") {
      // Generate CSV
      const headers = "transaction_id,type,amount,reason,timestamp,balance_after_transaction\n"
      const csvRows = transactions
        .map((tx) => {
          return `${tx.transaction_id},${tx.type},${tx.amount},"${tx.reason}",${tx.timestamp},${tx.balance_after_transaction}`
        })
        .join("\n")

      const csv = headers + csvRows

      res.setHeader("Content-Type", "text/csv")
      res.setHeader("Content-Disposition", `attachment; filename="wallet_${wallet_id}_transactions.csv"`)
      res.send(csv)
    } else {
      // Default to JSON
      res.json({
        wallet_id,
        exported_at: Date.now(),
        count: transactions.length,
        transactions,
      })
    }
  } catch (error) {
    next(error)
  }
})

export const walletRoutes = router
