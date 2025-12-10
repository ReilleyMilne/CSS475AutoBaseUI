import { BACKEND_URL, safeFetchCurrentUser } from "/Frontend/shared.js";

// =========================
// Initialization
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  const navbarContainer = document.getElementById("navbar");
  if (navbarContainer) await loadNavbar(navbarContainer);

  const loginForm = document.getElementById("loginForm");
  const user = await safeFetchCurrentUser();
  
  handlePageProtection(user);
  updateNavbarState(user);

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleLogin();
    });
  }
});

// =========================
// Navbar
// =========================
async function loadNavbar(container) {
  try {
    const response = await fetch("/Frontend/navbar.html");
    if (!response.ok) throw new Error(`Failed to load navbar: ${response.status}`);
    container.innerHTML = await response.text();

    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (loginBtn) loginBtn.addEventListener("click", () => (window.location.href = "/Frontend/login.html"));
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
  } catch (err) {
    console.error("Error loading navbar:", err);
  }
}

// =========================
// Auth Actions
// =========================
async function handleLogin() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const role = document.getElementById("role").value;

  if (!role) return alert("Please select a role.");

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, user_type: role }),
      credentials: "include"
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Login failed");

    alert(`Logged in as ${role}: ${username}`);
    if (role === "employee") {
      window.location.href = "/Frontend/employee/employee.html";
    } else if (role === "manager") {
      window.location.href = "/Frontend/manager/manager.html";
    } else {
      window.location.href = "/Frontend/customer/customer.html";
    }
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

async function handleLogout() {
  try {
    await fetch(`${BACKEND_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
    alert("Logged out successfully!");
    window.location.href = "/Frontend/index.html";
  } catch (err) {
    console.error(err);
    alert("Error logging out.");
  }
}

// =========================
// UI State
// =========================
function updateNavbarState(user) {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userGreeting = document.getElementById("userGreeting");
  const navLeft = document.getElementById("nav-left");

  if (!navLeft) return;

  // base logo/link
  navLeft.innerHTML = `<a href="/Frontend/index.html" class="logo">AutoBase</a>`;

  if (user && user.username) {
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    if (userGreeting) userGreeting.textContent = `👋 ${user.username} (${user.user_type})`;

    if (user.user_type === "employee") {
      navLeft.innerHTML += `
        <a href="/Frontend/employee/sales_orders/sales_orders.html">Sales Orders</a>
        <a href="/Frontend/my_sales_orders.html">Current Sales Orders</a>
        <a href="/Frontend/employee/tools.html">Employee Tools</a>
      `;
    } else if (user.user_type === "customer") {
      navLeft.innerHTML += `
        <a href="/Frontend/customer/customer.html">My Account</a>
        <a href="/Frontend/customer/vehicles/vehicles.html">Vehicles</a>
        <a href="/Frontend/my_sales_orders.html">Current Sales Orders</a>
      `;
    } else if (user.user_type === "manager") {
      navLeft.innerHTML += `
        <a href="/Frontend/manager/manager.html">Manager Dashboard</a>
        <a href="/Frontend/employee/sales_orders/sales_orders.html">Sales Orders</a>
        <a href="/Frontend/employee/tools.html">Employee Tools</a>
      `;
    }
  } else {
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
  }

  // always show available vehicles
  navLeft.innerHTML += `<a href="/Frontend/available_vehicles.html">Available Vehicles</a>`;
}

function handlePageProtection(user) {
  const path = window.location.pathname;
  if (path.includes("/employee/") && (!user || (user.user_type !== "employee" && user.user_type !== "manager"))) {
    alert("Unauthorized access.");
    window.location.href = "/Frontend/login.html";
  }
  if (path.includes("/customer/") && (!user || user.user_type !== "customer")) {
    alert("Unauthorized access.");
    window.location.href = "/Frontend/login.html";
  }
}