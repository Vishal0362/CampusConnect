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

const ADMIN_EMAILS = new Set(
  String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean)
);

ADMIN_EMAILS.add(normalizeEmail("vishalmisrayt@gmail.com"));

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
      public_id: uploadedPhoto ? uploadedPhoto.public_id : null,
      isAdmin: ADMIN_EMAILS.has(normalizedEmail)
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

const userObject = user.toObject();
userObject.isAdmin = Boolean(user.isAdmin || ADMIN_EMAILS.has(normalizeEmail(user.email)));

res.json({
message:"Login successful",
user: userObject
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

async function resolveAdminUser(req) {
  const adminUserId = req.header("x-admin-user-id") || req.body?.adminUserId || req.query?.adminUserId;

  if (!adminUserId || !mongoose.Types.ObjectId.isValid(adminUserId)) {
    return null;
  }

  const adminUser = await User.findById(adminUserId);

  if (!adminUser || !(adminUser.isAdmin || ADMIN_EMAILS.has(normalizeEmail(adminUser.email)))) {
    return null;
  }

  return adminUser;
}

async function requireAdmin(req, res, next) {
  try {
    const adminUser = await resolveAdminUser(req);

    if (!adminUser) {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.adminUser = adminUser;
    next();
  } catch (error) {
    res.status(500).json({ message: "Unable to verify admin access" });
  }
}

app.get("/admin/summary", requireAdmin, async (req, res) => {
  try {
    const [usersCount, notesCount, booksCount, postsCount] = await Promise.all([
      User.countDocuments(),
      Note.countDocuments(),
      Book.countDocuments(),
      CommunityPost.countDocuments()
    ]);

    res.json({
      usersCount,
      notesCount,
      booksCount,
      postsCount
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to load admin summary" });
  }
});

app.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Unable to load users" });
  }
});

app.patch("/admin/users/:id/admin", requireAdmin, async (req, res) => {
  try {
    const { isAdmin } = req.body;

    if (typeof isAdmin !== "boolean") {
      return res.status(400).json({ message: "isAdmin must be true or false" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (String(req.adminUser._id) === String(req.params.id)) {
      return res.status(400).json({ message: "You cannot change your own admin access" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { isAdmin },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: isAdmin ? "User promoted to admin" : "Admin access removed",
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to update admin role" });
  }
});

async function deleteUserContent(userId) {
  const [notes, books, posts, messages] = await Promise.all([
    Note.find({ uploadedBy: String(userId) }),
    Book.find({ sellerId: String(userId) }),
    CommunityPost.find({ authorId: String(userId) }),
    Message.find({
      $or: [
        { senderId: String(userId) },
        { receiverId: String(userId) }
      ]
    })
  ]);

  await Promise.all(notes.map((note) => destroyCloudinaryAsset(note.public_id)));
  await Promise.all(books.map((book) => destroyCloudinaryAsset(book.public_id)));
  await Promise.all(posts.map((post) => CommunityPost.findByIdAndDelete(post._id)));
  await Promise.all(messages.map((message) => Message.findByIdAndDelete(message._id)));
  await Promise.all(notes.map((note) => Note.findByIdAndDelete(note._id)));
  await Promise.all(books.map((book) => Book.findByIdAndDelete(book._id)));
}

app.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (String(req.adminUser._id) === String(req.params.id)) {
      return res.status(400).json({ message: "You cannot delete your own account from admin panel" });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await deleteUserContent(user._id);

    if (user.public_id) {
      await destroyCloudinaryAsset(user.public_id);
    }

    await User.findByIdAndDelete(user._id);

    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: "Unable to delete user" });
  }
});

app.get("/admin/notes", requireAdmin, async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: "Unable to load notes" });
  }
});

app.delete("/admin/notes/:id", requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid note id" });
    }

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    await destroyCloudinaryAsset(note.public_id);
    await Note.findByIdAndDelete(note._id);

    res.json({ message: "Note deleted" });
  } catch (error) {
    res.status(500).json({ message: "Unable to delete note" });
  }
});

app.get("/admin/books", requireAdmin, async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: "Unable to load books" });
  }
});

app.delete("/admin/books/:id", requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid book id" });
    }

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    await destroyCloudinaryAsset(book.public_id);
    await Book.findByIdAndDelete(book._id);

    res.json({ message: "Book deleted" });
  } catch (error) {
    res.status(500).json({ message: "Unable to delete book" });
  }
});

app.get("/admin/community-posts", requireAdmin, async (req, res) => {
  try {
    const posts = await CommunityPost.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Unable to load community posts" });
  }
});

app.delete("/admin/community-posts/:id", requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    await CommunityPost.findByIdAndDelete(post._id);

    res.json({ message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ message: "Unable to delete post" });
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

app.post("/community-posts/:id/like", async (req, res) => {

try {

const { userId } = req.body;

if (!userId) {
return res.status(400).json({ message: "User is required" });
}

const post = await CommunityPost.findById(req.params.id);

if (!post) {
return res.status(404).json({ message: "Post not found" });
}

const likedBy = Array.isArray(post.likedBy) ? post.likedBy.map(String) : [];
const existingIndex = likedBy.indexOf(String(userId));

if (existingIndex >= 0) {
likedBy.splice(existingIndex, 1);
} else {
likedBy.push(String(userId));
}

post.likedBy = likedBy;
await post.save();

res.json({
message: existingIndex >= 0 ? "Post unliked" : "Post liked",
post
});

} catch (error) {

res.status(500).json({ message: "Unable to update like" });

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

app.get("/messages/active-count", async (req, res) => {
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const messages = await Message.find({
      createdAt: { $gte: since }
    }).select("senderId receiverId");

    const conversations = new Set();

    messages.forEach((message) => {
      const participants = [String(message.senderId || ""), String(message.receiverId || "")].sort();
      if (participants[0] && participants[1]) {
        conversations.add(participants.join(":"));
      }
    });

    res.json({ count: conversations.size });
  } catch (error) {
    res.status(500).json({ message: "Unable to load active chat count" });
  }
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
