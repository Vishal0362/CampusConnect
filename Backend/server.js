require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const http = require("http");
const { Server } = require("socket.io");

const User = require("./models/user");
const Note = require("./models/note");
const Book = require("./models/book");
const Message = require("./models/message");
const CommunityPost = require("./models/communityPost");

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  upload_prefix: "https://api.cloudinary.com"
});

const cloudinaryEnv = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY || process.env.API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET
};
const cloudinarySdkVersion = require("cloudinary/package.json").version;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

function singleUpload(fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        console.error(`${fieldName} upload failed:`, {
          message: err.message,
          http_code: err.http_code,
          name: err.name,
          cloudNameConfigured: Boolean(cloudinaryEnv.cloudName),
          apiKeyConfigured: Boolean(cloudinaryEnv.apiKey),
          apiSecretConfigured: Boolean(cloudinaryEnv.apiSecret)
        });
        const message = /403/.test(err.message || "")
          ? "Cloudinary rejected the upload (403). Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on Render."
          : `File upload failed: ${err.message || "check Cloudinary settings"}`;
        return res.status(500).json({
          message
        });
      }
      next();
    });
  };
}

async function destroyCloudinaryAsset(publicId) {
  if (!publicId) return;

  const imageResult = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  if (imageResult.result === "not found") {
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
  }
}

function uploadToCloudinary(file, resourceType = "auto") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "campusconnect",
        resource_type: resourceType
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(file.buffer);
  });
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isStrongPassword(password) {
  return typeof password === "string"
    && password.length >= 8
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

/* ---------------- Middleware ---------------- */

app.use(cors({
  origin: "*"
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------------- MongoDB Connection ---------------- */
console.log("ENV CHECK:", process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

/* ---------------- Home ---------------- */

app.get("/", (req,res)=>{
res.send("CampusConnect Backend Running");
});

app.get("/cloudinary-check", async (req, res) => {
  try {
    const ping = await cloudinary.api.ping();
    res.json({
      ok: true,
      cloudNameConfigured: Boolean(cloudinaryEnv.cloudName),
      apiKeyConfigured: Boolean(cloudinaryEnv.apiKey),
      apiSecretConfigured: Boolean(cloudinaryEnv.apiSecret),
      cloudName: cloudinaryEnv.cloudName,
      sdkVersion: cloudinarySdkVersion,
      ping
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      cloudNameConfigured: Boolean(cloudinaryEnv.cloudName),
      apiKeyConfigured: Boolean(cloudinaryEnv.apiKey),
      apiSecretConfigured: Boolean(cloudinaryEnv.apiSecret),
      cloudName: cloudinaryEnv.cloudName,
      sdkVersion: cloudinarySdkVersion,
      message: error.message,
      http_code: error.http_code
    });
  }
});

app.get("/cloudinary-upload-check", async (req, res) => {
  try {
    const buffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64"
    );
    const result = await uploadBufferToCloudinary({ buffer }, "image");
    await destroyCloudinaryAsset(result.public_id);
    res.json({
      ok: true,
      sdkVersion: cloudinarySdkVersion,
      urlCreated: Boolean(result.secure_url),
      public_id: result.public_id
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      sdkVersion: cloudinarySdkVersion,
      message: error.message,
      http_code: error.http_code
    });
  }
});

/* ---------------- Register ---------------- */

app.post("/register", singleUpload("photo"), async (req, res) => {

  try {

    const { name, email, department, course, semester, year, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    // ✅ VALIDATION
    if (!name || !normalizedEmail || !department || !course || !semester || !year || !password) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol"
      });
    }

    // CHECK EXISTING USER
    const existingUser = await User.findOne({
      email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: "i" }
    });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // CREATE USER
    const uploadedPhoto = req.file
      ? await uploadToCloudinary(req.file, "image")
      : null;

    const user = new User({
      name,
      email: normalizedEmail,
      department,
      course,
      semester,
      year,
      password,
      photo: uploadedPhoto ? uploadedPhoto.secure_url : null,
      public_id: uploadedPhoto ? uploadedPhoto.public_id : null
    });

    await user.save();

    res.status(200).json({ message: "User Registered Successfully" });

  } catch (error) {

    console.log(error);
    res.status(500).json({ message: "Registration Failed" });

  }

});

/* ---------------- Login ---------------- */

app.post("/login", async (req,res)=>{

try{

const { email, password } = req.body;
const normalizedEmail = normalizeEmail(email);

const user = await User.findOne({
email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: "i" }
});

if(!user){
return res.status(400).json({message:"User not found"});
}

if(user.password !== password){
return res.status(400).json({message:"Invalid password"});
}

res.json({
message:"Login successful",
user
});

}catch(error){

res.status(500).json({message:"Server error"});

}

});

