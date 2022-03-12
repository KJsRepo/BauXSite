const mongoose = require('mongoose')

const invoiceSchema = new mongoose.Schema({
  creationDate: {
    type: Date,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  invoice_hash: {
    type: String
  },
  paymentDate: {
    type: Date
  },
}, {timestamps: true})

const Invoice = mongoose.model('Invoice', invoiceSchema)
module.exports = Invoice
