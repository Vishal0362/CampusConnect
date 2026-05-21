const BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://campusconnect-backend-fo7w.onrender.com";

function assetUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${BASE_URL}/uploads/${encodeURIComponent(value)}`;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function isCurrentUserAdmin() {
  const user = currentUser();
  return Boolean(user && user.isAdmin);
}

function syncAdminAccessUI() {
  const adminBtn = document.getElementById("adminPanelBtn");
  if (!adminBtn) return;

  adminBtn.style.display = isCurrentUserAdmin() ? "inline-flex" : "none";
}
function isStrongPassword(password) {
  return typeof password === "string"
    && password.length >= 8
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

function updatePasswordHintState() {
  const passwordInput = document.getElementById("password");
  const hint = document.getElementById("passwordHint");

  if (!passwordInput || !hint) return;

  const strong = isStrongPassword(passwordInput.value);
  hint.textContent = strong
    ? "Strong password."
    : "Use 8+ characters with uppercase, lowercase, number, and symbol.";
  hint.className = strong
    ? "mt-2 text-xs text-green-600"
    : "mt-2 text-xs text-gray-500";
}

function setupPasswordToggles() {
  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    const inputId = button.getAttribute("data-toggle-password");
    const input = document.getElementById(inputId);

    if (!input || button.dataset.bound === "true") return;

    button.addEventListener("click", () => {
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      button.textContent = showing ? "Show" : "Hide";
    });

    button.dataset.bound = "true";
  });
}
/* ================= Register ================= */

const registerForm = document.getElementById("registerForm");

if (registerForm) {

  setupPasswordToggles();
  document.getElementById("password")?.addEventListener("input", updatePasswordHintState);
  updatePasswordHintState();

  registerForm.addEventListener("submit", async function (e) {

    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value.trim().toLowerCase();
    const department = document.getElementById("department").value;
    const course = document.getElementById("course").value.trim();
    const semester = document.getElementById("semester").value;
    const year = document.getElementById("year").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    const msgBox = document.getElementById("registerMsg");

    // RESET MESSAGE
    msgBox.classList.add("hidden");

    // 🔒 PASSWORD CHECK
    if (!isStrongPassword(password)) {
      showError("Password is not strong. Add uppercase, lowercase, number, and symbol.");
      return;
    }

    if (password !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    // 📌 DROPDOWN CHECK
    if (!department || !course || !semester || !year) {
      showError("Please select department, course, semester, and year");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("department", department);
    formData.append("course", course);
    formData.append("semester", semester);
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

      const responseText = await response.text();
      let result = {};
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        result = { message: responseText };
      }

      if (!response.ok) {
        showError(result.message || "Registration failed");
        return;
      }

  // SUCCESS

      // SUCCESS
      msgBox.innerText = result.message;
      msgBox.className = "bg-green-100 text-green-600 px-4 py-2 rounded-lg text-sm mt-3";
      msgBox.classList.remove("hidden");

      registerForm.reset();
      updatePasswordHintState();

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);

    } catch (error) {
      console.error("Registration request failed:", error, BASE_URL);
      showError(`Network error while contacting ${BASE_URL}`);
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

  setupPasswordToggles();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
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
              ? assetUrl(user.photo)
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=000&color=fff`}" 
            class="w-14 h-14 rounded-full object-cover"
          >
          <div>
            <h3 class="text-lg font-semibold">${escapeHTML(user.name)}</h3>
            <p class="text-sm text-gray-500">${escapeHTML(user.department)}</p>
            <p class="text-xs text-gray-400">${escapeHTML([user.course, user.semester].filter(Boolean).join(" - ") || "Course / Semester not added")}</p>
            <p class="text-xs text-gray-400">Year: ${escapeHTML(user.year)}</p>
          </div>
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      localStorage.setItem("selectedStudentId", user._id);
      window.location.href = `profile.html?id=${user._id}`;
    });

    container.appendChild(card);

  });

}

/* ================= Community Feed ================= */

function formatTimeAgo(value) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return `${Math.floor(diffHours / 24)}d ago`;
}

