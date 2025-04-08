import { z } from "zod"

// Zod schemas for validation
const walletIdSchema = z.string().uuid({
  message: "Invalid wallet ID format",
})

const amountSchema = z
  .number()
  .positive({ message: "Amount must be positive" })
  .finite({ message: "Amount must be a finite number" })

const reasonSchema = z.string().max(500).optional()

// Validation middleware for assign endpoint
export const validateAssign = (req, res, next) => {
  try {
    // No specific fields to validate for assign
    next()
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// Validation middleware for credit endpoint
export const validateCredit = (req, res, next) => {
  try {
    const { wallet_id } = req.params
    const { amount, reason } = req.body

    walletIdSchema.parse(wallet_id)

    const parsedAmount = Number.parseFloat(amount)
    if (isNaN(parsedAmount)) {
      throw new Error("Amount must be a valid number")
    }

    amountSchema.parse(parsedAmount)

    if (reason !== undefined) {
      reasonSchema.parse(reason)
    }

    // If all validations pass, replace amount with parsed float
    req.body.amount = parsedAmount

    next()
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// Validation middleware for debit endpoint
export const validateDebit = (req, res, next) => {
  try {
    const { wallet_id } = req.params
    const { amount, reason } = req.body

    walletIdSchema.parse(wallet_id)

    const parsedAmount = Number.parseFloat(amount)
    if (isNaN(parsedAmount)) {
      throw new Error("Amount must be a valid number")
    }

    amountSchema.parse(parsedAmount)

    if (reason !== undefined) {
      reasonSchema.parse(reason)
    }

    // If all validations pass, replace amount with parsed float
    req.body.amount = parsedAmount

    next()
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}