/* ---------------- Get All Users ---------------- */

app.get("/users", async (req,res)=>{

try{

const users = await User.find();
res.json(users);

}catch(error){

res.status(500).json({message:"Error fetching users"});

}

});

app.get("/users/:id", async (req, res) => {

try{

if(!mongoose.Types.ObjectId.isValid(req.params.id)){
return res.status(400).json({message:"Invalid user id"});
}

const user = await User.findById(req.params.id);

if(!user){
return res.status(404).json({message:"User not found"});
}

res.json(user);

}catch(error){

res.status(500).json({message:"Error fetching user"});

}

});

/* ---------------- Community Posts ---------------- */

app.post("/community-posts", async (req, res) => {

try {

const { authorId, authorName, authorDepartment, authorPhoto, content } = req.body;

if (!authorId || !authorName || !content || !String(content).trim()) {
return res.status(400).json({ message: "Author and post content are required" });
}

const trimmedContent = String(content).trim();

if (trimmedContent.length > 280) {
return res.status(400).json({ message: "Post must be 280 characters or less" });
}

const post = await CommunityPost.create({
authorId,
authorName,
authorDepartment,
authorPhoto,
content: trimmedContent
});

res.status(201).json({
message: "Post shared successfully",
post
});

} catch (error) {

console.log(error);
res.status(500).json({ message: "Unable to create post" });

}

});

app.get("/community-posts", async (req, res) => {

try {

const posts = await CommunityPost.find()
  .sort({ createdAt: -1 })
  .limit(100);

res.json(posts);

} catch (error) {

res.status(500).json({ message: "Error fetching community posts" });

}

});

app.delete("/community-posts/:id", async (req, res) => {

try {

const { authorId } = req.body;
const post = await CommunityPost.findById(req.params.id);

if (!post) {
return res.status(404).json({ message: "Post not found" });
}

if (!authorId || String(post.authorId) !== String(authorId)) {
return res.status(403).json({ message: "You can only delete your own posts" });
}

await CommunityPost.findByIdAndDelete(req.params.id);

res.json({ message: "Post deleted" });

} catch (error) {

res.status(500).json({ message: "Delete failed" });

}

});

/* ---------------- Upload Notes ---------------- */

app.post("/upload-note", singleUpload("file"), async (req,res)=>{

try{

if(!req.file){
return res.status(400).json({message:"No file uploaded"});
}

const uploadedNote = await uploadToCloudinary(req.file, "raw");
const course = String(req.body.course || "").trim();
const semester = String(req.body.semester || "").trim();

if (!req.body.title || !req.body.subject || !course || !semester) {
  return res.status(400).json({ message: "Title, subject, course, and semester are required" });
}

const note = new Note({
title:req.body.title,
subject:req.body.subject,
course,
semester,
file: uploadedNote.secure_url,
public_id: uploadedNote.public_id,
uploadedBy:req.body.uploadedBy,
uploadedByName:req.body.uploadedByName
});

await note.save();

res.json({message:"Note uploaded successfully"});

}catch(error){

console.log(error);
res.status(500).json({message:"Upload failed"});

}

});

