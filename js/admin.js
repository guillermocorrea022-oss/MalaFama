// =========================================
// MALA FAMA BREWING — Panel de Administración
// =========================================
// Gestión de pedidos, reservas, productos, stock y clientes.
// Este archivo NO carga utils.js (el admin tiene su propio layout),
// por eso incluye su propia función escapeHtml para prevenir XSS.
// =========================================

// Sanitización HTML para prevenir XSS en datos de clientes/pedidos
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return String(unsafe || '');
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const STATUS_LABELS = {
  nuevo: 'Nuevo', confirmado: 'Confirmado', preparando: 'Preparando',
  enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado'
};

const STATUS_NEXT = {
  nuevo: 'confirmado', confirmado: 'preparando',
  preparando: 'enviado', enviado: 'entregado'
};

const STATUS_NEXT_LABEL = {
  nuevo: 'Confirmar', confirmado: 'Preparar',
  preparando: 'Enviar', enviado: 'Entregar'
};

const PROVIDER_LABELS = {
  card: 'Tarjeta', 'plexo-sandbox': 'Tarjeta (sandbox)', plexo: 'Tarjeta',
  transfer: 'Transferencia', cash: 'Efectivo'
};

function formatCurrency(amount) {
  return '$U ' + Number(amount || 0).toLocaleString('es-UY', { minimumFractionDigits: 0 });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
}

// ===== Auth Check =====

async function checkAdminAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (!data.user || !data.user.isAdmin) {
      window.location.href = 'index.html';
      return;
    }
    document.getElementById('adminUserName').textContent = data.user.firstName || data.user.email;
    loadDashboard();
  } catch (e) {
    window.location.href = 'index.html';
  }
}

async function adminLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = 'index.html';
}

// ===== Tab Switching =====

function switchTab(tabName) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-tabs button').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.shop-subnav__link').forEach(l => l.classList.remove('active'));

  document.getElementById('tab-' + tabName).classList.add('active');
  var tabNames = ['dashboard', 'orders', 'bookings', 'products', 'customers'];
  var idx = tabNames.indexOf(tabName);
  if (idx >= 0) {
    var oldTabs = document.querySelectorAll('.admin-tabs button');
    var newTabs = document.querySelectorAll('.shop-subnav__link');
    if (oldTabs[idx]) oldTabs[idx].classList.add('active');
    if (newTabs[idx]) newTabs[idx].classList.add('active');
  }

  // Load data for the tab
  switch (tabName) {
    case 'dashboard': loadDashboard(); break;
    case 'orders': loadOrders(); break;
    case 'bookings': initCapacityDate(); loadCapacityInfo(); loadBookings(); break;
    case 'products': loadProducts(); break;
    case 'customers': loadCustomers(); break;
  }
}

// ===== DASHBOARD =====

