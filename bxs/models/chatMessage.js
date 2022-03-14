const mongoose = require('mongoose')

const chatMessageSchema = new mongoose.Schema({
  sentDate: {
    type: Date,
    required: true
  },
  fromUsername: {
    type: String,
    required: true
  },
  huddleId: {
    type: String,
    required: true
  },
  msgText: {
    type: String,
    required: true
  }
}, {timestamps: true})

const chatMessage = mongoose.model('chatMessage', chatMessageSchema)
module.exports = chatMessage
