
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  balance: {
    type: Number
  },
  verifiedDate: {
    type: Date
  },
  verificationToken: {
    type: String
  },
  forcePasswordReset: {
    type: Boolean
  },
  chatToken: {
    type: String
  }

}, {timestamps: true})

const User = mongoose.model('User', userSchema)
module.exports = User
