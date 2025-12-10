import { BACKEND_URL, escapeHtml, formatCurrency, safeFetchCurrentUser } from "/Frontend/shared.js";

document.addEventListener("DOMContentLoaded", async () => {
  await new Promise(resolve => setTimeout(resolve, 100)); // Small buffer
  await loadVehicles();
});

async function loadVehicles() {
  const container = document.getElementById("vehiclesContainer");
  const loading = document.getElementById("vehiclesLoading");
  const error = document.getElementById("vehiclesError");

  try {
    const currentUser = await safeFetchCurrentUser();

    const response = await fetch(`${BACKEND_URL}/api/vehicle/vehicles`, {
      method: "GET",
      credentials: "include"
    });

    const data = await response.json();
    
    if (loading) loading.style.display = "none";
    if (!response.ok) throw new Error(data.error || "Failed to load vehicles");

    renderVehicles(data.vehicle, currentUser, container);

  } catch (err) {
    console.error("Error loading vehicles:", err);
    if (loading) loading.style.display = "none";
    if (error) {
      error.textContent = "Unable to load vehicles.";
      error.style.display = "block";
    }
  }
}

function renderVehicles(vehicles, currentUser, container) {
  if (!container) return;

  if (!vehicles || vehicles.length === 0) {
    container.innerHTML = "<p>No vehicles available.</p>";
    return;
  }

  // Use shared CSS class 'common-table' and 'btn-primary'
  let html = `
    <table class="common-table">
      <thead>
        <tr>
          <th>Make</th>
          <th>Model</th>
          <th>Year</th>
          <th>Price</th>
          <th>Color</th>
          ${currentUser?.user_type === "customer" ? "<th>Action</th>" : ""}
        </tr>
      </thead>
      <tbody>
  `;

  vehicles.forEach(vehicle => {
    html += `
      <tr>
        <td>${escapeHtml(vehicle.Make)}</td>
        <td>${escapeHtml(vehicle.Model)}</td>
        <td>${escapeHtml(vehicle.Year)}</td>
        <td>${formatCurrency(vehicle.Price)}</td>
        <td>${escapeHtml(vehicle.Color)}</td>
        ${
          currentUser?.user_type === "customer"
            ? `<td><button class="buyBtn btn-primary" data-vin="${vehicle.VIN}" data-price="${vehicle.Price}">Buy</button></td>`
            : ""
        }
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;

  // Attach listeners
  if (currentUser?.user_type === "customer") {
    container.querySelectorAll(".buyBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        buyVehicle(btn.getAttribute("data-vin"), btn.getAttribute("data-price"));
      });
    });
  }
}

async function buyVehicle(vin, price) {
  if (!confirm(`Are you sure you want to buy this vehicle for ${formatCurrency(price)}?`)) return;

  try {
    const res = await fetch(`${BACKEND_URL}/api/vehicle/vehicles/buy/${vin}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: price }),
      credentials: "include"
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to purchase.");

    alert("Vehicle purchased successfully!");
    loadVehicles(); // Reload list
  } catch (err) {
    alert(err.message);
  }
}