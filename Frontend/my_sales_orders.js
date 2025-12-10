import {
  BACKEND_URL,
  escapeHtml,
  formatCurrency,
  formatDate,
  safeFetchCurrentUser,
  showLoading,
  hideLoading
} from "/Frontend/shared.js";

// Global state
let userRole = null;

// =========================
// Page Initialization
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  const user = await safeFetchCurrentUser();
  
  if (!user) {
    window.location.href = "/Frontend/login.html";
    return;
  }

  userRole = user.user_type;
  
  // Verify correct role access
  if (userRole !== "customer" && userRole !== "employee") {
    alert("Unauthorized access.");
    window.location.href = "/Frontend/login.html";
    return;
  }

  await loadMyOrders();
  
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) refreshBtn.addEventListener("click", loadMyOrders);
});

// =========================
// Load My Orders
// =========================
async function loadMyOrders() {
  const loading = document.getElementById("loadingMessage");
  const error = document.getElementById("errorMessage");
  const container = document.getElementById("ordersContainer");

  showLoading(loading);
  if (error) error.style.display = "none";
  if (container) container.innerHTML = "";

  try {
    const endpoint = userRole === "customer" 
      ? `${BACKEND_URL}/api/customer/my_sales_orders`
      : `${BACKEND_URL}/api/employee/my_sales_orders`;

    const response = await fetch(endpoint, { method: "GET", credentials: "include" });
    const data = await response.json();
    
    hideLoading(loading);
    if (!response.ok) throw new Error(data.error || "Failed to fetch orders");

    const orders = data.sales_orders || data || [];
    
    updateStatistics(orders);
    
    if (orders.length === 0) {
      container.innerHTML = `<div class="no-orders"><p>No orders found.</p></div>`;
    } else {
      renderOrdersTable(orders, container);
    }

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
// Render & Event Listeners
// =========================
function renderOrdersTable(orders, container) {
  let html = `<table class="common-table"><thead><tr>`;

  const headers = userRole === "customer" 
    ? ["Order ID", "Vehicle VIN", "Sale Date", "Price", "Sales Employee", "Actions"]
    : ["Order ID", "Customer", "Vehicle VIN", "Sale Date", "Price", "Actions"];

  headers.forEach(h => html += `<th>${h}</th>`);
  html += `</tr></thead><tbody>`;

  orders.forEach(order => {
    const orderId = order.ID;
    const vin = order.Vehicle_VIN;
    const price = order.Price;
    const date = order.Sales_Date;

    // Row Data Logic
    const col2 = userRole === "customer" 
      ? `<td>${escapeHtml(String(vin))}</td>`
      : `<td>${escapeHtml(String(order.Customer_Name || order.Customer_ID))}</td>`;
    
    const col3 = userRole === "customer"
      ? `<td>${formatDate(date)}</td>`
      : `<td>${escapeHtml(String(vin))}</td>`;

    const col4 = userRole === "customer"
      ? `<td>${formatCurrency(price)}</td>`
      : `<td>${formatDate(date)}</td>`;
      
    const col5 = userRole === "customer"
      ? `<td>${escapeHtml(String(order.Employee_Name || "Not Assigned"))}</td>`
      : `<td>${formatCurrency(price)}</td>`;

    // Action Buttons Logic
    let actions = `
      <button class="btn-primary btn-view-details" data-id="${vin}" data-type="vehicle">
        View Vehicle
      </button>
    `;

    if (userRole === "customer" && order.Sales_Employee_ID) {
      actions += `
        <button class="btn-primary btn-view-details" data-id="${order.Sales_Employee_ID}" data-type="employee">
          View Employee
        </button>`;
    } else if (userRole === "employee") {
      actions += `
        <button class="btn-primary btn-view-details" data-id="${order.Customer_ID}" data-type="customer">
          View Customer
        </button>`;
    }

    html += `
      <tr>
        <td>${escapeHtml(String(orderId))}</td>
        ${col2}
        ${col3}
        ${col4}
        ${col5}
        <td style="display:flex; gap:0.5rem;">${actions}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;

  // Attach Event Listeners
  container.querySelectorAll(".btn-view-details").forEach(btn => {
    btn.addEventListener("click", async () => {
      const type = btn.getAttribute("data-type");
      const id = btn.getAttribute("data-id");
      
      if (type === "vehicle") await viewVehicleDetails(id);
      else if (type === "employee") await viewEmployeeDetails(id);
      else if (type === "customer") await viewCustomerDetails(id);
    });
  });
}

// =========================
// View Details Actions
// =========================
async function viewVehicleDetails(vin) {
  try {
    // Note: Using employee endpoint as per original code; 
    // ensure backend allows customer access or update this path if needed.
    const response = await fetch(`${BACKEND_URL}/api/employee/vehicle/${vin}`, {
      method: "GET",
      credentials: "include"
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to load vehicle details");

    showDetailsModal("Vehicle Details", formatVehicleDetails(data.vehicle));
  } catch (error) {
    console.error("Error:", error);
    alert("Unable to load vehicle details.");
  }
}

async function viewEmployeeDetails(id) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/customer/employee/${id}`, {
      method: "GET",
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to load employee");

    showDetailsModal("Employee Details", formatEmployeeDetails(data.employee));
  } catch (error) {
    console.error("Error:", error);
    alert("Unable to load employee details.");
  }
}

async function viewCustomerDetails(id) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/employee/customer/${id}`, {
      method: "GET",
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to load customer");

    showDetailsModal("Customer Details", formatCustomerDetails(data.customer));
  } catch (error) {
    console.error("Error:", error);
    alert("Unable to load customer details.");
  }
}

// =========================
// Formatters
// =========================
function formatVehicleDetails(vehicle) {
  return `
    <div class="details-grid">
      <div class="detail-row"><strong>VIN:</strong> <span>${escapeHtml(vehicle.VIN)}</span></div>
      <div class="detail-row"><strong>Make:</strong> <span>${escapeHtml(vehicle.Make)}</span></div>
      <div class="detail-row"><strong>Model:</strong> <span>${escapeHtml(vehicle.Model)}</span></div>
      <div class="detail-row"><strong>Year:</strong> <span>${escapeHtml(vehicle.Year)}</span></div>
      <div class="detail-row"><strong>Color:</strong> <span>${escapeHtml(vehicle.Color)}</span></div>
      <div class="detail-row"><strong>Mileage:</strong> <span>${vehicle.Mileage ? new Intl.NumberFormat('en-US').format(vehicle.Mileage) + ' miles' : 'N/A'}</span></div>
      <div class="detail-row"><strong>Price:</strong> <span>${formatCurrency(vehicle.Price)}</span></div>
    </div>
  `;
}

function formatEmployeeDetails(emp) {
  const name = emp.Name || emp.name || `${emp.First_Name || ''} ${emp.Last_Name || ''}`;
  return `
    <div class="details-grid">
      <div class="detail-row"><strong>Name:</strong> <span>${escapeHtml(name)}</span></div>
      <div class="detail-row"><strong>Email:</strong> <span>${escapeHtml(emp.Email || emp.email)}</span></div>
      <div class="detail-row"><strong>Phone:</strong> <span>${escapeHtml(emp.Phone || emp.phone)}</span></div>
    </div>
  `;
}

function formatCustomerDetails(cust) {
  return `
    <div class="details-grid">
      <div class="detail-row"><strong>Name:</strong> <span>${escapeHtml(cust.Name)}</span></div>
      <div class="detail-row"><strong>Email:</strong> <span>${escapeHtml(cust.Email)}</span></div>
      <div class="detail-row"><strong>Phone:</strong> <span>${escapeHtml(cust.Phone)}</span></div>
      <div class="detail-row"><strong>Address:</strong> <span>${escapeHtml(cust.Address)}</span></div>
    </div>
  `;
}

// =========================
// Modal Logic
// =========================
function showDetailsModal(title, content) {
  let modal = document.getElementById("detailsModal");
  
  // Dynamically create modal if missing
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "detailsModal";
    modal.className = "modal"; // Uses style.css .modal
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h3 id="modalTitle" style="margin-top:0; border-bottom: 1px solid #eee; padding-bottom:10px;"></h3>
        <div id="modalBody" style="margin-top:15px;"></div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector(".close");
    closeBtn.onclick = () => modal.style.display = "none";
    window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };
  }

  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = content;
  modal.style.display = "block";
}

function updateStatistics(orders) {
  const totalValue = orders.reduce((sum, o) => sum + (parseFloat(o.Price) || 0), 0);
  const totalEl = document.getElementById("totalOrders");
  const valEl = document.getElementById("totalValue");
  if (totalEl) totalEl.textContent = orders.length;
  if (valEl) valEl.textContent = formatCurrency(totalValue);
}