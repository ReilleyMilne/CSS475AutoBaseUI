import {
  BACKEND_URL,
  escapeHtml,
  formatNumber,
  showLoading,
  hideLoading,
  safeFetchCurrentUser
} from "/Frontend/shared.js";

// Global state
let allVehicles = [];

// =========================
// Page Initialization
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Auth Check
  const user = await safeFetchCurrentUser();
  if (!user || user.user_type !== "customer") {
    alert("Please log in as a customer.");
    window.location.href = "/Frontend/login.html";
    return;
  }

  // 2. Load Data
  await loadCustomerVehicles();
  setupEventListeners();
  setupModalListeners();
});

// =========================
// Data Loading
// =========================
async function loadCustomerVehicles() {
  const loading = document.getElementById("loadingMessage");
  const error = document.getElementById("errorMessage");
  const container = document.getElementById("vehiclesContainer");

  showLoading(loading);
  if (error) error.style.display = "none";
  if (container) container.innerHTML = "";

  try {
    const response = await fetch(`${BACKEND_URL}/api/customer/vehicles`, {
      method: "GET",
      credentials: "include"
    });

    const data = await response.json();
    hideLoading(loading);

    if (!response.ok) throw new Error(data.error || "Failed to fetch vehicles");

    allVehicles = data.vehicles || [];
    
    // Initial Render
    applyFilters();

  } catch (err) {
    hideLoading(loading);
    console.error(err);
    if (error) {
      error.textContent = err.message;
      error.style.display = "block";
    }
  }
}

// =========================
// Filtering & Sorting
// =========================
function applyFilters() {
  const searchVal = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const sortVal = document.getElementById("sortSelect")?.value || "year-desc";
  const container = document.getElementById("vehiclesContainer");

  // 1. Filter
  let filtered = allVehicles.filter(v => {
    const term = `${v.Make} ${v.Model} ${v.Year} ${v.VIN}`.toLowerCase();
    return term.includes(searchVal);
  });

  // 2. Sort
  filtered.sort((a, b) => {
    switch (sortVal) {
      case "year-desc": return b.Year - a.Year;
      case "year-asc": return a.Year - b.Year;
      case "make-asc": return a.Make.localeCompare(b.Make);
      case "make-desc": return b.Make.localeCompare(a.Make);
      default: return 0;
    }
  });

  renderVehicles(filtered, container);
}

// =========================
// Rendering
// =========================
function renderVehicles(vehicles, container) {
  if (!container) return;

  if (vehicles.length === 0) {
    container.innerHTML = `
      <div class="no-vehicles">
        <h3>No Vehicles Found</h3>
        <p>You don't have any vehicles matching your criteria.</p>
      </div>`;
    return;
  }

  container.innerHTML = vehicles.map(v => `
    <div class="vehicle-card">
      <div class="vehicle-header">
        <h3>${escapeHtml(v.Make)} ${escapeHtml(v.Model)}</h3>
        <p class="vehicle-year">${escapeHtml(String(v.Year))}</p>
      </div>

      <div class="vehicle-details">
        <div class="detail-row">
          <span>VIN:</span>
          <strong>${escapeHtml(v.VIN)}</strong>
        </div>
        <div class="detail-row">
          <span>Color:</span>
          <strong>${escapeHtml(v.Color)}</strong>
        </div>
        <div class="detail-row">
          <span>Mileage:</span>
          <strong>${formatNumber(v.Mileage)} mi</strong>
        </div>
      </div>
      
      <button class="btn-primary btn-view-details" data-vin="${v.VIN}">
        View Details
      </button>
    </div>
  `).join("");

  // Attach listeners to new buttons
  container.querySelectorAll(".btn-view-details").forEach(btn => {
    btn.addEventListener("click", () => openVehicleModal(btn.dataset.vin));
  });
}

// =========================
// Modal Logic
// =========================
function openVehicleModal(vin) {
  const vehicle = allVehicles.find(v => v.VIN === vin);
  if (!vehicle) return;

  const modal = document.getElementById("vehicleModal");
  const title = document.getElementById("modalTitle");
  const body = document.getElementById("modalBody");

  if (title) title.textContent = `${vehicle.Year} ${vehicle.Make} ${vehicle.Model}`;
  
  if (body) {
    body.innerHTML = `
      <div class="modal-detail-grid">
        <div class="detail-item"><label>VIN</label><span>${escapeHtml(vehicle.VIN)}</span></div>
        <div class="detail-item"><label>Make</label><span>${escapeHtml(vehicle.Make)}</span></div>
        <div class="detail-item"><label>Model</label><span>${escapeHtml(vehicle.Model)}</span></div>
        <div class="detail-item"><label>Year</label><span>${vehicle.Year}</span></div>
        <div class="detail-item"><label>Color</label><span>${escapeHtml(vehicle.Color)}</span></div>
        <div class="detail-item"><label>Mileage</label><span>${formatNumber(vehicle.Mileage)} mi</span></div>
        <div class="detail-item"><label>Price Sold</label><span>${vehicle.Price ? '$'+formatNumber(vehicle.Price) : 'N/A'}</span></div>
      </div>
    `;
  }

  if (modal) modal.style.display = "block";
}

function closeModal() {
  const modal = document.getElementById("vehicleModal");
  if (modal) modal.style.display = "none";
}

// =========================
// Event Listeners
// =========================
function setupEventListeners() {
  document.getElementById("searchInput")?.addEventListener("input", applyFilters);
  document.getElementById("sortSelect")?.addEventListener("change", applyFilters);
  
  document.getElementById("refreshBtn")?.addEventListener("click", async (e) => {
    const btn = e.target;
    btn.disabled = true;
    await loadCustomerVehicles();
    btn.disabled = false;
  });
}

function setupModalListeners() {
  document.querySelector(".close")?.addEventListener("click", closeModal);
  document.getElementById("closeModalBtn")?.addEventListener("click", closeModal);
  window.addEventListener("click", (e) => {
    if (e.target === document.getElementById("vehicleModal")) closeModal();
  });
}