async function loadDashboard() {
  try {
    const [statsRes, revenueRes, recentRes] = await Promise.all([
      fetch('/api/admin/stats'),
      fetch('/api/admin/revenue?days=7'),
      fetch('/api/admin/recent-orders?limit=10')
    ]);

    const statsData = await statsRes.json();
    const revenueData = await revenueRes.json();
    const recentData = await recentRes.json();

    // Stats cards
    const s = statsData.stats;
    document.getElementById('statTodayTotal').textContent = formatCurrency(s.today.total);
    document.getElementById('statTodayCount').textContent = s.today.count + ' pedidos';
    document.getElementById('statWeekTotal').textContent = formatCurrency(s.week.total);
    document.getElementById('statWeekCount').textContent = s.week.count + ' pedidos';
    document.getElementById('statMonthTotal').textContent = formatCurrency(s.month.total);
    document.getElementById('statMonthCount').textContent = s.month.count + ' pedidos';

    // Low stock alerts
    const alertsDiv = document.getElementById('lowStockAlerts');
    if (statsData.lowStock && statsData.lowStock.length > 0) {
      alertsDiv.innerHTML = `
        <div class="alert-box">
          <h4>⚠ Alerta de Stock Bajo</h4>
          <ul>${statsData.lowStock.map(p => `<li>Producto #${escapeHtml(String(p.product_id))} — ${escapeHtml(String(p.stock))} unidades</li>`).join('')}</ul>
        </div>`;
    } else {
      alertsDiv.innerHTML = '';
    }

    // Revenue chart
    renderRevenueChart(revenueData.revenue);

    // Recent orders
    renderRecentOrders(recentData.orders);

  } catch (e) {
    console.error('Error loading dashboard:', e);
  }
}

function renderRevenueChart(revenue) {
  const chart = document.getElementById('revenueChart');
  if (!revenue || revenue.length === 0) {
    chart.innerHTML = '<p style="color:#999;font-size:13px;text-align:center;width:100%;">No hay datos aún</p>';
    return;
  }

  const maxRevenue = Math.max(...revenue.map(d => d.revenue), 1);

  chart.innerHTML = revenue.map(d => {
    const heightPct = Math.max((d.revenue / maxRevenue) * 100, 3);
    const dayLabel = d.date ? d.date.slice(5) : '?';
    return `
      <div class="chart-bar">
        <span class="bar-value">${formatCurrency(d.revenue)}</span>
        <div class="bar" style="height:${heightPct}%"></div>
        <span class="bar-label">${dayLabel}</span>
      </div>`;
  }).join('');
}

function renderRecentOrders(orders) {
  const tbody = document.getElementById('recentOrdersBody');
  if (!orders || orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>No hay pedidos aún</p></td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr class="clickable" onclick="showOrderDetail('${escapeHtml(o.order_id)}')">
      <td><strong>${escapeHtml(o.order_id)}</strong></td>
      <td>${formatDateTime(o.created_at)}</td>
      <td>${escapeHtml(o.customer_first_name || '')} ${escapeHtml(o.customer_last_name || '')}</td>
      <td><strong>${formatCurrency(o.total_uyu)}</strong></td>
      <td><span class="badge badge-${escapeHtml(o.status)}">${STATUS_LABELS[o.status] || escapeHtml(o.status)}</span></td>
    </tr>
  `).join('');
}

// ===== ORDERS TAB =====

async function loadOrders() {
  const status = document.getElementById('orderStatusFilter').value;
  const from = document.getElementById('orderDateFrom').value;
  const to = document.getElementById('orderDateTo').value;

  let url = '/api/admin/orders?';
  if (status) url += 'status=' + status + '&';
  if (from) url += 'from=' + from + '&';
  if (to) url += 'to=' + to + '&';

  try {
    const res = await fetch(url);
    const data = await res.json();
    renderOrdersTable(data.orders);
  } catch (e) {
    console.error('Error loading orders:', e);
  }
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('ordersTableBody');
  if (!orders || orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><p>No hay pedidos</p></td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const items = o.items || [];
    const itemsSummary = items.map(i => i.name || 'Producto').join(', ');
    const truncated = itemsSummary.length > 40 ? itemsSummary.slice(0, 40) + '...' : itemsSummary;
    const nextStatus = STATUS_NEXT[o.status];
    const nextLabel = STATUS_NEXT_LABEL[o.status];

    var oid = escapeHtml(o.order_id);
    return `
    <tr>
      <td><strong style="cursor:pointer;text-decoration:underline;" onclick="showOrderDetail('${oid}')">${oid}</strong></td>
      <td>${formatDateTime(o.created_at)}</td>
      <td>${escapeHtml(o.customer_first_name || '')} ${escapeHtml(o.customer_last_name || '')}</td>
      <td title="${escapeHtml(itemsSummary)}">${escapeHtml(truncated)}</td>
      <td><strong>${formatCurrency(o.total_uyu)}</strong></td>
      <td>${PROVIDER_LABELS[o.provider] || escapeHtml(o.provider)}</td>
      <td><span class="badge badge-${escapeHtml(o.status)}">${STATUS_LABELS[o.status] || escapeHtml(o.status)}</span></td>
      <td>
        ${nextStatus ? `<button class="btn btn-sm btn-primary" onclick="changeOrderStatus('${oid}','${nextStatus}')">${nextLabel}</button>` : ''}
        ${o.status !== 'cancelado' && o.status !== 'entregado' ? `<button class="btn btn-sm btn-danger" onclick="changeOrderStatus('${oid}','cancelado')" style="margin-left:4px;">✕</button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

async function changeOrderStatus(orderId, newStatus) {
  const confirmMsg = `¿Cambiar estado del pedido ${orderId} a "${STATUS_LABELS[newStatus]}"?`;
  if (!confirm(confirmMsg)) return;

  let trackingInfo = '';
  if (newStatus === 'enviado') {
    trackingInfo = prompt('Info de seguimiento (opcional):', '') || '';
  }

  try {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, trackingInfo })
    });
    const data = await res.json();
    if (data.success) {
      loadOrders();
      // Refresh dashboard if visible
      if (document.getElementById('tab-dashboard').classList.contains('active')) {
        loadDashboard();
      }
    } else {
      alert('Error: ' + (data.error || 'No se pudo actualizar'));
    }
  } catch (e) {
    alert('Error de conexión');
  }
}

