import {
  BACKEND_URL,
  escapeHtml,
  formatLabel,
  showLoading,
  hideLoading,
  safeFetchCurrentUser
} from "/Frontend/shared.js";

// Global data store
let currentCustomerData = null;

// =========================
// Initialization
// =========================
document.addEventListener("DOMContentLoaded", initPage);

async function initPage() {
  const user = await safeFetchCurrentUser();
  if (!user || user.user_type !== "customer") {
    alert("Please log in as a customer.");
    return window.location.href = "/Frontend/login.html";
  }

  await Promise.all([
    loadCustomerInfo(),
    loadPurchaseRecords(),
    loadServiceRecords(),
    checkServiceDueNotification()
  ]);

  setupEventListeners();
}

// =======================================================
// Utility: Unified Fetch Wrapper (handles errors safely)
// =======================================================
async function apiGet(url) {
  const res = await fetch(url, { method: "GET", credentials: "include" });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function apiPut(url, body) {
  const res = await fetch(url, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Update failed");

  return data;
}

// =========================
// Event Listeners
// =========================
function setupEventListeners() {
  document.getElementById("editBtn")?.addEventListener("click", showEditForm);
  document.getElementById("cancelBtn")?.addEventListener("click", hideEditForm);
  document.getElementById("customerEditForm")?.addEventListener("submit", handleSaveChanges);
}

// =========================
// CUSTOMER INFO
// =========================
async function loadCustomerInfo() {
  const container = document.getElementById("customerInfo");
  const loading = document.getElementById("customerInfoLoading");
  const error = document.getElementById("customerInfoError");

  showLoading(loading);
  error.style.display = "none";
  container.innerHTML = "";

  try {
    const { customer } = await apiGet(`${BACKEND_URL}/api/customer/info`);
    currentCustomerData = customer;
    renderCustomerInfo(customer, container);
    showEditActions();

  } catch (err) {
    error.textContent = err.message;
    error.style.display = "block";
  } finally {
    hideLoading(loading);
  }
}

function renderCustomerInfo(customer, container) {
  const rows = Object.entries(customer)
    .filter(([_, val]) => typeof val !== "object")
    .map(([key, val]) => `
      <tr>
        <td class="label">${escapeHtml(formatLabel(key))}</td>
        <td class="value">${escapeHtml(String(val ?? ""))}</td>
      </tr>
    `).join("");

  container.innerHTML = `
    <table class="customer-details-table">
      <tbody>${rows}</tbody>
    </table>
  `;
}

function showEditActions() {
  document.getElementById("editActions").style.display = "block";
}

// =========================
// EDIT FORM
// =========================
function showEditForm() {
  if (!currentCustomerData) return;

  const { Name, Phone, Email, Address, Gender } = currentCustomerData;

  document.getElementById("nameInput").value = Name || "";
  document.getElementById("phoneInput").value = Phone || "";
  document.getElementById("emailInput").value = Email || "";
  document.getElementById("addressInput").value = Address || "";
  document.getElementById("genderInput").value = Gender || "";

  toggleEditMode(true);
}

function hideEditForm() {
  toggleEditMode(false);
}

function toggleEditMode(isEditing) {
  document.getElementById("customerInfo").style.display = isEditing ? "none" : "block";
  document.getElementById("editActions").style.display = isEditing ? "none" : "block";
  document.getElementById("editForm").style.display = isEditing ? "block" : "none";
}

// =========================
// SAVE EDITED CUSTOMER INFO
// =========================
async function handleSaveChanges(e) {
  e.preventDefault();

  const form = new FormData(e.target);
  const error = document.getElementById("customerInfoError");

  const updatedData = {
    Name: form.get("Name"),
    Phone: form.get("Phone"),
    Email: form.get("Email"),
    Address: form.get("Address"),
    Gender: form.get("Gender")
  };

  try {
    const { customer } = await apiPut(`${BACKEND_URL}/api/customer/info`, updatedData);

    currentCustomerData = customer;
    renderCustomerInfo(customer, document.getElementById("customerInfo"));

    hideEditForm();
    error.style.display = "none";

  } catch (err) {
    error.textContent = err.message;
    error.style.display = "block";
  }
}

// =========================
// PURCHASE + SERVICE RECORDS
// =========================
async function loadPurchaseRecords() {
  await loadRecordSection(
    `${BACKEND_URL}/api/customer/my_sales_orders`,
    "purchaseRecords",
    "No purchase records found."
  );
}

async function loadServiceRecords() {
  await loadRecordSection(
    `${BACKEND_URL}/api/customer/my_service_records`,
    "serviceRecords",
    "No service records found."
  );
}

async function loadRecordSection(url, elementId, emptyMessage) {
  const container = document.getElementById(elementId);
  try {
    const data = await apiGet(url);
    const list = data.sales_orders || data.service_orders || [];

    container.innerHTML = list.length > 0
      ? buildRecordsTable(list)
      : `<p style="padding: 1rem;">${emptyMessage}</p>`;

  } catch (err) {
    container.innerHTML = `<p class="error-message" style="padding:1rem;">${escapeHtml(err.message)}</p>`;
  }
}

// =========================
// SERVICE DUE NOTIFICATIONS
// =========================
async function checkServiceDueNotification() {
  const container = document.getElementById("serviceDueNotification");

  try {
    const data = await apiGet(`${BACKEND_URL}/api/customer/vehicles_due_service`);
    const list = data.due_vehicles;

    if (list?.length > 0) {
      const vehicles = list.map(v =>
        `${v.Make} ${v.Model} (${v.Year}) [VIN: ${v.VIN}]`
      ).join("<br>");

      container.innerHTML = `
        <div class="alert alert-warning">
          <strong>⚠️ Service Due</strong><br>
          ${vehicles}
        </div>
      `;
    }

  } catch {
  }
}

// =========================
// Rendering
// =========================
function buildRecordsTable(records) {
  const headers = Object.keys(records[0]);

  const headerRow = headers
    .map(h => `<th>${escapeHtml(formatLabel(h))}</th>`)
    .join("");

  const bodyRows = records.map(row => `
    <tr>
      ${headers.map(h => `<td>${escapeHtml(String(row[h] ?? ""))}</td>`).join("")}
    </tr>
  `).join("");

  return `
    <table class="records-table full-width">
      <thead><tr>${headerRow}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}
