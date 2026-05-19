const mongoose = require("mongoose");

const NoteSchema = new mongoose.Schema({
title: String,
subject: String,
file: String,
public_id: String,
uploadedBy: String,
uploadedByName: String
}, { timestamps: true });

module.exports = mongoose.model("Note", NoteSchema);
