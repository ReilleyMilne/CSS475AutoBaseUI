import { BACKEND_URL, formatCurrency, formatDate } from "/Frontend/shared.js";

async function apiGet(path){
  const url = path.startsWith('http') ? path : (BACKEND_URL + path);
  const res = await fetch(url, {credentials: 'include'});
  if(!res.ok) throw new Error('API error '+res.status);
  return res.json();
}

// ============================================
// Tab Management
// ============================================
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      button.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');
    });
  });
}

// ============================================
// Card Rendering
// ============================================
function mkCard(item, columns){
  const card = document.createElement('div');
  card.className = 'card';
  
  const title = document.createElement('h3');
  let titleText = item.employee_name ?? item.Name ?? 'Item';
  
  // If there's no employee_name or Name, check if it's a date
  if (!item.employee_name && !item.Name && item.date) {
    titleText = formatDate(item.date);
  }
  
  title.textContent = titleText;
  card.appendChild(title);
  
  const table = document.createElement('table');
  table.className = 'common-table';
  
  const thead = document.createElement('thead');
  const thr = document.createElement('tr');
  columns.forEach(c => {
    const th = document.createElement('th');
    th.textContent = c;
    thr.appendChild(th);
  });
  thead.appendChild(thr);
  table.appendChild(thead);
  
  const tbody = document.createElement('tbody');
  const tr = document.createElement('tr');
  columns.forEach(c => {
    const key = c.toLowerCase().replace(/ /g,'_');
    const td = document.createElement('td');
    let v = item[key] ?? item[c] ?? '';
    
    if(/price|sales|revenue|cost/i.test(c)) {
      td.textContent = formatCurrency(v);
    } else if(/date/i.test(c)) {
      td.textContent = formatDate(v);
    } else {
      td.textContent = v;
    }
    tr.appendChild(td);
  });
  tbody.appendChild(tr);
  table.appendChild(tbody);
  card.appendChild(table);
  
  return card;
}

function renderGrid(containerId, items, columns, limit=20){
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  if(!items || items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-message';
    empty.textContent = 'No data available';
    container.appendChild(empty);
    return;
  }
  
  const slice = items.slice(0, limit);
  slice.forEach(it => container.appendChild(mkCard(it, columns)));
  
  if(items.length > limit){
    const more = document.createElement('div');
    more.className = 'card';
    more.innerHTML = `<strong>Showing ${limit} of ${items.length} results.</strong><br>Use filters to narrow results.`;
    container.appendChild(more);
  }
}