/* ---------------- Get Notes ---------------- */

app.get("/notes", async (req,res)=>{

try{

const notes = await Note.find();
res.json(notes);

}catch(error){

res.status(500).json({message:"Error fetching notes"});

}

});

/*Api for notes*/

app.get("/notes/user/:userId", async (req,res)=>{

try{

const user = mongoose.Types.ObjectId.isValid(req.params.userId)
  ? await User.findById(req.params.userId)
  : null;
const ownerKeys = [req.params.userId];
if (user && user.name) ownerKeys.push(user.name);

const notes = await Note.find({
  $or: [
    { uploadedBy: { $in: ownerKeys } },
    { uploadedByName: { $in: ownerKeys } }
  ]
});

res.json(notes);

}catch(error){

res.status(500).json({message:"Error fetching user notes"});

}

});

/* ---------------- Delete Note ---------------- */

app.delete("/delete-note/:id", async (req,res)=>{

try{

const note = await Note.findById(req.params.id);

if(!note){
return res.status(404).json({message:"Note not found"});
}

await destroyCloudinaryAsset(note.public_id);

await Note.findByIdAndDelete(req.params.id);

res.json({message:"Note deleted"});

}catch(error){

res.status(500).json({message:"Delete failed"});

}

});

/* ================= Sell Book ================= */

app.post("/sell-book", singleUpload("image"), async (req,res)=>{

try{

const uploadedBookImage = req.file
  ? await uploadToCloudinary(req.file, "image")
  : null;
const upiId = String(req.body.upiId || "").trim();

if (!upiId) {
  return res.status(400).json({ message: "UPI ID is required" });
}

const book = new Book({

title:req.body.title,
price:req.body.price,
description:req.body.description,
seller: req.body.seller,
sellerId: req.body.sellerId,
upiId,
image: uploadedBookImage ? uploadedBookImage.secure_url : null,
public_id: uploadedBookImage ? uploadedBookImage.public_id : null

});

await book.save();

res.json({message:"Book listed successfully"});

}catch(error){

console.log(error);
res.status(500).json({message:"Listing failed"});

}

});

/* ================= Get Books ================= */

app.get("/books", async (req,res)=>{

try{

const books = await Book.find();
res.json(books);

}catch(error){

res.status(500).json({message:"Error fetching books"});

}

});

/* ================= Delete Book ================= */

app.delete("/delete-book/:id", async (req,res)=>{

try{

const book = await Book.findByIdAndDelete(req.params.id);

if(book && book.image){

await destroyCloudinaryAsset(book.public_id);

}

res.json({message:"Book deleted successfully"});

}catch(error){

console.log(error);
res.status(500).json({message:"Delete failed"});

}

});

/* ---------------- Socket.IO Chat ---------------- */
io.on("connection", (socket) => {

  console.log("User connected");

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log("User joined room:", userId);
  });

    socket.on("send_message", async (data) => {

    // SAVE TO DB
    await Message.create(data);

    // SEND REALTIME
    io.to(data.receiverId).emit("receive_message", data);
    io.to(data.senderId).emit("receive_message", data);

    });

});


app.get("/messages/:user1/:user2", async (req, res) => {

  const { user1, user2 } = req.params;

  const messages = await Message.find({
    $or: [
      { senderId: user1, receiverId: user2 },
      { senderId: user2, receiverId: user1 }
    ]
  }).sort({ createdAt: 1 });

  res.json(messages);

});
/* ---------------- Start Server ---------------- */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

/* profile edit */

app.put("/users/:id", async (req, res) => {
  try {

    await User.findByIdAndUpdate(req.params.id, req.body);

    res.send("User Updated");

  } catch (err) {
    res.status(500).send("Update Failed");
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  if (res.headersSent) return next(err);
  res.status(500).json({
    message: err.message || "Internal Server Error"
  });
});