async function showOrderDetail(orderId) {
  try {
    const res = await fetch(`/api/admin/orders/${orderId}`);
    const data = await res.json();
    if (!data.order) { alert('Pedido no encontrado'); return; }

    const o = data.order;
    const items = o.items || [];

    const itemsHtml = items.map(i => `
      <tr>
        <td>${escapeHtml(i.name || 'Producto')}</td>
        <td style="text-align:center;">${i.quantity || 1}</td>
        <td style="text-align:right;">${formatCurrency((i.priceUYU || 0) * (i.quantity || 1))}</td>
      </tr>
    `).join('');

    document.getElementById('orderModalContent').innerHTML = `
      <div class="modal-detail-row"><span class="label">Pedido</span><span class="value">${escapeHtml(o.order_id)}</span></div>
      <div class="modal-detail-row"><span class="label">Estado</span><span class="value"><span class="badge badge-${escapeHtml(o.status)}">${STATUS_LABELS[o.status] || escapeHtml(o.status)}</span></span></div>
      <div class="modal-detail-row"><span class="label">Fecha</span><span class="value">${formatDateTime(o.created_at)}</span></div>
      <div class="modal-detail-row"><span class="label">Cliente</span><span class="value">${escapeHtml(o.customer_first_name || '')} ${escapeHtml(o.customer_last_name || '')}</span></div>
      <div class="modal-detail-row"><span class="label">Email</span><span class="value">${escapeHtml(o.customer_email || '-')}</span></div>
      <div class="modal-detail-row"><span class="label">Teléfono</span><span class="value">${escapeHtml(o.customer_phone || '-')}</span></div>
      <div class="modal-detail-row"><span class="label">Pago</span><span class="value">${PROVIDER_LABELS[o.provider] || escapeHtml(o.provider)}</span></div>
      ${o.shipping_street ? `<div class="modal-detail-row"><span class="label">Envío</span><span class="value">${escapeHtml(o.shipping_street)} ${escapeHtml(o.shipping_apt || '')}, ${escapeHtml(o.shipping_dept || '')}</span></div>` : ''}
      ${o.shipping_method ? `<div class="modal-detail-row"><span class="label">Método envío</span><span class="value">${escapeHtml(o.shipping_method)}</span></div>` : ''}
      ${o.tracking_info ? `<div class="modal-detail-row"><span class="label">Seguimiento</span><span class="value">${escapeHtml(o.tracking_info)}</span></div>` : ''}

      <table class="modal-items-table">
        <thead><tr><th>Producto</th><th style="text-align:center;">Cant.</th><th style="text-align:right;">Subtotal</th></tr></thead>
        <tbody>
          ${itemsHtml}
          ${o.shipping_cost ? `<tr><td>Costo de envío</td><td></td><td style="text-align:right;">${formatCurrency(o.shipping_cost)}</td></tr>` : ''}
          <tr class="total-row"><td>Total</td><td></td><td style="text-align:right;">${formatCurrency(o.total_uyu)}</td></tr>
        </tbody>
      </table>
    `;

    document.getElementById('orderModal').classList.add('active');
  } catch (e) {
    console.error('Error loading order detail:', e);
  }
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('active');
}

// ===== BOOKINGS TAB =====

async function loadBookings() {
  const location = document.getElementById('bookingLocationFilter').value;
  const status = document.getElementById('bookingStatusFilter').value;
  const capDate = document.getElementById('capDate');
  const date = capDate ? capDate.value : '';

  let url = '/api/admin/bookings?';
  if (location) url += 'location=' + encodeURIComponent(location) + '&';
  if (status) url += 'status=' + encodeURIComponent(status) + '&';
  if (date) url += 'date=' + encodeURIComponent(date) + '&';

  try {
    const res = await fetch(url);
    const data = await res.json();
    renderBookingsTable(data.bookings);
  } catch (e) {
    console.error('Error loading bookings:', e);
  }
}

