const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema({

  title: String,
  price: Number,
  description: String,

  seller: String,
  sellerId: String,
  upiId: String,

  image: String,
  public_id: String

}, { timestamps: true });

module.exports = mongoose.model("Book", BookSchema);
