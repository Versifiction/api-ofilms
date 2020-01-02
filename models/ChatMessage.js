const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ChatMessageSchema = new Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  date: Date,
  writer: String,
  isMasked: Boolean,
  isVerified: Boolean,
  isModerator: Boolean,
  isAdmin: Boolean,
  isFounder: Boolean
});

module.exports = mongoose.model("chat-messages", ChatMessageSchema);
