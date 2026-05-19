const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
name: String,
email: String,
department: String,
course: String,
semester: String,
year: String,
password: String,
photo: String,
public_id: String
}, { timestamps: true });

module.exports = mongoose.model("user", UserSchema);