function formatTimeLeft(value) {
  const expiresAt = new Date(value).getTime() + 7 * 24 * 60 * 60 * 1000;
  const diffMs = Math.max(0, expiresAt - Date.now());
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffMinutes = Math.floor((diffMs % (60 * 60 * 1000)) / 60000);

  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;

  if (diffDays > 0) return `${diffDays}d ${remainingHours}h left`;
  if (diffHours > 0) return `${diffHours}h ${diffMinutes}m left`;
  return `${Math.max(1, diffMinutes)}m left`;
}

function updateCommunityCharCount() {
  const input = document.getElementById("communityPostInput");
  const counter = document.getElementById("communityCharCount");

  if (!input || !counter) return;

  counter.innerText = `${input.value.length} / 280`;
  counter.style.color = input.value.length > 250 ? "#b45309" : "";
}

function renderCommunityPosts(posts) {
  const container = document.getElementById("communityFeed");
  if (!container) return;

  const user = currentUser();

  if (!posts.length) {
    container.innerHTML = `
      <div class="card community-empty-state">
        <div style="font-size:28px;margin-bottom:10px">🗨️</div>
        <div style="font-size:15px;font-weight:700;color:var(--text-primary)">No community posts yet</div>
        <p style="margin:8px 0 0;font-size:13px">Be the first to share what is happening on campus.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = posts.map((post) => {
    const avatar = post.authorPhoto
      ? assetUrl(post.authorPhoto)
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || "Campus User")}&background=000&color=fff`;
    const likedBy = Array.isArray(post.likedBy) ? post.likedBy.map(String) : [];
    const isLiked = user ? likedBy.includes(String(user._id)) : false;
    const likeCount = likedBy.length;

    return `
      <article class="card community-post-card">
        <div class="community-post-header">
          <div class="community-post-author">
            <img src="${avatar}" alt="${escapeHTML(post.authorName || "User")}" class="community-post-avatar">
            <div style="min-width:0">
              <div style="font-size:14px;font-weight:700;color:var(--text-primary)">${escapeHTML(post.authorName || "Unknown user")}</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:3px">${escapeHTML(post.authorDepartment || "Campus community")} · ${escapeHTML(formatTimeAgo(post.createdAt))}</div>
            </div>
          </div>
          ${user && String(user._id) === String(post.authorId) ? `
            <button type="button" class="community-delete-btn" onclick="deleteCommunityPost('${post._id}')">Delete</button>
          ` : ""}
        </div>
        <div class="community-post-body">${escapeHTML(post.content)}</div>
        <div class="community-post-actions">
          <button
            type="button"
            class="community-like-btn ${isLiked ? "is-liked" : ""}"
            onclick="toggleCommunityPostLike('${post._id}')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${isLiked ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20.8 4.6c-1.7-1.8-4.5-1.8-6.2 0L12 7.3 9.4 4.6c-1.7-1.8-4.5-1.8-6.2 0-1.8 1.8-1.8 4.7 0 6.5L12 20l8.8-8.9c1.8-1.8 1.8-4.7 0-6.5Z" />
            </svg>
            <span>${isLiked ? "Liked" : "Like"}</span>
            <span>(${likeCount})</span>
          </button>
        </div>
        <div class="community-post-footer">
          <span>Visible to campus community</span>
          <span>${escapeHTML(formatTimeLeft(post.createdAt))}</span>
        </div>
      </article>
    `;
  }).join("");
}

async function toggleCommunityPostLike(id) {
  const user = currentUser();

  if (!user) {
    showDialog("Please login again", "error");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/community-posts/${id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user._id })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      showToast(result.message || "Unable to update like", "error");
      return;
    }

    loadCommunityPosts();
  } catch (error) {
    console.error("Community like error:", error);
    showToast("Unable to update like", "error");
  }
}

