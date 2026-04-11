const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
name: String,
email: String,
department: String,
year: String,
password: String,
photo: String
});

module.exports = mongoose.model("user", UserSchema);