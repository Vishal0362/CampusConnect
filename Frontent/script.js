const BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://campusconnect-backend-l8vt.onrender.com";
/* ================= Register ================= */

const registerForm = document.getElementById("registerForm");

if (registerForm) {

  registerForm.addEventListener("submit", async function (e) {

    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const department = document.getElementById("department").value;
    const year = document.getElementById("year").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    const msgBox = document.getElementById("registerMsg");

    // RESET MESSAGE
    msgBox.classList.add("hidden");

    // 🔒 PASSWORD CHECK
    if (password !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    // 📌 DROPDOWN CHECK
    if (!department || !year) {
      showError("Please select department and year");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("department", department);
    formData.append("year", year);
    formData.append("password", password);

    const photoInput = document.getElementById("photo");
    if (photoInput && photoInput.files.length > 0) {
      formData.append("photo", photoInput.files[0]);
    }

      try {

      const response = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        showError(result.message);
        return;
      }

  // ✅ SUCCESS

      // ✅ SUCCESS
      msgBox.innerText = result.message;
      msgBox.className = "bg-green-100 text-green-600 px-4 py-2 rounded-lg text-sm mt-3";
      msgBox.classList.remove("hidden");

      registerForm.reset();

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);

    } catch (error) {
      showError("Server error. Make sure backend is running.");
    }

  });

}

function showError(message){
  const msgBox = document.getElementById("registerMsg");
  msgBox.innerText = message;
  msgBox.className = "bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm mt-3";
  msgBox.classList.remove("hidden");
}


/* ================= Login ================= */

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("loginForm");

  if(!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorBox = document.getElementById("loginError");

    if(errorBox){ errorBox.classList.add("hidden"); }

    try {

      const res = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if(!res.ok){
        if(errorBox){
          errorBox.innerText = data.message;
          errorBox.classList.remove("hidden");
        }
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "dashboard.html";

    } catch (err) {
      if(errorBox){
        errorBox.innerText = "Server error";
        errorBox.classList.remove("hidden");
      }
    }

  });

});

/* ================= Load Students ================= */

let allStudents = [];

async function loadStudents(){

  const container = document.getElementById("studentsList");
  if(!container) return;

  try{
    const response = await fetch(`${BASE_URL}/users`);
    const users = await response.json();
    allStudents = users;
    renderStudents(users);
  }catch(error){
    console.error("Error loading students:", error);
  }

}


/* ================= Render Students ================= */