// ============================================
// Full-Width Table Rendering
// ============================================
function renderFullTable(containerId, items, columns){
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  if(!items || items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-message';
    empty.textContent = 'No data available';
    container.appendChild(empty);
    return;
  }
  
  const table = document.createElement('table');
  table.className = 'full-width-table';
  
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  const tbody = document.createElement('tbody');
  items.forEach(item => {
    const tr = document.createElement('tr');
    columns.forEach(col => {
      const key = col.toLowerCase().replace(/ /g, '_');
      const td = document.createElement('td');
      let v = item[key] ?? item[col] ?? '';
      
      if(/price|cost/i.test(col)) {
        td.textContent = formatCurrency(v);
      } else if(/date/i.test(col)) {
        td.textContent = formatDate(v);
      } else {
        td.textContent = v;
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

// ============================================
// Utility Functions
// ============================================
function parseDateSafe(s){
  if(!s) return null;
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

async function fetchAndPopulateEmployees(){
  try{
    const res = await apiGet('/api/employee/employees');
    const employees = res.employees || res || [];
    const selSales = document.getElementById('salesEmployeeSelect');
    const selService = document.getElementById('serviceEmployeeSelect');
    
    [selSales, selService].forEach(sel => {
      if(!sel) return;
      sel.innerHTML = '<option value="">All Employees</option>';
    });
    
    employees.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.ID || e.id;
      opt.textContent = e.Name || e.name || (`Employee ${e.ID}`);
      if(selSales) selSales.appendChild(opt.cloneNode(true));
      if(selService) selService.appendChild(opt.cloneNode(true));
    });
  } catch(err) {
    console.warn('Could not fetch employees for filters', err);
  }
}

// ============================================
// Sales Functions
// ============================================
async function refreshSales(){
  const by = document.getElementById('salesBy').value;
  const start = parseDateSafe(document.getElementById('salesStartDate').value);
  const end = parseDateSafe(document.getElementById('salesEndDate').value);
  const emp = document.getElementById('salesEmployeeSelect').value;
  
  try{
    const data = await apiGet('/api/manager/sales/aggregate?by=' + encodeURIComponent(by));
    let items = data.data || data || [];
    
    // Filter by employee
    if(emp) {
      items = items.filter(it => String(it.employee_id || it.Employee_ID || it.employeeId) === String(emp));
    }
    
    // Filter by date range
    if(start || end){
      items = items.filter(it => {
        const d = parseDateSafe(it.date || it.Sales_Date || it.date);
        if(!d) return false;
        if(start && d < start) return false;
        if(end && d > end) return false;
        return true;
      });
    }
    
    renderGrid('salesResults', items, 
      by === 'employee' 
        ? ['employee_name','total_sales','order_count']
        : ['date','total_sales','order_count']
    );
  } catch(e) {
    console.error(e);
    document.getElementById('salesResults').innerHTML = '<div class="empty-message">Error loading sales data</div>';
  }
}

// ============================================
// Service Functions
// ============================================
async function refreshService(){
  const by = document.getElementById('serviceBy').value;
  const start = parseDateSafe(document.getElementById('serviceStartDate').value);
  const end = parseDateSafe(document.getElementById('serviceEndDate').value);
  const emp = document.getElementById('serviceEmployeeSelect').value;
  
  try{
    const data = await apiGet('/api/manager/service/summary?by=' + encodeURIComponent(by));
    let items = data.data || data || [];
    
    // Filter by employee
    if(emp) {
      items = items.filter(it => String(it.employee_id || it.Employee_ID || it.employeeId) === String(emp));
    }
    
    // Filter by date range
    if(start || end){
      items = items.filter(it => {
        const d = parseDateSafe(it.date || it.Date_From || it.date);
        if(!d) return false;
        if(start && d < start) return false;
        if(end && d > end) return false;
        return true;
      });
    }
    
    renderGrid('serviceResults', items,
      by === 'employee'
        ? ['employee_name','service_revenue','labor_hours','parts_cost']
        : ['date','service_revenue','labor_hours','parts_cost']
    );
  } catch(e) {
    console.error(e);
    document.getElementById('serviceResults').innerHTML = '<div class="empty-message">Error loading service data</div>';
  }
}

// ============================================
// Parts Functions
// ============================================
async function refreshParts(){
  const threshold = document.getElementById('partsThreshold').value;
  
  try{
    const data = await apiGet('/api/manager/parts/usage?threshold=' + encodeURIComponent(threshold));
    const items = data.data || data || [];
    renderGrid('partsResults', items, ['Name','Stock','times_used','Price']);
  } catch(e) {
    console.error(e);
    document.getElementById('partsResults').innerHTML = '<div class="empty-message">Error loading parts data</div>';
  }
}

// ============================================
// Advanced Reports
// ============================================
async function runCustomerReport(){
  const container = document.getElementById('customerReportResults');
  container.innerHTML = '<div class="loading">Loading...</div>';
  
  try{
    const data = await apiGet('/api/manager/reports/customer-vehicles');
    const items = data.data || data || [];
    renderFullTable('customerReportResults', items, 
      ['Customer ID', 'Customer Name', 'Vehicle Amount', 'Service Times']
    );
  } catch(e) {
    console.error(e);
    container.innerHTML = '<div class="empty-message">Error loading customer report</div>';
  }
}

async function runWaitingVehicles(){
  const container = document.getElementById('waitingVehiclesResults');
  container.innerHTML = '<div class="loading">Loading...</div>';
  
  try{
    const data = await apiGet('/api/manager/reports/waiting-vehicles');
    const items = data.data || data || [];
    renderFullTable('waitingVehiclesResults', items,
      ['Customer ID', 'Customer Name', 'Vehicle VIN', 'Status', 'Part ID', 'Part Name', 'Quantity', 'Stock']
    );
  } catch(e) {
    console.error(e);
    container.innerHTML = '<div class="empty-message">Error loading waiting vehicles report</div>';
  }
}

async function runEmployeePerformance(){
  const container = document.getElementById('employeePerformanceResults');
  container.innerHTML = '<div class="loading">Loading...</div>';
  
  try{
    const data = await apiGet('/api/manager/reports/employee-performance');
    const items = data.data || data || [];
    renderFullTable('employeePerformanceResults', items,
      ['Employee ID', 'Employee Name', 'Vehicle Sold', 'Core Customer']
    );
  } catch(e) {
    console.error(e);
    container.innerHTML = '<div class="empty-message">Error loading employee performance report</div>';
  }
}

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize tabs
  initializeTabs();
  
  // Populate employee dropdowns
  await fetchAndPopulateEmployees();
  
  // Attach event listeners
  document.getElementById('refreshSales').addEventListener('click', refreshSales);
  document.getElementById('refreshService').addEventListener('click', refreshService);
  document.getElementById('refreshParts').addEventListener('click', refreshParts);
  document.getElementById('runCustomerReport').addEventListener('click', runCustomerReport);
  document.getElementById('runWaitingVehicles').addEventListener('click', runWaitingVehicles);
  document.getElementById('runEmployeePerformance').addEventListener('click', runEmployeePerformance);
  
  // Initial load for sales tab
  refreshSales();
  refreshService();
  refreshParts();
});