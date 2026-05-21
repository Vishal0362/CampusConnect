const BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://campusconnect-backend-fo7w.onrender.com";

const ADMIN_EMAILS = new Set([
  "vishalmisrayt@gmail.com"
]);

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function adminHeaders() {
  const user = currentUser();
  return {
    "Content-Type": "application/json",
    "x-admin-user-id": user?._id || ""
  };
}

function showStatus(message, tone = "info") {
  const box = document.getElementById("adminStatus");
  if (!box) return;
  box.className = `status ${tone}`;
  box.textContent = message;
}

function clearStatus() {
  const box = document.getElementById("adminStatus");
  if (!box) return;
  box.className = "status";
  box.textContent = "";
}

function isAdminUser() {
  const user = currentUser();
  const email = String(user?.email || "").trim().toLowerCase();
  return Boolean(user && (user.isAdmin || ADMIN_EMAILS.has(email)));
}

function ensureAdminAccess() {
  const user = currentUser();

  if (!user) {
    window.location.href = "login.html";
    return false;
  }

  if (!user.isAdmin) {
    if (!ADMIN_EMAILS.has(String(user.email || "").trim().toLowerCase())) {
    window.location.href = "dashboard.html";
    return false;
    }
  }

  return true;
}

async function api(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...adminHeaders(),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

function formatDateTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

async function refreshAdminData() {
  if (!ensureAdminAccess()) return;

  clearStatus();
  showStatus("Loading admin data...", "info");

  try {
    const [summary, users, posts, notes, books] = await Promise.all([
      api("/admin/summary"),
      api("/admin/users"),
      api("/admin/community-posts"),
      api("/admin/notes"),
      api("/admin/books")
    ]);

    renderSummary(summary);
    renderUsers(users);
    renderPosts(posts);
    renderNotes(notes);
    renderBooks(books);
    showStatus("Admin data loaded", "success");
  } catch (error) {
    console.error("Admin load failed:", error);
    showStatus(error.message || "Unable to load admin data", "error");
  }
}

function renderSummary(summary) {
  document.getElementById("adminUsersCount").textContent = summary.usersCount ?? 0;
  document.getElementById("adminPostsCount").textContent = summary.postsCount ?? 0;
  document.getElementById("adminNotesCount").textContent = summary.notesCount ?? 0;
  document.getElementById("adminBooksCount").textContent = summary.booksCount ?? 0;
}

function renderUsers(users) {
  const container = document.getElementById("adminUsersList");
  if (!container) return;

  if (!Array.isArray(users) || !users.length) {
    container.innerHTML = `<div class="list-item"><div class="list-item-meta">No users found.</div></div>`;
    return;
  }

  const me = currentUser();

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Details</th>
          <th>Role</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${users.map((user) => {
          const isMe = me && String(me._id) === String(user._id);
          return `
            <tr>
              <td>
                <div style="font-weight:700">${escapeHTML(user.name || "Unnamed user")}</div>
                <div style="color:#64748b;font-size:12px">${escapeHTML(user.department || "No department")}</div>
              </td>
              <td>
                <div>${escapeHTML(user.email || "")}</div>
                <div style="color:#64748b;font-size:12px">${escapeHTML([user.course, user.semester, user.year].filter(Boolean).join(" • "))}</div>
              </td>
              <td><span class="badge ${user.isAdmin ? "admin" : "user"}">${user.isAdmin ? "Admin" : "User"}</span></td>
              <td>
                ${
                  isMe
                    ? `<span style="color:#64748b;font-size:12px">Current account</span>`
                    : `
                      <button class="action-btn ${user.isAdmin ? "demote" : "promote"}" type="button" onclick="toggleAdminRole('${user._id}', ${user.isAdmin ? "false" : "true"})">
                        ${user.isAdmin ? "Remove admin" : "Make admin"}
                      </button>
                      <button class="action-btn delete" type="button" onclick="deleteAdminUser('${user._id}')">Delete</button>
                    `
                }
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderPosts(posts) {
  const container = document.getElementById("adminPostsList");
  if (!container) return;

  if (!Array.isArray(posts) || !posts.length) {
    container.innerHTML = `<div class="list-item"><div class="list-item-meta">No community posts found.</div></div>`;
    return;
  }

  container.innerHTML = posts.map((post) => `
    <div class="list-item">
      <div class="list-item-title">${escapeHTML(post.authorName || "Unknown user")}</div>
      <div class="list-item-meta">${escapeHTML(post.content || "")}</div>
      <div class="list-item-meta" style="margin-top:8px">${escapeHTML(post.authorDepartment || "Campus community")} • ${escapeHTML(formatDateTime(post.createdAt))}</div>
      <div class="list-item-actions">
        <button class="action-btn delete" type="button" onclick="deleteAdminPost('${post._id}')">Delete post</button>
      </div>
    </div>
  `).join("");
}

function renderNotes(notes) {
  const container = document.getElementById("adminNotesList");
  if (!container) return;

  if (!Array.isArray(notes) || !notes.length) {
    container.innerHTML = `<div class="list-item"><div class="list-item-meta">No notes found.</div></div>`;
    return;
  }

  container.innerHTML = notes.map((note) => `
    <div class="list-item">
      <div class="list-item-title">${escapeHTML(note.title || "Untitled note")}</div>
      <div class="list-item-meta">${escapeHTML(note.subject || "General")} • ${escapeHTML([note.course, note.semester].filter(Boolean).join(" • "))}</div>
      <div class="list-item-meta" style="margin-top:8px">Uploaded by ${escapeHTML(note.uploadedByName || "Unknown user")} • ${escapeHTML(formatDateTime(note.createdAt))}</div>
      <div class="list-item-actions">
        <button class="action-btn delete" type="button" onclick="deleteAdminNote('${note._id}')">Delete note</button>
      </div>
    </div>
  `).join("");
}

function renderBooks(books) {
  const container = document.getElementById("adminBooksList");
  if (!container) return;

  if (!Array.isArray(books) || !books.length) {
    container.innerHTML = `<div class="list-item"><div class="list-item-meta">No marketplace listings found.</div></div>`;
    return;
  }

  container.innerHTML = books.map((book) => `
    <div class="list-item">
      <div class="list-item-title">${escapeHTML(book.title || "Untitled book")}</div>
      <div class="list-item-meta">Rs ${escapeHTML(book.price ?? 0)} • ${escapeHTML(book.seller || "Unknown seller")}</div>
      <div class="list-item-meta" style="margin-top:8px">${escapeHTML(book.description || "No description")}</div>
      <div class="list-item-actions">
        <button class="action-btn delete" type="button" onclick="deleteAdminBook('${book._id}')">Delete listing</button>
      </div>
    </div>
  `).join("");
}

async function toggleAdminRole(userId, isAdmin) {
  if (!ensureAdminAccess()) return;

  try {
    const result = await api(`/admin/users/${userId}/admin`, {
      method: "PATCH",
      body: JSON.stringify({ isAdmin })
    });

    showStatus(result.message || "Role updated", "success");
    refreshAdminData();
  } catch (error) {
    showStatus(error.message || "Unable to update role", "error");
  }
}

async function deleteAdminUser(userId) {
  if (!ensureAdminAccess()) return;
  if (!window.confirm("Delete this user and all of their content?")) return;

  try {
    const result = await api(`/admin/users/${userId}`, { method: "DELETE" });
    showStatus(result.message || "User deleted", "success");
    refreshAdminData();
  } catch (error) {
    showStatus(error.message || "Unable to delete user", "error");
  }
}

async function deleteAdminPost(postId) {
  if (!ensureAdminAccess()) return;
  if (!window.confirm("Delete this community post?")) return;

  try {
    const result = await api(`/admin/community-posts/${postId}`, { method: "DELETE" });
    showStatus(result.message || "Post deleted", "success");
    refreshAdminData();
  } catch (error) {
    showStatus(error.message || "Unable to delete post", "error");
  }
}

async function deleteAdminNote(noteId) {
  if (!ensureAdminAccess()) return;
  if (!window.confirm("Delete this note?")) return;

  try {
    const result = await api(`/admin/notes/${noteId}`, { method: "DELETE" });
    showStatus(result.message || "Note deleted", "success");
    refreshAdminData();
  } catch (error) {
    showStatus(error.message || "Unable to delete note", "error");
  }
}

async function deleteAdminBook(bookId) {
  if (!ensureAdminAccess()) return;
  if (!window.confirm("Delete this marketplace listing?")) return;

  try {
    const result = await api(`/admin/books/${bookId}`, { method: "DELETE" });
    showStatus(result.message || "Listing deleted", "success");
    refreshAdminData();
  } catch (error) {
    showStatus(error.message || "Unable to delete listing", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!isAdminUser()) {
    ensureAdminAccess();
    return;
  }

  refreshAdminData();
});