function renderBookingsTable(bookings) {
  const tbody = document.getElementById('bookingsTableBody');
  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><p>No hay reservas</p></td></tr>';
    return;
  }

  const locationLabels = { montevideo: 'Montevideo', 'punta del este': 'Punta del Este', 'punta-del-este': 'Punta del Este' };
  const statusLabels = { confirmed: 'Confirmada', cancelled: 'Cancelada', completed: 'Completada', pending: 'Pendiente' };

  tbody.innerHTML = bookings.map(b => {
    var bid = escapeHtml(b.booking_id);
    return `
    <tr>
      <td>${bid}</td>
      <td>${escapeHtml(b.date)}</td>
      <td>${escapeHtml(b.time)}</td>
      <td><strong>${escapeHtml(b.name)}</strong></td>
      <td>${escapeHtml(b.email)}</td>
      <td style="text-align:center;">${b.guests}</td>
      <td>${locationLabels[b.location] || escapeHtml(b.location)}</td>
      <td><span class="badge badge-${escapeHtml(b.status)}">${statusLabels[b.status] || escapeHtml(b.status)}</span></td>
      <td>
        ${b.status !== 'confirmed' ? `<button class="btn btn-sm btn-success" onclick="changeBookingStatus('${bid}','confirmed')">Confirmar</button>` : ''}
        ${b.status === 'confirmed' ? `<button class="btn btn-sm" onclick="changeBookingStatus('${bid}','completed')" style="margin-left:4px;background:#2ecc71;color:#fff;">Completar</button>` : ''}
        ${b.status !== 'cancelled' ? `<button class="btn btn-sm btn-danger" onclick="changeBookingStatus('${bid}','cancelled')" style="margin-left:4px;">Cancelar</button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

async function changeBookingStatus(bookingId, newStatus) {
  try {
    const res = await fetch(`/api/admin/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      loadBookings();
      loadCapacityInfo(); // refrescar cupos después de cambiar estado
    } else {
      alert('Error: ' + (data.error || 'No se pudo actualizar'));
    }
  } catch (e) {
    alert('Error de conexión');
  }
}

// ===== CAPACITY MANAGEMENT =====

function initCapacityDate() {
  var capDate = document.getElementById('capDate');
  if (capDate && !capDate.value) {
    var d = new Date();
    capDate.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
}

async function loadCapacityInfo() {
  initCapacityDate();
  var location = document.getElementById('capLocation').value;
  var date = document.getElementById('capDate').value;
  if (!location || !date) return;

  try {
    var res = await fetch('/api/admin/capacity?location=' + encodeURIComponent(location) + '&date=' + date);
    var data = await res.json();
    if (data.success) {
      document.getElementById('capBase').value = data.base;
      document.getElementById('capInfo').innerHTML =
        '<div style="background:#f0f4ff;padding:12px 16px;border-radius:10px;flex:1;text-align:center;">' +
          '<div style="font-size:0.7rem;text-transform:uppercase;color:#888;margin-bottom:4px;">Capacidad base</div>' +
          '<div style="font-size:1.4rem;font-weight:700;color:#1d2357;">' + data.base + '</div>' +
        '</div>' +
        '<div style="background:#fff5f5;padding:12px 16px;border-radius:10px;flex:1;text-align:center;">' +
          '<div style="font-size:0.7rem;text-transform:uppercase;color:#888;margin-bottom:4px;">Reservados online</div>' +
          '<div style="font-size:1.4rem;font-weight:700;color:#c41e1e;">' + data.booked + '</div>' +
        '</div>' +
        '<div style="background:#fff8f0;padding:12px 16px;border-radius:10px;flex:1;text-align:center;">' +
          '<div style="font-size:0.7rem;text-transform:uppercase;color:#888;margin-bottom:4px;">Ajuste manual</div>' +
          '<div style="font-size:1.4rem;font-weight:700;color:#e67e22;">' + data.adjustment + '</div>' +
        '</div>' +
        '<div style="background:#f0faf4;padding:12px 16px;border-radius:10px;flex:1;text-align:center;">' +
          '<div style="font-size:0.7rem;text-transform:uppercase;color:#888;margin-bottom:4px;">Disponibles</div>' +
          '<div style="font-size:1.4rem;font-weight:700;color:#2ecc71;">' + data.available + '</div>' +
        '</div>';
    }
  } catch (e) {
    console.error('Error loading capacity:', e);
  }
}

async function saveBaseCapacity() {
  var location = document.getElementById('capLocation').value;
  var capacity = parseInt(document.getElementById('capBase').value);
  if (!capacity || capacity < 1) return alert('Capacidad inválida');

  try {
    var res = await fetch('/api/admin/capacity/base', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: location, capacity: capacity })
    });
    var data = await res.json();
    if (data.success) {
      loadCapacityInfo();
      alert('Capacidad base actualizada');
    } else {
      alert('Error: ' + (data.error || 'No se pudo actualizar'));
    }
  } catch (e) {
    alert('Error de conexión');
  }
}

async function saveCapacityAdjustment() {
  var location = document.getElementById('capLocation').value;
  var date = document.getElementById('capDate').value;
  var adjustment = parseInt(document.getElementById('capAdjustment').value);
  var note = document.getElementById('capNote').value;
  if (isNaN(adjustment)) return alert('Ajuste inválido');

  try {
    var res = await fetch('/api/admin/capacity', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: location, date: date, adjustment: adjustment, note: note })
    });
    var data = await res.json();
    if (data.success) {
      loadCapacityInfo();
      alert('Ajuste guardado');
    } else {
      alert('Error: ' + (data.error || 'No se pudo guardar'));
    }
  } catch (e) {
    alert('Error de conexión');
  }
}

async function saveManualBooking() {
  var name = (document.getElementById('manualName').value || '').trim();
  var email = (document.getElementById('manualEmail').value || '').trim();
  var guests = parseInt(document.getElementById('manualGuests').value);
  var time = document.getElementById('manualTime').value;
  var date = document.getElementById('capDate').value;
  var location = document.getElementById('capLocation').value;
  var note = (document.getElementById('manualNote').value || '').trim();
  var msgEl = document.getElementById('manualBookingMsg');

  if (!name || !guests || !date || !time) {
    msgEl.style.color = '#c41e1e';
    msgEl.textContent = 'Completá nombre, personas, fecha y hora.';
    return;
  }

  try {
    var res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, guests: guests, date: date, time: time, location: location, note: note })
    });
    var data = await res.json();
    if (data.success) {
      msgEl.style.color = '#276749';
      msgEl.textContent = '✓ Reserva de ' + name + ' agregada correctamente.';
      document.getElementById('manualName').value = '';
      document.getElementById('manualEmail').value = '';
      document.getElementById('manualGuests').value = '2';
      document.getElementById('manualNote').value = '';
      loadBookings();
      loadCapacityInfo();
      setTimeout(function() { msgEl.textContent = ''; }, 4000);
    } else {
      msgEl.style.color = '#c41e1e';
      msgEl.textContent = 'Error: ' + (data.error || 'No se pudo guardar');
    }
  } catch (e) {
    msgEl.style.color = '#c41e1e';
    msgEl.textContent = 'Error de conexión';
  }
}

// ===== PRODUCTS TAB =====

async function loadProducts() {
  try {
    const res = await fetch('/api/admin/products');
    const data = await res.json();
    renderProductsTable(data.products);
  } catch (e) {
    console.error('Error loading products:', e);
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById('productsTableBody');
  if (!products || products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>No hay productos</p></td></tr>';
    return;
  }

  tbody.innerHTML = products.map(p => {
    const stockClass = p.stock === 0 ? 'stock-zero' : (p.stock < 10 ? 'stock-low' : '');
    const stockBadge = p.stock === 0 ? ' <span class="badge badge-cancelado">SIN STOCK</span>' : '';

    return `
    <tr class="${stockClass}">
      <td>
        <div class="product-name-cell">
          <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" class="product-img" onerror="this.style.display='none'">
          <span>${escapeHtml(p.name)}</span>
        </div>
      </td>
      <td>${escapeHtml(p.style || '-')}</td>
      <td>
        <input type="number" class="stock-input" value="${p.priceUYU}" min="0" step="0.5"
          onchange="updatePrice(${p.id}, this.value)" onkeydown="if(event.key==='Enter'){updatePrice(${p.id}, this.value);this.blur();}">
      </td>
      <td>
        <input type="number" class="stock-input" value="${p.stock}" min="0"
          onchange="updateStock(${p.id}, this.value)" onkeydown="if(event.key==='Enter'){updateStock(${p.id}, this.value);this.blur();}">
        ${stockBadge}
      </td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" ${p.active ? 'checked' : ''} onchange="toggleProduct(${p.id}, this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </td>
    </tr>`;
  }).join('');
}

async function updateStock(productId, stock) {
  const s = parseInt(stock);
  if (isNaN(s) || s < 0) { alert('Stock inválido'); return; }

  try {
    const res = await fetch(`/api/admin/products/${productId}/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: s })
    });
    const data = await res.json();
    if (!data.success) alert('Error: ' + (data.error || 'No se pudo actualizar'));
    else loadProducts(); // Refresh to update row colors
  } catch (e) {
    alert('Error de conexión');
  }
}

