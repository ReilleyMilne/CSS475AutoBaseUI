import {
  BACKEND_URL,
  escapeHtml,
  formatCurrency,
  formatDate,
  showLoading,
  hideLoading,
  safeFetchCurrentUser
} from "/Frontend/shared.js";

// Global state
let allOrders = [];
let allEmployees = [];
let selectedOrderId = null;

// =========================
// Page Initialization
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  const user = await safeFetchCurrentUser();
  
  // Allow both employee and manager access
  if (!user || (user.user_type !== "employee" && user.user_type !== "manager")) {
    alert("Unauthorized access. Employee or Manager accounts only.");
    window.location.href = "/Frontend/login.html";
    return;
  }

  // Small delay to ensure DOM is ready for shared animations if needed
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Load data in parallel
  await Promise.all([loadEmployees(), loadSalesOrders()]);
  
  setupEventListeners();
  setupModalListeners();
});

// =========================
// Data Loading
// =========================
async function loadEmployees() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/employee/employees`, {
      method: "GET",
      credentials: "include"
    });
    const data = await response.json();
    if (response.ok) allEmployees = data.employees || data || [];
  } catch (error) {
    console.error("Error loading employees:", error);
  }
}

async function loadSalesOrders() {
  const loadingMessage = document.getElementById("loadingMessage");
  const errorMessage = document.getElementById("errorMessage");
  const ordersContainer = document.getElementById("ordersContainer");

  showLoading(loadingMessage);
  if (errorMessage) errorMessage.style.display = "none";
  if (ordersContainer) ordersContainer.innerHTML = "";

  try {
    const response = await fetch(`${BACKEND_URL}/api/employee/sales_orders`, {
      method: "GET",
      credentials: "include"
    });

    const data = await response.json();
    hideLoading(loadingMessage);

    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);

    allOrders = data.sales_orders || data || [];

    if (allOrders.length === 0) {
      ordersContainer.innerHTML = `<div class="no-orders"><p>No orders match your current filters.</p></div>`;
    } else {
      displayOrdersTable(allOrders, ordersContainer);
      updateStatistics(allOrders);
    }
  } catch (error) {
    hideLoading(loadingMessage);
    console.error(error);
    if (errorMessage) {
      errorMessage.textContent = `Failed to load: ${error.message}`;
      errorMessage.style.display = "block";
    }
  }
}

// =========================
// Display Logic
// =========================
function displayOrdersTable(orders, container) {
  if (!container) return;
  
  // Use .common-table from style.css
  let html = `
    <table class="common-table">
      <thead>
        <tr>
          <th>Order ID</th>
          <th>Customer</th>
          <th>Vehicle VIN</th>
          <th>Sale Date</th>
          <th>Sales Employee</th>
          <th>Price</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  orders.forEach(order => {
    // Resolve Customer Name
    const customerName = order.Customer_Name || `Customer #${order.Customer_ID}`;
    
    // Resolve Employee Name
    let employeeName = "Not Assigned";
    if (order.Sales_Employee_ID) {
      // First try Sales_Employee_Name from the query
      if (order.Sales_Employee_Name) {
        employeeName = order.Sales_Employee_Name;
      } else {
        // Fallback to matching from employee list
        const matchedEmp = allEmployees.find(e => e.ID == order.Sales_Employee_ID);
        if (matchedEmp) {
          employeeName = matchedEmp.Name || matchedEmp.name || `Employee #${order.Sales_Employee_ID}`;
        } else {
          employeeName = `Employee #${order.Sales_Employee_ID}`;
        }
      }
    }

    // Use .btn-primary from style.css, add 'assignBtn' for event targeting
    html += `
      <tr>
        <td>${escapeHtml(String(order.ID))}</td>
        <td>${escapeHtml(customerName)}</td>
        <td>${escapeHtml(order.Vehicle_VIN)}</td>
        <td>${formatDate(order.Sales_Date)}</td>
        <td>${escapeHtml(employeeName)}</td>
        <td>${formatCurrency(order.Price)}</td>
        <td>
          <button class="btn-primary assignBtn" 
            data-order-id="${order.ID}" 
            data-customer="${escapeHtml(customerName)}">
            ${order.Sales_Employee_ID ? 'Reassign' : 'Assign'}
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;

  // Attach Listeners
  document.querySelectorAll(".assignBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      openAssignModal(btn.getAttribute("data-order-id"), btn.getAttribute("data-customer"));
    });
  });
}

// =========================
// Modal Logic
// =========================
function openAssignModal(orderId, customerName) {
  selectedOrderId = orderId;
  const modal = document.getElementById("assignModal");
  const modalOrderInfo = document.getElementById("modalOrderInfo");
  const employeeSelect = document.getElementById("employeeSelect");

  if (modalOrderInfo) modalOrderInfo.textContent = `Order #${orderId} - ${customerName}`;

  if (employeeSelect) {
    let optionsHtml = '<option value="">-- Select Employee --</option>';
    allEmployees.forEach(emp => {
      const empName = (emp.Name || emp.name || `Employee #${emp.ID}`).trim();
      optionsHtml += `<option value="${emp.ID}">${escapeHtml(empName)}</option>`;
    });
    employeeSelect.innerHTML = optionsHtml;
  }

  if (modal) modal.style.display = "block";
}

function closeModal() {
  const modal = document.getElementById("assignModal");
  if (modal) modal.style.display = "none";
  selectedOrderId = null;
}

async function handleAssignEmployee() {
  const employeeId = document.getElementById("employeeSelect")?.value;
  if (!employeeId || !selectedOrderId) return alert("Please select an employee and order.");

  try {
    const response = await fetch(`${BACKEND_URL}/api/employee/sales_orders/assign/${employeeId}/${selectedOrderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: employeeId }),
      credentials: "include"
    });

    if (!response.ok) throw new Error((await response.json()).error || "Assignment failed");

    alert("Employee assigned successfully!");
    closeModal();
    loadSalesOrders();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

// =========================
// Filters & Stats
// =========================
function setupEventListeners() {
  document.getElementById("customerFilter")?.addEventListener("input", applyFilters);
  document.getElementById("orderIdFilter")?.addEventListener("input", applyFilters);
  document.getElementById("clearFilters")?.addEventListener("click", clearFilters);
  
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => loadSalesOrders());
  }
}

function setupModalListeners() {
  document.querySelector(".close")?.addEventListener("click", closeModal);
  document.getElementById("cancelBtn")?.addEventListener("click", closeModal);
  document.getElementById("assignBtn")?.addEventListener("click", handleAssignEmployee);
  window.addEventListener("click", (e) => {
    if (e.target === document.getElementById("assignModal")) closeModal();
  });
}

function applyFilters() {
  const custVal = document.getElementById("customerFilter")?.value.toLowerCase() || "";
  const idVal = document.getElementById("orderIdFilter")?.value.toLowerCase() || "";

  const filtered = allOrders.filter(order => {
    const matchCust = (order.Customer_Name || '').toLowerCase().includes(custVal) ||
                      (order.Customer_ID || '').toString().includes(custVal);
    const matchId = (order.ID || '').toString().includes(idVal);
    return matchCust && matchId;
  });

  displayOrdersTable(filtered, document.getElementById("ordersContainer"));
  updateStatistics(filtered);
}

function clearFilters() {
  const cFilter = document.getElementById("customerFilter");
  const iFilter = document.getElementById("orderIdFilter");
  if (cFilter) cFilter.value = "";
  if (iFilter) iFilter.value = "";
  displayOrdersTable(allOrders, document.getElementById("ordersContainer"));
  updateStatistics(allOrders);
}

function updateStatistics(orders) {
  const revenue = orders.reduce((sum, o) => sum + (parseFloat(o.Price) || 0), 0);
  document.getElementById("totalOrders").textContent = orders.length;
  document.getElementById("totalRevenue").textContent = formatCurrency(revenue);
}