function renderStudents(users){

  const container = document.getElementById("studentsList");
  if(!container) return;

  container.innerHTML = "";

  users.forEach(user => {

    const card = document.createElement("div");
    card.className = "bg-white p-5 rounded-2xl shadow hover:shadow-lg transition cursor-pointer";
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <img 
            src="${user.photo 
              ? `${BASE_URL}/uploads/${user.photo}` 
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=000&color=fff`}" 
            class="w-14 h-14 rounded-full object-cover"
          >
          <div>
            <h3 class="text-lg font-semibold">${user.name}</h3>
            <p class="text-sm text-gray-500">${user.department}</p>
            <p class="text-xs text-gray-400">Year: ${user.year}</p>
          </div>
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      window.location.href = `profile.html?id=${user._id}`;
    });

    container.appendChild(card);

  });

}

/* ================= Upload Notes ================= */

const uploadForm = document.getElementById("uploadForm");

if (uploadForm) {

  uploadForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const fileInput = document.getElementById("file");

    if (!fileInput.files.length) {
      alert("Please select a PDF file");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
      alert("Please login again");
      return;
    }

    const formData = new FormData();
    formData.append("title", document.getElementById("title").value);
    formData.append("subject", document.getElementById("subject").value);
    formData.append("file", fileInput.files[0]);
    formData.append("uploadedBy", user.name);

    try {


      const response = await fetch(`${BASE_URL}/upload-note`, {

        method: "POST",
        body: formData
      });

      const data = await response.json();

      showToast("Note uploaded successfully");
      uploadForm.reset();
      loadNotes();

    } catch (error) {
      console.error("Upload error:", error);
    }

  });

}


/* ================= Load Notes ================= */

async function loadNotes() {

  const container = document.getElementById("notesList");
  if (!container) return;

  try {

    const response = await fetch(`${BASE_URL}/notes`);
    const notes = await response.json();

    container.innerHTML = "";

    notes.forEach(note => {

      const card = document.createElement("div");
      card.className = "bg-white p-5 rounded-2xl shadow hover:shadow-lg transition";
      card.innerHTML = `
        <div class="flex justify-between items-center mb-3">
          <div class="bg-gray-100 p-2 rounded-lg">📄</div>
        </div>
        <p class="text-sm text-gray-700 mt-2 font-medium uppercase tracking-wide">${note.subject}</p>
        <p class="text-sm text-gray-500 mt-2">${note.title}</p>
        <div class="flex justify-between items-center mt-4 text-sm text-gray-500">
          <span>👤 ${note.uploadedBy || "Unknown"}</span>
          <div class="flex gap-3">
            <a href="${BASE_URL}/uploads/${note.file}" target="_blank" class="hover:text-black">⬇ Download</a>
            ${JSON.parse(localStorage.getItem("user")).name === note.uploadedBy ? `
            <button onclick="deleteNote('${note._id}')" class="text-red-500 hover:text-red-700">Delete</button>
            ` : ""}
          </div>
        </div>
      `;

      container.appendChild(card);

    });

  } catch (error) {
    console.error("Error loading notes:", error);
  }

}

document.getElementById("searchNotes")?.addEventListener("input", function () {
  const value = this.value.toLowerCase();
  document.querySelectorAll("#notesList > div").forEach(card => {
    card.style.display = card.innerText.toLowerCase().includes(value) ? "block" : "none";
  });
});

document.getElementById("file")?.addEventListener("change", function () {
  document.getElementById("fileName").innerText = this.files[0]?.name || "No file chosen";
});

function toggleUploadForm() {
  const modal = document.getElementById("uploadBox");
  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  } else {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

/* ================= Delete Notes ================= */

function deleteNote(id){
  showConfirm("Delete this note?", async () => {
    await fetch(`${BASE_URL}/delete-note/${id}`, { method: "DELETE" });
    showToast("Note deleted successfully");
    loadNotes();
  });
}

/* ================= Student Search ================= */

const searchInput = document.getElementById("studentSearch");

if(searchInput){
  searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase();
    const filtered = allStudents.filter(student =>
      student.name.toLowerCase().includes(value) ||
      student.department.toLowerCase().includes(value)
    );
    renderStudents(filtered);
  });
}

/* ================= Logout ================= */

function logout(){
  showConfirm("Logout from CampusConnect?", () => {
    localStorage.removeItem("user");
    showToast("Logged out successfully");
    setTimeout(() => { window.location.href = "login.html"; }, 1000);
  });
}

/* ================= Marketplace - Sell Book ================= */

const bookForm = document.getElementById("bookForm");

if (bookForm) {

  bookForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = bookForm.querySelector("button");
    submitBtn.innerText = "Uploading...";
    submitBtn.disabled = true;

    const formData = new FormData();
    formData.append("title", document.getElementById("bookTitle").value);
    formData.append("price", document.getElementById("bookPrice").value);
    formData.append("description", document.getElementById("bookDescription").value);

    const user = JSON.parse(localStorage.getItem("user"));
    formData.append("seller", user.name);
    formData.append("sellerId", user._id);

    const imageFile = document.getElementById("bookImage").files[0];
    if (imageFile) { formData.append("image", imageFile); }

    try {

      await fetch(`${BASE_URL}/sell-book`, { method: "POST", body: formData });

      alert("Book listed successfully");
      bookForm.reset();

      const modal = document.getElementById("sellModal");
      if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      }

      loadBooks();

    } catch (err) {
      console.error(err);
      alert("Error uploading book");
    }

    submitBtn.innerText = "Post Listing";
    submitBtn.disabled = false;

  });

}

document.getElementById("bookImage")?.addEventListener("change", function () {
  document.getElementById("bookFileName").innerText = this.files[0]?.name || "No image selected";
});

/* ================= Load Books ================= */

async function loadBooks(){

  const container = document.getElementById("booksList");
  if(!container) return;

  try{

    const response = await fetch(`${BASE_URL}/books`);
    const books = await response.json();

    container.innerHTML = "";

    books.forEach(book => {

      console.log("BOOK IMAGE:", book.image);
      const card = document.createElement("div");
      card.className = "bg-white rounded-2xl shadow hover:shadow-xl transition overflow-hidden";
      card.innerHTML = `
        ${book.image ? `
        <div class="h-48 w-full bg-gray-100">
          <img src="${BASE_URL}/uploads/${book.image}" class="w-full h-full object-cover">
        </div>
        ` : ""}
        <div class="p-4">
          <h3 class="text-lg font-semibold">${book.title}</h3>
          <p class="text-xl font-bold mt-1">₹${book.price}</p>
          <p class="text-sm text-gray-500 mt-1 line-clamp-2">${book.description}</p>
          <p class="text-xs text-gray-400 mt-2">👤 ${book.seller}</p>
          <div class="flex gap-2 mt-4">
            <button onclick="buyBook('${book.sellerId}', '${book.seller}', '${book.title}')"
            class="flex-1 bg-black text-white py-2 rounded-lg hover:opacity-80">Buy</button>
            ${JSON.parse(localStorage.getItem("user"))._id === book.sellerId ? `
            <button onclick="deleteBook('${book._id}')"
            class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">Delete</button>
            ` : ""}
          </div>
        </div>
      `;

      container.appendChild(card);

    });

  } catch(error){
    console.error("Error loading books:", error);
  }

}

document.addEventListener("DOMContentLoaded", () => {
  loadDashboardProfile();
  loadProfile();
  loadStudents();
  loadNotes();
  loadBooks();
});

async function buyBook(sellerId, sellerName, title){

  const currentUser = JSON.parse(localStorage.getItem("user"));

  if(String(sellerId) === String(currentUser._id)){
    alert("This is your own listing");
    return;
  }

  console.log("BUY CLICKED:", sellerId);

  showSection("messagesSection");

  await loadChatUsers();

  setTimeout(async () => {
    await openChat(String(sellerId), sellerName);
    const input = document.getElementById("messageInput");
    input.value = `Hi ${sellerName}, I want to buy "${title}"`;
  }, 200);

}

document.getElementById("searchBooks")?.addEventListener("input", function () {
  const value = this.value.toLowerCase();
  document.querySelectorAll("#booksList > div").forEach(card => {
    card.style.display = card.innerText.toLowerCase().includes(value) ? "block" : "none";
  });
});

/* ================= Show Section ================= */

function showSection(sectionId, event){

  document.querySelectorAll(".page-section").forEach(s => s.classList.add("hidden"));
  document.getElementById(sectionId).classList.remove("hidden");

  // Update sidebar active state
  document.querySelectorAll(".sidebar-item").forEach(item => item.classList.remove("active-nav"));
  if(event && event.currentTarget && event.currentTarget.classList){
    event.currentTarget.classList.add("active-nav");
  }

  // Sync bottom nav
  if(typeof syncBottomNav === "function") syncBottomNav(sectionId);

  // Close mobile sidebar
  if(window.innerWidth <= 768){
    const sidebar = document.getElementById("mainSidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if(sidebar) sidebar.classList.remove("open");
    if(overlay) overlay.classList.remove("active");
  }

}

/* ================= Load Profile (username display) ================= */

function loadProfile(){

  const user = JSON.parse(localStorage.getItem("user"));
  if(!user) return;

  const nameDisplay = document.getElementById("usernameDisplay");
  if(nameDisplay){ nameDisplay.innerText = user.name; }

  const topUser = document.getElementById("topUserName");
  if(topUser){ topUser.innerText = user.name; }

}

/* ================= Load User Notes ================= */

async function loadUserNotes(){

  const user = JSON.parse(localStorage.getItem("user"));
  const response = await fetch(`${BASE_URL}/notes/user/${user._id}`);
  const notes = await response.json();
  const container = document.getElementById("userNotes");
  if(!container) return;

  container.innerHTML="";

  notes.forEach(note=>{
    const card = document.createElement("div");
    card.className="bg-white/20 p-4 rounded-lg";
    card.innerHTML=`
      <h3>${note.title}</h3>
      <p>${note.subject}</p>
      <a href="${BASE_URL}/uploads/${note.file}" target="_blank">Download</a>
    `;
    container.appendChild(card);
  });

}

/* ================= Socket & Messages ================= */

const socket = io(BASE_URL);

let selectedUserId = null;
let selectedUserName = "";

const user = JSON.parse(localStorage.getItem("user"));

socket.on("connect", () => {
  if(user){
    socket.emit("join", user._id);
    console.log("Joined room:", user._id);
  }
});

/* ================= Load Chat Users ================= */

async function loadChatUsers(){

  const container = document.getElementById("chatUsers");

  const res = await fetch(`${BASE_URL}/users`);
  const users = await res.json();

  container.innerHTML = "";

  users.forEach(u => {

    if(String(u._id) === String(user._id)) return;

    const div = document.createElement("div");
    div.className = "chat-user-item";
    div.dataset.id = u._id;

    div.innerHTML = `
      <img 
        src="${u.photo 
          ? `${BASE_URL}/uploads/${u.photo}` 
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=000&color=fff`}" 
        class="chat-user-avatar"
      >
      <div>
        <div class="chat-user-name">${u.name}</div>
        <div class="chat-user-dept">${u.department}</div>
      </div>
    `;

    div.onclick = () => openChat(u._id, u.name);
    container.appendChild(div);

  });

  return users;
}

