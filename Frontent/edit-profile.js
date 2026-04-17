const BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://campusconnect-backend-l8vt.onrender.com";
const params = new URLSearchParams(window.location.search);
const userId = params.get("id");

async function loadUser() {

  const res = await fetch(`${BASE_URL}/users`);
  const users = await res.json();

  const user = users.find(u => u._id === userId);

  if (!user) return;

  document.getElementById("name").value = user.name;
  document.getElementById("department").value = user.department;
  document.getElementById("year").value = user.year;
}

document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const updatedData = {
    name: document.getElementById("name").value,
    department: document.getElementById("department").value,
    year: document.getElementById("year").value
  };

  await fetch(`${BASE_URL}/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(updatedData)
  });
  // 🔥 GET UPDATED USER FROM BACKEND
  const res = await fetch(`${BASE_URL}/users`);
  const users = await res.json();
  const updatedUser = users.find(u => u._id === userId);

  // 🔥 UPDATE LOCAL STORAGE
  localStorage.setItem("user", JSON.stringify(updatedUser));

  // ✅ REDIRECT
  window.location.href = "dashboard.html";
});

document.addEventListener("DOMContentLoaded", loadUser);
