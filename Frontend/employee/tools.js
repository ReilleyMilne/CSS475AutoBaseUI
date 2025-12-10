import { BACKEND_URL, formatCurrency, formatDate, formatLabel } from "/Frontend/shared.js";

async function postJson(path, body){
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error('HTTP '+res.status);
  return res.json();
}

async function getJson(path){
  const res = await fetch(path, {credentials:'include'});
  if(!res.ok) throw new Error('HTTP '+res.status);
  return res.json();
}

function renderTable(containerId, items, columns){
  const c = document.getElementById(containerId);
  c.innerHTML = '';
  if(!items || items.length===0){ c.innerHTML = '<div class="panel-message">No results.</div>'; return }
  const table = document.createElement('table'); table.className='results-table';
  const thead = document.createElement('thead'); const htr=document.createElement('tr');
  columns.forEach(col=>{const th=document.createElement('th'); th.textContent=col; htr.appendChild(th)}); thead.appendChild(htr); table.appendChild(thead);
  const tbody = document.createElement('tbody');
  items.forEach(it=>{
    const tr=document.createElement('tr');
    columns.forEach(col=>{
      const key = col.toLowerCase().replace(/ /g,'_');
      const td=document.createElement('td');
      let v = it[key] ?? it[col] ?? '';
      if(key.includes('price')||key==='price') v = formatCurrency(v);
      if(key.includes('date')) v = formatDate(v);
      td.textContent = v;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody); c.appendChild(table);
}

// Sales by VIN
document.getElementById('lookupSalesByVin').addEventListener('click', async ()=>{
  const vin = document.getElementById('vinInput').value.trim();
  if(!vin) return alert('Enter VIN');
  try{
    const data = await getJson(`${BACKEND_URL}/api/employee/sales/vehicle/${encodeURIComponent(vin)}`);
    renderTable('salesResults', data.sales_orders || data, ['ID','Sales_Date','Price','customer_name','sales_employee_name','Vehicle_VIN']);
  }catch(e){console.error(e); alert('Error fetching sales by VIN')}
});

// Sales by Customer
document.getElementById('lookupSalesByCustomer').addEventListener('click', async ()=>{
  const id = document.getElementById('customerIdInput').value.trim();
  if(!id) return alert('Enter customer ID');
  try{
    const data = await getJson(`${BACKEND_URL}/api/employee/sales/customer/${encodeURIComponent(id)}`);
    renderTable('salesResults', data.sales_orders || data, ['ID','Sales_Date','Price','Vehicle_VIN','sales_employee_name']);
  }catch(e){console.error(e); alert('Error fetching sales by customer')}
});

// Service by VIN
document.getElementById('lookupServiceByVin').addEventListener('click', async ()=>{
  const vin = document.getElementById('serviceVinInput').value.trim();
  if(!vin) return alert('Enter VIN');
  try{
    const data = await getJson(`${BACKEND_URL}/api/employee/service/vehicle/${encodeURIComponent(vin)}`);
    renderTable('serviceResults', data.service_orders || data, ['ID','Date_From','Date_To','ServiceStatus','Price','assigned_employee','service_type','labor_hours','labor_rate','part_name','part_price']);
  }catch(e){console.error(e); alert('Error fetching service by VIN')}
});

// Service by Customer
document.getElementById('lookupServiceByCustomer').addEventListener('click', async ()=>{
  const id = document.getElementById('serviceCustomerIdInput').value.trim();
  if(!id) return alert('Enter customer ID');
  try{
    const data = await getJson(`${BACKEND_URL}/api/employee/service/customer/${encodeURIComponent(id)}`);
    renderTable('serviceResults', data.service_orders || data, ['ID','Date_From','Date_To','ServiceStatus','Price','assigned_employee','service_type','labor_hours','labor_rate','part_name','part_price']);
  }catch(e){console.error(e); alert('Error fetching service by customer')}
});

// Parts shortage report
document.getElementById('runShortageReport').addEventListener('click', async ()=>{
  const threshold = document.getElementById('shortageThreshold').value || 5;
  try{
    const data = await postJson(`${BACKEND_URL}/api/employee/parts/report_shortage`, {threshold});
    renderTable('shortageResults', data.shortages || data, ['ID','Name','Price','Stock']);
  }catch(e){console.error(e); alert('Error running shortage report')}
});
