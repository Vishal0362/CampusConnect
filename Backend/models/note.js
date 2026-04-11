const mongoose = require("mongoose");

const NoteSchema = new mongoose.Schema({
title: String,
subject: String,
file: String,
uploadedBy: String
});

module.exports = mongoose.model("Note", NoteSchema);