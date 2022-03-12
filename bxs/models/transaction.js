const mongoose = require('mongoose')

const transactionSchema = new mongoose.Schema({
  transactionDate: {
    type: Date,
    required: true
  },
  fromUsername: {
    type: String,
    required: true
  },
  toUsername: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String
  },
  ref_id: {
    type: String
  }
}, {timestamps: true})

const Transaction = mongoose.model('Transaction', transactionSchema)
module.exports = Transaction