async function loadCommunityPosts() {
  const container = document.getElementById("communityFeed");
  if (!container) return [];

  container.innerHTML = `
    <div class="card community-empty-state">
      <div style="font-size:14px;color:var(--text-secondary)">Loading community posts...</div>
    </div>
  `;

  try {
    const response = await fetch(`${BASE_URL}/community-posts`);
    const posts = await response.json();
    renderCommunityPosts(Array.isArray(posts) ? posts : []);
    return Array.isArray(posts) ? posts : [];
  } catch (error) {
    console.error("Error loading community posts:", error);
    container.innerHTML = `
      <div class="card community-empty-state">
        <div style="font-size:15px;font-weight:700;color:var(--text-primary)">Community feed unavailable</div>
        <p style="margin:8px 0 0;font-size:13px">Try again in a moment.</p>
      </div>
    `;
    return [];
  }
}

async function deleteCommunityPost(id) {
  const user = currentUser();
  if (!user) {
    showDialog("Please login again", "error");
    return;
  }

  showConfirm("Delete this post from the community feed?", async () => {
    const response = await fetch(`${BASE_URL}/community-posts/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorId: user._id })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      showToast(result.message || "Delete failed", "error");
      return;
    }

    showToast("Post deleted");
    loadCommunityPosts();
    loadDashboardStats();
  });
}

const communityPostForm = document.getElementById("communityPostForm");

if (communityPostForm) {
  document.getElementById("communityPostInput")?.addEventListener("input", updateCommunityCharCount);
  updateCommunityCharCount();

  communityPostForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = currentUser();
    const input = document.getElementById("communityPostInput");

    if (!user) {
      showDialog("Please login again", "error");
      return;
    }

    const content = input.value.trim();

    if (!content) {
      showToast("Write something before posting", "error");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/community-posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: user._id,
          authorName: user.name,
          authorDepartment: user.department,
          authorPhoto: user.photo,
          content
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        showToast(result.message || "Unable to share post", "error");
        return;
      }

      input.value = "";
      updateCommunityCharCount();
      showToast("Posted to community feed");
      loadCommunityPosts();
      loadDashboardStats();
    } catch (error) {
      console.error("Community post error:", error);
      showToast("Unable to share post", "error");
    }
  });
}

/* ================= Upload Notes ================= */

const uploadForm = document.getElementById("uploadForm");

if (uploadForm) {

  uploadForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const fileInput = document.getElementById("file");

    if (!fileInput.files.length) {
      showDialog("Please select a PDF file", "error");
      return;
    }

    const user = currentUser();

    if (!user) {
      showDialog("Please login again", "error");
      return;
    }

    const formData = new FormData();
    formData.append("title", document.getElementById("title").value);
    formData.append("subject", document.getElementById("subject").value);
    const noteCourse = document.getElementById("noteCourse").value;
    const noteSemester = document.getElementById("noteSemester").value;
    if (!noteCourse || !noteSemester) {
      showToast("Please choose course and semester", "error");
      submitBtn.innerText = "Upload";
      submitBtn.disabled = false;
      return;
    }
    formData.append("course", noteCourse);
    formData.append("semester", noteSemester);
    formData.append("file", fileInput.files[0]);
    formData.append("uploadedBy", user._id);
    formData.append("uploadedByName", user.name);

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
    const user = currentUser();

    container.innerHTML = "";

    notes.forEach(note => {
      const uploader = note.uploadedByName || note.uploadedBy || "Unknown";
      const noteMeta = [note.course, note.semester].filter(Boolean).join(" • ");

      const card = document.createElement("div");
      card.className = "bg-white p-5 rounded-2xl shadow hover:shadow-lg transition";
      card.innerHTML = `
        <div class="flex justify-between items-center mb-3">
          <div class="bg-gray-100 p-2 rounded-lg">PDF</div>
        </div>
        <p class="text-sm text-gray-700 mt-2 font-medium uppercase tracking-wide">${escapeHTML(note.subject)}</p>
        <p class="text-sm text-gray-500 mt-2">${escapeHTML(note.title)}</p>
        ${noteMeta ? `<p class="text-xs text-gray-400 mt-2">${escapeHTML(noteMeta)}</p>` : ""}
        <div class="flex justify-between items-center mt-4 text-sm text-gray-500">
          <span>User ${escapeHTML(uploader)}</span>
          <div class="flex gap-3">
            <a href="${assetUrl(note.file)}" target="_blank" class="hover:text-black">Download</a>
            ${user && (user._id === note.uploadedBy || user.name === note.uploadedBy || user.name === note.uploadedByName) ? `
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
  }, "Yes, logout");
}

/* ================= Marketplace - Sell Book ================= */

const bookForm = document.getElementById("bookForm");
const paymentModal = document.getElementById("paymentModal");
let selectedPaymentBook = null;

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
    const upiId = document.getElementById("bookUpiId").value.trim();
    if (!upiId) {
      showDialog("Please add your UPI ID so you can receive payment.", "error");
      submitBtn.innerText = "Post Listing";
      submitBtn.disabled = false;
      return;
    }
    formData.append("upiId", upiId);

    const user = currentUser();
    if (!user) {
      showDialog("Please login again", "error");
      submitBtn.innerText = "Post Listing";
      submitBtn.disabled = false;
      return;
    }

    formData.append("seller", user.name);
    formData.append("sellerId", user._id);

    const imageFile = document.getElementById("bookImage").files[0];
    if (imageFile) { formData.append("image", imageFile); }

    try {

      await fetch(`${BASE_URL}/sell-book`, { method: "POST", body: formData });

      showToast("Book listed successfully");
      bookForm.reset();
      document.getElementById("bookFileName").innerText = "No image selected";

      const modal = document.getElementById("sellModal");
      if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      }

      loadBooks();

    } catch (err) {
      console.error(err);
      showDialog("Error uploading book", "error");
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

    const user = currentUser();

    books.forEach(book => {

      console.log("BOOK IMAGE:", book.image);
      const card = document.createElement("div");
      card.className = "bg-white rounded-2xl shadow hover:shadow-xl transition overflow-hidden";
      card.innerHTML = `
      ${book.image ? `
        <div class="h-48 w-full bg-gray-100">
          <img src="${assetUrl(book.image)}" class="w-full h-full object-cover">
        </div>
        ` : ""}
        <div class="p-4">
          <h3 class="text-lg font-semibold">${escapeHTML(book.title)}</h3>
          <p class="text-xl font-bold mt-1">Rs ${escapeHTML(book.price)}</p>
          <p class="text-sm text-gray-500 mt-1 line-clamp-2">${escapeHTML(book.description)}</p>
          <p class="text-xs text-gray-400 mt-2">User ${escapeHTML(book.seller)}</p>
          ${book.upiId ? `<p class="text-xs text-gray-400 mt-1">UPI: ${escapeHTML(book.upiId)}</p>` : ""}
          <div class="flex gap-2 mt-4">
            <button type="button"
            class="buy-book-btn flex-1 bg-black text-white py-2 rounded-lg hover:opacity-80">Buy</button>
            ${user && user._id === book.sellerId ? `
            <button type="button"
            class="delete-book-btn bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">Delete</button>
            ` : ""}
          </div>
        </div>
      `;

      card.querySelector(".buy-book-btn")?.addEventListener("click", () => {
        buyBook(book);
      });
      card.querySelector(".delete-book-btn")?.addEventListener("click", () => {
        deleteBook(book._id);
      });

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

async function buyBook(book){

  const activeUser = currentUser();
  if(!activeUser) return;

  if(String(book.sellerId) === String(activeUser._id)){
    showDialog("This is your own listing", "info");
    return;
  }

  console.log("BUY CLICKED:", book.sellerId);
  openPaymentModal(book);

}

function openPaymentModal(book){
  if(!paymentModal || !book) return;

  selectedPaymentBook = book;

  const titleEl = document.getElementById("paymentBookTitle");
  const sellerEl = document.getElementById("paymentSellerName");
  const amountEl = document.getElementById("paymentAmount");
  const upiEl = document.getElementById("paymentUpiId");
  const subtitleEl = document.getElementById("paymentSubtitle");
  const qrContainer = document.getElementById("paymentQrContainer");
  const qrHint = document.getElementById("paymentQrHint");
  const utrInput = document.getElementById("paymentUtrInput");
  const qrText = buildUpiUri(book);

  if (titleEl) titleEl.innerText = book.title || "Book title";
  if (sellerEl) sellerEl.innerText = book.seller ? `Sold by ${book.seller}` : "Seller";
  if (amountEl) amountEl.innerText = `₹${book.price ?? 0}`;
  if (upiEl) upiEl.innerText = book.upiId || "UPI not added";
  if (subtitleEl) subtitleEl.innerText = "Review the details and confirm payment.";
  if (qrHint) qrHint.innerText = qrText ? "Scan this QR to pay the seller" : "Add a valid UPI ID to generate a QR";
  if (utrInput) utrInput.value = "";

  if (qrContainer) {
    qrContainer.innerHTML = "";
    if (qrText && window.QRCode) {
      new QRCode(qrContainer, {
        text: qrText,
        width: 240,
        height: 240,
        colorDark: "#111827",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      qrContainer.innerHTML = `
        <div style="padding:18px;text-align:center;color:var(--text-secondary);font-size:13px;line-height:1.6">
          QR generation is unavailable. Use the UPI ID below:
          <div style="margin-top:10px;font-weight:700;color:var(--text-primary);word-break:break-word">${escapeHTML(book.upiId || "UPI not added")}</div>
        </div>
      `;
    }
  }

  const qrPayloadHint = document.getElementById("paymentQrHint");
  if (qrPayloadHint && qrText) {
    qrPayloadHint.innerText = "QR includes seller UPI and amount.";
  }

  paymentModal.classList.remove("hidden");
  paymentModal.classList.add("flex");
}

function buildUpiUri(book){
  const upiId = normalizeUpiId(book?.upiId);
  if (!upiId) return "";

  const amount = normalizeAmount(book?.price);
  const payeeName = encodeURIComponent(String(book?.seller || "CampusConnect").trim() || "CampusConnect");
  const purpose = encodeURIComponent(`Payment for ${String(book?.title || "book").trim() || "book"}`);

  let qr = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${payeeName}&cu=INR`;
  if (amount) {
    qr += `&am=${amount}`;
  }
  qr += `&tn=${purpose}`;
  return qr;
}

function normalizeUpiId(value){
  const cleaned = String(value || "").trim();
  if (!cleaned) return "";
  return cleaned.replace(/^upi:/i, "").replace(/^\/\//, "");
}

function normalizeAmount(value){
  const amount = Number(String(value || "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return amount.toFixed(2);
}

function closePaymentModal(){
  if(!paymentModal) return;
  paymentModal.classList.add("hidden");
  paymentModal.classList.remove("flex");
}

async function confirmPayment(){
  if(!selectedPaymentBook) return;

  const utrInput = document.getElementById("paymentUtrInput");
  const utrNumber = String(utrInput?.value || "").trim();

  if (!utrNumber) {
    showDialog("Please enter the UTR number before continuing.", "error");
    return;
  }

  const paidBook = selectedPaymentBook;
  closePaymentModal();
  showToast(`UTR submitted for "${paidBook.title}"`);

  showSection("messagesSection");
  await loadChatUsers();

  setTimeout(async () => {
    await openChat(String(paidBook.sellerId), paidBook.seller);
    const input = document.getElementById("messageInput");
    if (input) {
      input.value = `Hi ${paidBook.seller}, I have completed the payment for "${paidBook.title}". UTR: ${utrNumber}`;
    }
  }, 200);

  selectedPaymentBook = null;
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

  const user = currentUser();
  if(!user) return;

  const nameDisplay = document.getElementById("usernameDisplay");
  if(nameDisplay){ nameDisplay.innerText = user.name; }

  const topUser = document.getElementById("topUserName");
  if(topUser){ topUser.innerText = user.name; }

}

/* ================= Load User Notes ================= */

async function loadUserNotes(){

  const user = currentUser();
  if(!user) return;
  const response = await fetch(`${BASE_URL}/notes/user/${user._id}`);
  const notes = await response.json();
  const container = document.getElementById("userNotes");
  if(!container) return;

  container.innerHTML="";

  notes.forEach(note=>{
    const card = document.createElement("div");
    card.className="bg-white/20 p-4 rounded-lg";
    card.innerHTML=`
      <h3>${escapeHTML(note.title)}</h3>
      <p>${escapeHTML(note.subject)}</p>
      <p class="text-xs opacity-80">${escapeHTML([note.course, note.semester].filter(Boolean).join(" • ") || "Course / Semester not added")}</p>
      <a href="${assetUrl(note.file)}" target="_blank">Download</a>
    `;
    container.appendChild(card);
  });

}

/* ================= Socket & Messages ================= */

const socket = typeof io === "function" ? io(BASE_URL) : null;

let selectedUserId = null;
let selectedUserName = "";

const user = currentUser();

socket?.on("connect", () => {
  if(user){
    socket.emit("join", user._id);
    console.log("Joined room:", user._id);
  }
});

/* ================= Load Chat Users ================= */

async function loadChatUsers(){

  const container = document.getElementById("chatUsers");
  if(!container) return [];

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
          ? assetUrl(u.photo)
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=000&color=fff`}" 
        class="chat-user-avatar"
      >
      <div>
        <div class="chat-user-name">${escapeHTML(u.name)}</div>
        <div class="chat-user-dept">${escapeHTML(u.department)}</div>
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

  const activeUser = currentUser();

  if(!activeUser) return;

  if(String(userId) === String(activeUser._id)){
    showDialog("You cannot chat with yourself", "info");
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
    <span>${escapeHTML(userName)}</span>
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

    const user = currentUser();
    if(!user) return;
    const res = await fetch(`${BASE_URL}/messages/${user._id}/${userId}`);
    const messages = await res.json();

    console.log("Loaded messages:", messages);

    messages.forEach(msg => {
      const div = document.createElement("div");
      if(msg.senderId === user._id){
        div.className = "msg-out";
        div.innerHTML = `<div class="msg-bubble-out">${escapeHTML(msg.message)}</div>`;
      } else {
        div.className = "msg-in";
        div.innerHTML = `<div class="msg-bubble-in">${escapeHTML(msg.message)}</div>`;
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
    showDialog("Select a user first", "error");
    return;
  }

  const user = currentUser();
  if(!user) return;

  const messageData = {
    senderId: user._id,
    senderName: user.name,
    receiverId: selectedUserId,
    message: input.value.trim()
  };

  console.log("Sending:", messageData);
  if(!socket){
    showDialog("Chat is not available on this page", "error");
    return;
  }
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

socket?.on("receive_message", (data)=>{

  const chatBox = document.getElementById("chatBox");
  if(!chatBox) return;

  const user = currentUser();
  if(!user || String(data.senderId) !== String(user._id) && String(data.senderId) !== String(selectedUserId)) return;
  if(String(data.senderId) !== String(user._id) && String(data.receiverId) !== String(user._id)) return;

  const message = document.createElement("div");

  if(data.senderId === user._id){
    message.className = "msg-out";
    message.innerHTML = `<div class="msg-bubble-out">${escapeHTML(data.message)}</div>`;
  } else {
    message.className = "msg-in";
    message.innerHTML = `<div class="msg-bubble-in">${escapeHTML(data.message)}</div>`;
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

  const user = currentUser();
  if (!user) return;

  const profileName = document.getElementById("profileName");
  if (!profileName) return;

  const courseSemester = [user.course, user.semester].filter(Boolean).join(" - ");

  profileName.innerText = user.name;
  document.getElementById("profileDeptYear").innerText = [user.department, courseSemester || user.year].filter(Boolean).join(" - ");
  document.getElementById("profileNameDetail").innerText = user.name;
  document.getElementById("profileEmail").innerText = user.email;
  document.getElementById("profileDepartment").innerText = user.department;
  document.getElementById("profileCourseSemester").innerText = courseSemester || "Not provided";
  document.getElementById("profileYear").innerText = user.year;

  const profileImg = document.getElementById("profileImage");
  if (profileImg) {
    profileImg.src = user.photo
      ? assetUrl(user.photo)
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=000&color=fff`;
  }

  const editBtn = document.getElementById("editProfileBtn");
  if (editBtn) editBtn.style.display = "block";

}

/* ================= Dashboard Stats ================= */

async function loadDashboardStats() {

  const notesCountEl = document.getElementById("notesCount");
  const marketCountEl = document.getElementById("marketCount");
  const chatCountEl = document.getElementById("chatCount");
  const studentCountEl = document.getElementById("studentCount");
  const activityList = document.getElementById("activityList");

  if (!notesCountEl || !marketCountEl || !chatCountEl || !studentCountEl || !activityList) {
    return;
  }

  try {

    const notesRes = await fetch(`${BASE_URL}/notes`);
    const booksRes = await fetch(`${BASE_URL}/books`);
    const usersRes = await fetch(`${BASE_URL}/users`);
    const communityRes = await fetch(`${BASE_URL}/community-posts`);

    const notes = await notesRes.json();
    const books = await booksRes.json();
    const users = await usersRes.json();
    const posts = await communityRes.json();

    notesCountEl.innerText = notes.length;
    marketCountEl.innerText = books.length;
    chatCountEl.innerText = 12;
    studentCountEl.innerText = users.length;

    const activities = [
      ...notes.map(note => ({
        type: "note",
        chip: "Notes",
        title: escapeHTML(note.title || "Untitled note"),
        subtitle: "A new note was uploaded to the dashboard.",
        icon: "note",
        timestamp: getActivityTimestamp(note),
        meta: `${escapeHTML(note.subject || "General")} note`
      })),
      ...books.map(book => ({
        type: "book",
        chip: "Marketplace",
        title: escapeHTML(book.title || "Untitled book"),
        subtitle: `Listed for Rs ${escapeHTML(book.price || 0)} by ${escapeHTML(book.seller || "a user")}.`,
        icon: "book",
        timestamp: getActivityTimestamp(book),
        meta: `Rs ${escapeHTML(book.price || 0)}`
      })),
      ...posts.map(post => ({
        type: "post",
        chip: "Community",
        title: escapeHTML(post.authorName || "A user"),
        subtitle: "Posted a new campus update.",
        icon: "post",
        timestamp: getActivityTimestamp(post),
        meta: "Community post"
      })),
      ...users.map(user => ({
        type: "user",
        chip: "Students",
        title: escapeHTML(user.name || "New student"),
        subtitle: "Joined the platform.",
        icon: "user",
        timestamp: getActivityTimestamp(user),
        meta: "New member"
      }))
    ]
      .filter(item => item.timestamp)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8);

    if (!activities.length) {
      activityList.innerHTML = `
        <div class="activity-empty">
          <div class="activity-icon">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h8m-8 4h8m-8 4h5"/>
            </svg>
          </div>
          <div>No recent activity yet</div>
        </div>
      `;
      return;
    }

    activityList.innerHTML = activities.map(renderActivityItem).join("");

  } catch (err) {
    console.error("Dashboard error:", err);
  }

}

function getActivityTimestamp(item) {
  if (!item) return null;

  if (item.createdAt) {
    const createdAt = new Date(item.createdAt);
    if (!Number.isNaN(createdAt.getTime())) return createdAt.getTime();
  }

  if (item.updatedAt) {
    const updatedAt = new Date(item.updatedAt);
    if (!Number.isNaN(updatedAt.getTime())) return updatedAt.getTime();
  }

  if (item._id && typeof item._id.getTimestamp === "function") {
    return item._id.getTimestamp().getTime();
  }

  if (typeof item._id === "string" && /^[0-9a-fA-F]{24}$/.test(item._id)) {
    return parseInt(item._id.substring(0, 8), 16) * 1000;
  }

  return null;
}

function formatActivityDate(timestamp) {
  if (!timestamp) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(timestamp));
}

function formatActivityTime(timestamp) {
  if (!timestamp) return "";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function renderActivityItem(item) {
  const icons = {
    note: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6M7 8h10M5 4h14v16H5z"/></svg>`,
    book: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 7h13"/></svg>`,
    post: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h7m-7 4h11M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H8l-5 3V7a2 2 0 012-2z"/></svg>`,
    user: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5.121 17.804A9 9 0 1118.364 4.636M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`
  };

  return `
    <div class="activity-item ${item.type}">
      <div class="activity-icon">${icons[item.icon] || icons.note}</div>
      <div class="activity-content">
        <div class="activity-topline">
          <div class="activity-title">${item.title}</div>
          <div class="activity-chip">${escapeHTML(item.chip || "Activity")}</div>
        </div>
        <div class="activity-subtitle">${escapeHTML(item.subtitle || "")}</div>
        <div class="activity-meta">
          <span>${escapeHTML(item.meta || "Activity")}</span>
          <span class="activity-dot"></span>
          <span>${escapeHTML(formatActivityDate(item.timestamp))}</span>
          <span class="activity-dot"></span>
          <span>${escapeHTML(formatActivityTime(item.timestamp))}</span>
        </div>
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {

  loadDashboardProfile();
  syncAdminAccessUI();
  loadDashboardStats();
  loadProfile();
  loadStudents();
  loadNotes();
  loadCommunityPosts();
  loadBooks();

  const editBtn = document.getElementById("editProfileBtn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      const user = currentUser();
      if (!user || !user._id) { showDialog("User not found", "error"); return; }
      window.location.href = `edit-profile.html?id=${user._id}`;
    });
  }

  const openBtn = document.getElementById("openSellModal");
  const modal = document.getElementById("sellModal");
  const closeBtn = document.getElementById("closeSellModal");
  const closePaymentBtn = document.getElementById("closePaymentModal");
  const cancelPaymentBtn = document.getElementById("cancelPaymentBtn");
  const confirmPaymentBtn = document.getElementById("confirmPaymentBtn");

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

  if (closePaymentBtn) {
    closePaymentBtn.addEventListener("click", closePaymentModal);
  }
  if (cancelPaymentBtn) {
    cancelPaymentBtn.addEventListener("click", closePaymentModal);
  }
  if (confirmPaymentBtn) {
    confirmPaymentBtn.addEventListener("click", confirmPayment);
  }
  if (paymentModal) {
    paymentModal.addEventListener("click", (e) => {
      if (e.target === paymentModal) {
        closePaymentModal();
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

function showDialog(message, type = "info", title = "Notice") {
  const box = document.getElementById("dialogBox");
  const text = document.getElementById("dialogText");
  const icon = document.getElementById("dialogIcon");
  const okBtn = document.getElementById("dialogOk");

  if (!box || !text || !icon || !okBtn) {
    return;
  }

  text.innerText = message;

  const styles = {
    success: {
      bg: "#dcfce7",
      color: "#166534",
      border: "#bbf7d0"
    },
    error: {
      bg: "#fee2e2",
      color: "#b91c1c",
      border: "#fecaca"
    },
    info: {
      bg: "#f3f4f6",
      color: "#111827",
      border: "#e5e7eb"
    }
  };

  const theme = styles[type] || styles.info;
  icon.style.background = theme.bg;
  icon.style.color = theme.color;
  icon.style.border = `1px solid ${theme.border}`;
  okBtn.style.background = theme.color;
  okBtn.style.color = "#fff";

  okBtn.onclick = closeDialog;
  box.classList.remove("hidden");
  box.classList.add("flex");
}

function closeDialog(){
  const box = document.getElementById("dialogBox");
  if (!box) return;
  box.classList.add("hidden");
  box.classList.remove("flex");
}

document.getElementById("dialogOk")?.addEventListener("click", closeDialog);
document.getElementById("dialogBox")?.addEventListener("click", (e) => {
  if (e.target && e.target.id === "dialogBox") {
    closeDialog();
  }
});

/* ================= Confirm ================= */

function showConfirm(message, onYes, confirmLabel = "Yes, delete"){

  const box = document.getElementById("confirmBox");
  const text = document.getElementById("confirmText");
  const yesBtn = document.getElementById("confirmYes");

  text.innerText = message;
  yesBtn.innerText = confirmLabel;
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