async function toggleProduct(productId, active) {
  try {
    const res = await fetch(`/api/admin/products/${productId}/active`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    });
    const data = await res.json();
    if (!data.success) alert('Error: ' + (data.error || 'No se pudo actualizar'));
  } catch (e) {
    alert('Error de conexión');
  }
}

async function updatePrice(productId, price) {
  const p = parseFloat(price);
  if (isNaN(p) || p < 0) { alert('Precio inválido'); return; }

  if (!confirm(`¿Cambiar el precio del producto a $U ${p}?`)) {
    loadProducts(); // Reset input to previous value
    return;
  }

  try {
    const res = await fetch(`/api/admin/products/${productId}/price`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceUYU: p })
    });
    const data = await res.json();
    if (!data.success) alert('Error: ' + (data.error || 'No se pudo actualizar'));
    else loadProducts();
  } catch (e) {
    alert('Error de conexión');
  }
}

// ===== CUSTOMERS TAB =====

async function loadCustomers() {
  try {
    const res = await fetch('/api/admin/customers');
    const data = await res.json();
    renderCustomersTable(data.customers);
  } catch (e) {
    console.error('Error loading customers:', e);
  }
}

function renderCustomersTable(customers) {
  const tbody = document.getElementById('customersTableBody');
  if (!customers || customers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>No hay clientes registrados</p></td></tr>';
    return;
  }

  tbody.innerHTML = customers.map(c => `
    <tr class="clickable" onclick="toggleCustomerOrders(this, ${c.id})">
      <td><strong>${escapeHtml(c.first_name || '')} ${escapeHtml(c.last_name || '')}</strong>${c.is_admin ? ' <span class="badge badge-enviado">ADMIN</span>' : ''}</td>
      <td>${escapeHtml(c.email)}</td>
      <td>${escapeHtml(c.phone || '-')}</td>
      <td style="text-align:center;">${c.order_count}</td>
      <td><strong>${formatCurrency(c.total_spent)}</strong></td>
      <td>${formatDate(c.created_at)}</td>
    </tr>
  `).join('');
}