document.getElementById("chatSearch")?.addEventListener("input", function () {
  const value = this.value.toLowerCase();
  document.querySelectorAll("#chatUsers .chat-user-item").forEach(item => {
    item.style.display = item.innerText.toLowerCase().includes(value) ? "flex" : "none";
  });
});

/* ================= Open Chat ================= */

async function openChat(userId, userName){

  const currentUser = JSON.parse(localStorage.getItem("user"));

  if(String(userId) === String(currentUser._id)){
    alert("You cannot chat with yourself");
    return;
  }

  selectedUserId = String(userId);

  console.log("Opening chat with:", userId);

  document.getElementById("emptyChat").style.display = "none";
  document.getElementById("chatArea").classList.remove("hidden");

  // On mobile, auto-switch to chat tab
  if(window.innerWidth <= 768 && typeof switchChatTab === "function"){
    switchChatTab("chat");
  }

  const chatHeader = document.getElementById("chatHeader");
  chatHeader.innerHTML = `
    <img 
      src="https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=000&color=fff" 
      style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0"
    >
    <span>${userName}</span>
  `;

  const chatBox = document.getElementById("chatBox");
  chatBox.innerHTML = "";

  // Highlight selected user
  document.querySelectorAll(".chat-user-item").forEach(div => {
    div.classList.remove("active-chat");
    if(String(div.dataset.id) === String(userId)){
      div.classList.add("active-chat");
    }
  });

  try {

    const user = JSON.parse(localStorage.getItem("user"));
    const res = await fetch(`${BASE_URL}/messages/${user._id}/${userId}`);
    const messages = await res.json();

    console.log("Loaded messages:", messages);

    messages.forEach(msg => {
      const div = document.createElement("div");
      if(msg.senderId === user._id){
        div.className = "msg-out";
        div.innerHTML = `<div class="msg-bubble-out">${msg.message}</div>`;
      } else {
        div.className = "msg-in";
        div.innerHTML = `<div class="msg-bubble-in">${msg.message}</div>`;
      }
      chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;

  } catch (err) {
    console.error("Error loading messages:", err);
  }

}


/* ================= Send Message ================= */

function sendMessage(){

  const input = document.getElementById("messageInput");
  if(!input.value.trim()) return;

  if(!selectedUserId){
    alert("Select a user first");
    return;
  }

  const user = JSON.parse(localStorage.getItem("user"));

  const messageData = {
    senderId: user._id,
    senderName: user.name,
    receiverId: selectedUserId,
    message: input.value.trim()
  };

  console.log("Sending:", messageData);
  socket.emit("send_message", messageData);

  input.value = "";
}

document.getElementById("messageInput")?.addEventListener("keypress", function(e){
  if(e.key === "Enter"){
    e.preventDefault();
    sendMessage();
  }
});

/* ================= Receive Message ================= */

socket.on("receive_message", (data)=>{

  const chatBox = document.getElementById("chatBox");
  if(!chatBox) return;

  const user = JSON.parse(localStorage.getItem("user"));

  const message = document.createElement("div");

  if(data.senderId === user._id){
    message.className = "msg-out";
    message.innerHTML = `<div class="msg-bubble-out">${data.message}</div>`;
  } else {
    message.className = "msg-in";
    message.innerHTML = `<div class="msg-bubble-in">${data.message}</div>`;
  }

  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;

});

document.addEventListener("DOMContentLoaded", () => {
  loadChatUsers();
});

/* ================= Delete Book ================= */

function deleteBook(id){
  showConfirm("Are you sure you want to delete this book listing?", async () => {
    await fetch(`${BASE_URL}/delete-book/${id}`, { method: "DELETE" });
    showToast("Book deleted successfully");
    loadBooks();
  });
}

/* ================= Dashboard Profile ================= */

function loadDashboardProfile() {

  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  document.getElementById("profileName").innerText = user.name;
  document.getElementById("profileDeptYear").innerText = `${user.department} • ${user.year}`;
  document.getElementById("profileNameDetail").innerText = user.name;
  document.getElementById("profileEmail").innerText = user.email;
  document.getElementById("profileDepartment").innerText = user.department;
  document.getElementById("profileYear").innerText = user.year;

  const profileImg = document.getElementById("profileImage");
  if (profileImg) {
    profileImg.src = user.photo
      ? `${BASE_URL}/uploads/${encodeURIComponent(user.photo)}`
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=000&color=fff`;
  }

  const editBtn = document.getElementById("editProfileBtn");
  if (editBtn) editBtn.style.display = "block";

}

/* ================= Dashboard Stats ================= */

async function loadDashboardStats() {

  try {

    const notesRes = await fetch(`${BASE_URL}/notes`);
    const booksRes = await fetch(`${BASE_URL}/books`);
    const usersRes = await fetch(`${BASE_URL}/users`);

    const notes = await notesRes.json();
    const books = await booksRes.json();
    const users = await usersRes.json();

    document.getElementById("notesCount").innerText = notes.length;
    document.getElementById("marketCount").innerText = books.length;
    document.getElementById("chatCount").innerText = 12;
    document.getElementById("studentCount").innerText = users.length;

    const activityList = document.getElementById("activityList");
    let activityHTML = "";

    notes.slice(-2).reverse().forEach(note => {
      activityHTML += `<li>📄 "${note.title}" uploaded</li>`;
    });
    books.slice(-2).reverse().forEach(book => {
      activityHTML += `<li>🛒 "${book.title}" listed for ₹${book.price}</li>`;
    });
    users.slice(-1).reverse().forEach(user => {
      activityHTML += `<li>🎓 ${user.name} joined platform</li>`;
    });

    if (activityHTML === "") { activityHTML = "<li>No recent activity</li>"; }
    activityList.innerHTML = activityHTML;

  } catch (err) {
    console.error("Dashboard error:", err);
  }

}

document.addEventListener("DOMContentLoaded", () => {

  loadDashboardProfile();
  loadDashboardStats();
  loadProfile();
  loadStudents();
  loadNotes();
  loadBooks();

  const editBtn = document.getElementById("editProfileBtn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user._id) { alert("User not found"); return; }
      window.location.href = `edit-profile.html?id=${user._id}`;
    });
  }

  const openBtn = document.getElementById("openSellModal");
  const modal = document.getElementById("sellModal");
  const closeBtn = document.getElementById("closeSellModal");

  if (openBtn && modal && closeBtn) {
    openBtn.addEventListener("click", () => {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    });
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    });
    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      }
    });
  }

});

/* ================= Toast ================= */

function showToast(message, type = "success") {

  const toast = document.getElementById("toast");
  toast.innerText = message;

  const base = "position:fixed;bottom:80px;right:16px;background:white;box-shadow:0 8px 24px rgba(0,0,0,0.10);border-radius:12px;padding:13px 18px;font-size:14px;transition:all 0.28s ease;z-index:999;max-width:280px;";

  if(type === "success"){
    toast.style.cssText = base + "border-left:3px solid #22c55e;opacity:1;transform:translateY(0)";
  } else {
    toast.style.cssText = base + "border-left:3px solid #ef4444;opacity:1;transform:translateY(0)";
  }

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
  }, 2500);

}

/* ================= Confirm ================= */

function showConfirm(message, onYes){

  const box = document.getElementById("confirmBox");
  const text = document.getElementById("confirmText");
  const yesBtn = document.getElementById("confirmYes");

  text.innerText = message;
  box.classList.remove("hidden");
  box.classList.add("flex");

  yesBtn.onclick = () => {
    onYes();
    closeConfirm();
  };

}

function closeConfirm(){
  const box = document.getElementById("confirmBox");
  box.classList.add("hidden");
  box.classList.remove("flex");
}