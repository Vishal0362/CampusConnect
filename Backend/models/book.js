const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema({

  title: String,
  price: Number,
  description: String,

  seller: String,
  sellerId: String,

  image: String

});

module.exports = mongoose.model("Book", BookSchema);