async function toggleCustomerOrders(row, userId) {
  // If already expanded, collapse
  const next = row.nextElementSibling;
  if (next && next.classList.contains('customer-orders-row')) {
    next.remove();
    return;
  }

  try {
    const res = await fetch(`/api/admin/customers/${userId}/orders`);
    const data = await res.json();
    const orders = data.orders || [];

    if (orders.length === 0) return;

    const expandRow = document.createElement('tr');
    expandRow.classList.add('customer-orders-row');
    expandRow.innerHTML = `
      <td colspan="6">
        <div class="customer-orders">
          <table>
            <thead><tr><th>Pedido</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
            <tbody>
              ${orders.map(o => `
                <tr style="cursor:pointer;" onclick="showOrderDetail('${escapeHtml(o.order_id)}')">
                  <td>${escapeHtml(o.order_id)}</td>
                  <td>${formatDate(o.created_at)}</td>
                  <td>${formatCurrency(o.total_uyu)}</td>
                  <td><span class="badge badge-${o.status}">${STATUS_LABELS[o.status] || o.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </td>`;
    row.after(expandRow);
  } catch (e) {
    console.error('Error loading customer orders:', e);
  }
}

// ===== Close modal on overlay click =====
document.getElementById('orderModal').addEventListener('click', function (e) {
  if (e.target === this) closeOrderModal();
});

// ===== Auto-refresh every 60s =====
setInterval(() => {
  const activePanel = document.querySelector('.tab-panel.active');
  if (activePanel) {
    switch (activePanel.id) {
      case 'tab-dashboard': loadDashboard(); break;
      case 'tab-orders': loadOrders(); break;
      case 'tab-bookings': loadBookings(); break;
    }
  }
}, 60000);

// ===== Init =====
checkAdminAuth();
