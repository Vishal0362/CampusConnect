const BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://campusconnect-backend-l8vt.onrender.com";

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
async function loadProfile() {

  const params = new URLSearchParams(window.location.search);
  const userId = params.get("id");

  if (!userId) return;

  const response = await fetch(`${BASE_URL}/users`);
  const users = await response.json();

  const user = users.find(u => u._id === userId);

  if (!user) return;

  // 🔹 TOP CARD (NAME + SUBTEXT)
  const card = document.getElementById("profileCard");
  if (!card) return;

  card.innerHTML = `
    <h2 class="text-xl font-semibold text-gray-900">${escapeHTML(user.name)}</h2>
    <p class="text-gray-500">${escapeHTML(user.department)} - ${escapeHTML(user.year)}</p>
  `;

  // 🔹 DETAILS SECTION
  const details = document.getElementById("profileDetails");

  if (details) {
    details.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">📧</div>
        <div>
          <p class="text-sm text-gray-500">Email</p>
          <p class="text-gray-900">${escapeHTML(user.email)}</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">👤</div>
        <div>
          <p class="text-sm text-gray-500">Name</p>
          <p class="text-gray-900">${escapeHTML(user.name)}</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">🏫</div>
        <div>
          <p class="text-sm text-gray-500">Department</p>
          <p class="text-gray-900">${escapeHTML(user.department)}</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">📅</div>
        <div>
          <p class="text-sm text-gray-500">Year</p>
          <p class="text-gray-900">${escapeHTML(user.year)}</p>
        </div>
      </div>
    `;
  }

  // 🔹 PROFILE PHOTO

  const photo = document.getElementById("profilePhoto");

  if (photo) {
    photo.src = user.photo
      ? assetUrl(user.photo)
      : "https://i.imgur.com/HeIi0wU.png";
  }

}


async function loadUserNotes() {

  const params = new URLSearchParams(window.location.search);
  const userId = params.get("id");

  if (!userId) return;

  // 👉 GET USER DETAILS
  const usersRes = await fetch(`${BASE_URL}/users`);
  const users = await usersRes.json();

  const user = users.find(u => u._id === userId);
  if (!user) return;

  // 👉 GET ALL NOTES
  const notesRes = await fetch(`${BASE_URL}/notes`);
  const notes = await notesRes.json();

  // 👉 FILTER USING NAME (MAIN FIX)
  const userNotes = notes.filter(note => note.uploadedBy === userId || note.uploadedBy === user.name || note.uploadedByName === user.name);

  const container = document.getElementById("profileNotes");
  if (!container) return;

  container.innerHTML = "";

  // 👉 IF NO NOTES
  if(userNotes.length === 0){
    container.innerHTML = `
      <p class="text-gray-400 text-sm">No notes uploaded yet</p>
    `;
    return;
  }

  userNotes.forEach(note => {

    const card = document.createElement("div");

    card.className = "bg-white rounded-xl shadow p-4";

    card.innerHTML = `
      <h3 class="font-semibold text-gray-900 mb-1">${escapeHTML(note.title)}</h3>
      <p class="text-sm text-gray-500 mb-3">${escapeHTML(note.subject)}</p>

      <a href="${assetUrl(note.file)}" target="_blank"
      class="text-sm text-black font-medium hover:underline">
        Download
      </a>
    `;

    container.appendChild(card);

  });

}


// 🚀 MAIN LOAD
document.addEventListener("DOMContentLoaded", () => {

  loadProfile();
  loadUserNotes();

  // 🔥 EDIT BUTTON
  const editBtn = document.getElementById("editBtn");

  if (editBtn) {
    editBtn.addEventListener("click", () => {

      const params = new URLSearchParams(window.location.search);
      const userId = params.get("id");

      if (!userId) return;

      window.location.href = `edit-profile.html?id=${userId}`;

    });
  }
  

});

function goBack() {
  window.location.href = "dashboard.html";
}

