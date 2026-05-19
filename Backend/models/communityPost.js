const mongoose = require("mongoose");

const CommunityPostSchema = new mongoose.Schema({
  authorId: String,
  authorName: String,
  authorDepartment: String,
  authorPhoto: String,
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 280
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 604800
  }
});

module.exports = mongoose.model("CommunityPost", CommunityPostSchema);
