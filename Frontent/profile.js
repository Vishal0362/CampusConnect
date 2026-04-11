const BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://campusconnect-backend-l8vt.onrender.com";
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
    <h2 class="text-xl font-semibold text-gray-900">${user.name}</h2>
    <p class="text-gray-500">${user.department} • ${user.year}</p>
  `;

  // 🔹 DETAILS SECTION
  const details = document.getElementById("profileDetails");

  if (details) {
    details.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">📧</div>
        <div>
          <p class="text-sm text-gray-500">Email</p>
          <p class="text-gray-900">${user.email}</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">👤</div>
        <div>
          <p class="text-sm text-gray-500">Name</p>
          <p class="text-gray-900">${user.name}</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">🏫</div>
        <div>
          <p class="text-sm text-gray-500">Department</p>
          <p class="text-gray-900">${user.department}</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">📅</div>
        <div>
          <p class="text-sm text-gray-500">Year</p>
          <p class="text-gray-900">${user.year}</p>
        </div>
      </div>
    `;
  }

  // 🔹 PROFILE PHOTO

  const photo = document.getElementById("profilePhoto");

  if (photo) {
    photo.src = user.photo
      ? `${BASE_URL}/uploads/${user.photo}`
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
<<<<<<< HEAD
  const notesRes = await fetch(`${BASE_URL}/notes`);
=======
  const notesRes = await fetch(`${BASE_URL}/users`);
>>>>>>> 2fae6bdce5fc6b8e7f77fcf15d40a2944e6e629e
  const notes = await notesRes.json();

  // 👉 FILTER USING NAME (MAIN FIX)
  const userNotes = notes.filter(note => note.uploadedBy === user.name);

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
      <h3 class="font-semibold text-gray-900 mb-1">${note.title}</h3>
      <p class="text-sm text-gray-500 mb-3">${note.subject}</p>

      <a href="${BASE_URL}/uploads/${note.file}" target="_blank"
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