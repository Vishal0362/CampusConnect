const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  message: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 
  }
});

module.exports = mongoose.model("Message", messageSchema);