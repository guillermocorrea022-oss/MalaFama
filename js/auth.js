// =========================================
// CERVECERÍA MALA FAMA — Auth & User System
// =========================================

(function () {
  'use strict';

  // State
  window.__tcbUser = null;

  // ===== Inject UI into DOM =====
  function injectAuthUI() {
    // 1. User icon button (inside floating-actions)
    // Si la página ya trae un #userBtn en el HTML, lo reutilizamos para
    // evitar IDs duplicados (que rompían la inicialización del carrito).
    let userBtn = document.getElementById('userBtn');
    if (!userBtn) {
      const tempWrap = document.createElement('div');
      tempWrap.innerHTML = `
        <button class="floating-actions__btn" id="userBtn" aria-label="Mi cuenta">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span class="floating-user__indicator" id="userIndicator" style="display:none; position:absolute; top:4px; right:4px; width:10px; height:10px; background:#38a169; border-radius:50%; border:2px solid rgba(0,0,0,0.6);"></span>
        </button>
      `;
      userBtn = tempWrap.firstElementChild;
      const actionsContainer = document.querySelector('.floating-actions');
      if (actionsContainer) {
        actionsContainer.appendChild(userBtn);
      } else {
        document.body.appendChild(userBtn);
      }
    } else if (!document.getElementById('userIndicator')) {
      // Asegurar que el indicador verde exista incluso si el botón vino del HTML
      const indicator = document.createElement('span');
      indicator.id = 'userIndicator';
      indicator.className = 'floating-user__indicator';
      indicator.style.cssText = 'display:none;position:absolute;top:4px;right:4px;width:10px;height:10px;background:#38a169;border-radius:50%;border:2px solid rgba(0,0,0,0.6);';
      userBtn.appendChild(indicator);
    }

    // 2. User dropdown (for logged-in users)
    const dropdown = document.createElement('div');
    dropdown.className = 'user-dropdown';
    dropdown.id = 'userDropdown';
    dropdown.innerHTML = `
      <div class="user-dropdown__header">
        <span class="user-dropdown__name" id="userDropdownName"></span>
        <span class="user-dropdown__email" id="userDropdownEmail"></span>
      </div>
      <div class="user-dropdown__divider"></div>
      <button class="user-dropdown__item" id="btnMyOrders">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Mis pedidos
      </button>
      <a class="user-dropdown__item" id="btnAdminPanel" href="/admin.html" style="display:none;text-decoration:none;color:inherit;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        Panel Admin
      </a>
      <button class="user-dropdown__item" id="btnLogout">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Cerrar sesion
      </button>
    `;
    document.body.appendChild(dropdown);

    // 3. Auth modal (login/register)
    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    modal.id = 'authModal';
    modal.innerHTML = `
      <div class="auth-modal__backdrop" id="authModalBackdrop"></div>
      <div class="auth-modal__content">
        <button class="auth-modal__close" id="authModalClose">&times;</button>
        <div class="auth-modal__tabs">
          <button class="auth-modal__tab active" data-tab="login">Iniciar sesion</button>
          <button class="auth-modal__tab" data-tab="register">Registrarse</button>
        </div>

        <!-- Login Form -->
        <form class="auth-modal__form" id="loginForm">
          <div class="auth-modal__error" id="loginError"></div>
          <div class="auth-field">
            <label for="loginEmail">Email</label>
            <input type="email" id="loginEmail" required placeholder="tu@email.com" autocomplete="email">
          </div>
          <div class="auth-field">
            <label for="loginPassword">Contrasena</label>
            <input type="password" id="loginPassword" required placeholder="Tu contrasena" minlength="6" autocomplete="current-password">
          </div>
          <button type="submit" class="auth-modal__submit" id="loginSubmit">Iniciar sesion</button>
        </form>

        <!-- Register Form -->
        <form class="auth-modal__form" id="registerForm" style="display:none">
          <div class="auth-modal__error" id="registerError"></div>
          <div class="auth-field-row">
            <div class="auth-field">
              <label for="regFirstName">Nombre</label>
              <input type="text" id="regFirstName" required placeholder="Juan" autocomplete="given-name">
            </div>
            <div class="auth-field">
              <label for="regLastName">Apellido</label>
              <input type="text" id="regLastName" placeholder="Perez" autocomplete="family-name">
            </div>
          </div>
          <div class="auth-field">
            <label for="regEmail">Email</label>
            <input type="email" id="regEmail" required placeholder="tu@email.com" autocomplete="email">
          </div>
          <div class="auth-field">
            <label for="regPassword">Contrasena</label>
            <input type="password" id="regPassword" required placeholder="Minimo 6 caracteres" minlength="6" autocomplete="new-password">
          </div>
          <button type="submit" class="auth-modal__submit" id="registerSubmit">Crear cuenta</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    // 4. Orders drawer
    const ordersDrawer = document.createElement('div');
    ordersDrawer.id = 'ordersDrawer';
    ordersDrawer.innerHTML = `
      <div class="orders-overlay" id="ordersOverlay"></div>
      <div class="orders-drawer" id="ordersDrawerPanel">
        <div class="orders-drawer__header">
          <h3>Mis Pedidos</h3>
          <button class="orders-drawer__close" id="ordersCloseBtn">&times;</button>
        </div>
        <div class="orders-drawer__content" id="ordersContent">
          <div class="orders-loading">Cargando pedidos...</div>
        </div>
      </div>
    `;
    document.body.appendChild(ordersDrawer);
  }

  // ===== Event Listeners =====
  function initAuthEvents() {
    const userBtn = document.getElementById('userBtn');
    const dropdown = document.getElementById('userDropdown');
    const authModal = document.getElementById('authModal');
    const authModalBackdrop = document.getElementById('authModalBackdrop');
    const authModalClose = document.getElementById('authModalClose');

    // User button click
    userBtn.addEventListener('click', () => {
      if (window.__tcbUser) {
        // Toggle dropdown
        dropdown.classList.toggle('active');
      } else {
        // Open auth modal
        openAuthModal('login');
      }
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#userBtn') && !e.target.closest('.user-dropdown')) {
        dropdown.classList.remove('active');
      }
    });

    // Auth modal backdrop close
    authModalBackdrop.addEventListener('click', closeAuthModal);
    authModalClose.addEventListener('click', closeAuthModal);

    // Tab switching
    document.querySelectorAll('.auth-modal__tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        document.querySelectorAll('.auth-modal__tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('loginForm').style.display = target === 'login' ? 'flex' : 'none';
        document.getElementById('registerForm').style.display = target === 'register' ? 'flex' : 'none';
        // Clear errors
        document.getElementById('loginError').textContent = '';
        document.getElementById('registerError').textContent = '';
      });
    });

    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Register form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    // Logout
    document.getElementById('btnLogout').addEventListener('click', handleLogout);

    // My orders
    document.getElementById('btnMyOrders').addEventListener('click', () => {
      dropdown.classList.remove('active');
      openOrdersDrawer();
    });

    // Orders drawer close
    document.getElementById('ordersCloseBtn').addEventListener('click', closeOrdersDrawer);
    document.getElementById('ordersOverlay').addEventListener('click', closeOrdersDrawer);
  }

  // ===== Auth Modal =====
  function openAuthModal(tab) {
    const modal = document.getElementById('authModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    // Switch to correct tab
    if (tab) {
      document.querySelectorAll('.auth-modal__tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
      });
      document.getElementById('loginForm').style.display = tab === 'login' ? 'flex' : 'none';
      document.getElementById('registerForm').style.display = tab === 'register' ? 'flex' : 'none';
    }
  }

  function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    // Clear errors and inputs
    document.getElementById('loginError').textContent = '';
    document.getElementById('registerError').textContent = '';
  }

  // ===== Login =====
  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginSubmit');

    btn.textContent = 'Ingresando...';
    btn.disabled = true;
    errorEl.textContent = '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        window.__tcbUser = data.user;
        closeAuthModal();
        updateUserUI();
        await syncCartAfterLogin();
      } else {
        errorEl.textContent = data.error || 'Error al iniciar sesion';
      }
    } catch (err) {
      errorEl.textContent = 'Error de conexion. Intenta de nuevo.';
    }

    btn.textContent = 'Iniciar sesion';
    btn.disabled = false;
  }

  // ===== Register =====
  async function handleRegister(e) {
    e.preventDefault();
    const firstName = document.getElementById('regFirstName').value;
    const lastName = document.getElementById('regLastName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const errorEl = document.getElementById('registerError');
    const btn = document.getElementById('registerSubmit');

    btn.textContent = 'Creando cuenta...';
    btn.disabled = true;
    errorEl.textContent = '';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName })
      });
      const data = await res.json();

      if (data.success) {
        window.__tcbUser = data.user;
        closeAuthModal();
        updateUserUI();
        await syncCartAfterLogin();
      } else {
        errorEl.textContent = data.error || 'Error al crear la cuenta';
      }
    } catch (err) {
      errorEl.textContent = 'Error de conexion. Intenta de nuevo.';
    }

    btn.textContent = 'Crear cuenta';
    btn.disabled = false;
  }

  // ===== Logout =====
  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) { /* ignore */ }

    window.__tcbUser = null;
    document.getElementById('userDropdown').classList.remove('active');
    updateUserUI();
  }

  // ===== Cart Sync After Login =====
  async function syncCartAfterLogin() {
    try {
      // Get current localStorage cart
      const localCart = JSON.parse(localStorage.getItem('tcb_cart') || '[]');

      // Send to server for merge
      const res = await fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: localCart })
      });
      const data = await res.json();

      if (data.success && data.items) {
        // Update localStorage with merged result
        const merged = data.items.map(item => ({
          productId: item.product_id,
          quantity: item.quantity
        }));
        localStorage.setItem('tcb_cart', JSON.stringify(merged));

        // Reload cart UI
        if (window.loadCartFromStorage) {
          window.loadCartFromStorage();
          window.refreshCartUI();
        }
      }
    } catch (e) {
      console.error('Cart sync error:', e);
    }
  }

  // ===== Update User UI =====
  function updateUserUI() {
    const indicator = document.getElementById('userIndicator');
    const nameEl = document.getElementById('userDropdownName');
    const emailEl = document.getElementById('userDropdownEmail');
    const adminBtn = document.getElementById('btnAdminPanel');

    if (window.__tcbUser) {
      indicator.style.display = 'block';
      nameEl.textContent = (window.__tcbUser.firstName || '') + ' ' + (window.__tcbUser.lastName || '');
      emailEl.textContent = window.__tcbUser.email;
      // Show admin button only for admins
      if (adminBtn) {
        adminBtn.style.display = window.__tcbUser.isAdmin ? 'flex' : 'none';
      }
    } else {
      indicator.style.display = 'none';
      nameEl.textContent = '';
      emailEl.textContent = '';
      if (adminBtn) adminBtn.style.display = 'none';
    }
  }

  // ===== Orders Drawer =====
  function openOrdersDrawer() {
    const panel = document.getElementById('ordersDrawerPanel');
    const overlay = document.getElementById('ordersOverlay');
    panel.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadOrders();
  }

  function closeOrdersDrawer() {
    const panel = document.getElementById('ordersDrawerPanel');
    const overlay = document.getElementById('ordersOverlay');
    panel.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  async function loadOrders() {
    const content = document.getElementById('ordersContent');
    content.innerHTML = '<div class="orders-loading">Cargando pedidos...</div>';

    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Not authenticated');
      const data = await res.json();

      if (!data.orders || data.orders.length === 0) {
        content.innerHTML = '<div class="orders-empty">No tienes pedidos aun.<br>Explora nuestra tienda!</div>';
        return;
      }

      content.innerHTML = data.orders.map(order => {
        const date = new Date(order.created_at).toLocaleDateString('es-UY', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
        const statusLabels = {
          'approved': 'Aprobado',
          'pending_transfer': 'Pendiente (Transferencia)',
          'pending_cash': 'Pendiente (Efectivo)'
        };
        const statusClass = order.status === 'approved' ? 'status--approved' : 'status--pending';
        const items = Array.isArray(order.items) ? order.items : [];

        return `
          <div class="order-card">
            <div class="order-card__header">
              <span class="order-card__id">${order.order_id}</span>
              <span class="order-card__date">${date}</span>
            </div>
            <div class="order-card__items">
              ${items.map(i => `<span class="order-card__item">${i.name || 'Producto'} x${i.quantity}</span>`).join('')}
            </div>
            <div class="order-card__footer">
              <span class="order-card__total">$U ${Number(order.total_uyu).toLocaleString('es-UY')}</span>
              <span class="order-card__status ${statusClass}">${statusLabels[order.status] || order.status}</span>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      content.innerHTML = '<div class="orders-empty">Error al cargar los pedidos.</div>';
    }
  }

  // ===== Check Session on Page Load =====
  async function checkSession() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) {
        window.__tcbUser = data.user;
        updateUserUI();
      }
    } catch (e) {
      // Not logged in or server not running
    }
  }

  // ===== Pre-fill Checkout =====
  function prefillCheckout() {
    if (!window.__tcbUser) return;
    const user = window.__tcbUser;

    // Try to fill checkout fields if they exist
    const fields = {
      'emailInput': user.email,
      'firstNameInput': user.firstName,
      'lastNameInput': user.lastName,
      'phoneInput': user.phone,
      'shippingStreet': user.shippingStreet,
      'shippingApt': user.shippingApt
    };

    Object.entries(fields).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el && value) el.value = value;
    });
  }

  // ===== Init =====
  function initAuth() {
    injectAuthUI();
    initAuthEvents();
    checkSession().then(() => {
      // If on checkout page, pre-fill after checking session
      if (window.location.pathname.includes('checkout')) {
        prefillCheckout();
      }
    });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }

})();
