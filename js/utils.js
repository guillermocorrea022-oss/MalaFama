// =====================================================================
// UTILS.JS — Utilidades compartidas y configuración centralizada
// =====================================================================
// Este archivo se carga ANTES que app.js, pack.js, merch.js, etc.
// Contiene funciones reutilizables que evitan duplicar código.
//
// IMPORTANTE: No depende de ningún otro archivo JS del proyecto.
// Todos los valores configurables del sitio están en MF_CONFIG.
// =====================================================================

'use strict';

// ─────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN CENTRALIZADA
// ─────────────────────────────────────────────────────────────────────
// Todos los "números mágicos" del sitio en un solo lugar.
// Para cambiar un valor (ej: umbral de envío gratis), modificar aquí
// y se aplica automáticamente en todo el sitio.
// ─────────────────────────────────────────────────────────────────────
var MF_CONFIG = {

  // ─── Carrito ───
  cart: {
    freeShippingThreshold: 3000,   // Monto mínimo en UYU para envío gratis
    bulkDiscountThreshold: 16,     // Cantidad mínima de latas para descuento
    bulkDiscountPercent: 0.15,     // 15% de descuento por volumen
    maxQuantityPerItem: 99,        // Máximo de unidades por producto
    storageKey: 'tcb_cart'         // Clave en localStorage para persistir el carrito
  },

  // ─── UI / Animaciones ───
  ui: {
    carouselAutoScrollMs: 3000,    // Tiempo entre slides del carrusel de promos (ms)
    heroRotationMs: 6000,          // Tiempo entre rotaciones del hero dinámico (ms)
    toastDurationMs: 3000,         // Duración de las notificaciones toast (ms)
    addToCartFeedbackMs: 1500,     // Duración del feedback "¡Agregado!" (ms)
    colorSampleSize: 80            // Tamaño de muestra para extracción de color vibrante
  },

  // ─── Extracción de color ───
  color: {
    minSaturation: 0.25,           // Saturación mínima para considerar un color "vibrante"
    minLightness: 0.15,            // Luminosidad mínima (excluye negros)
    maxLightness: 0.85,            // Luminosidad máxima (excluye blancos)
    hueBuckets: 36,                // Cantidad de buckets de tono (360° / 10° = 36)
    lightBgThreshold: 180          // Valor R+G+B promedio para considerar fondo "claro"
  },

  // ─── Pack personalizado ───
  pack: {
    maxBeers: 3                    // Cantidad de cervezas en el pack "Armá tu Pack"
  }
};

// Hacer accesible globalmente
window.MF_CONFIG = MF_CONFIG;


// ─────────────────────────────────────────────────────────────────────
// SANITIZACIÓN HTML — Previene ataques XSS
// ─────────────────────────────────────────────────────────────────────

/**
 * Escapa caracteres HTML peligrosos en un string.
 * Usar siempre que se inserte texto de usuario/producto en innerHTML.
 *
 * @param {string} unsafe - Texto sin sanitizar
 * @returns {string} Texto seguro para insertar en HTML
 *
 * @example
 * element.innerHTML = '<span>' + escapeHtml(product.name) + '</span>';
 */
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return String(unsafe || '');
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.escapeHtml = escapeHtml;


// ─────────────────────────────────────────────────────────────────────
// SISTEMA DE TOASTS — Notificaciones no bloqueantes
// ─────────────────────────────────────────────────────────────────────
// Reemplaza los alert() nativos del navegador con notificaciones
// elegantes que no bloquean la interacción del usuario.
//
// Tipos disponibles: 'success', 'error', 'warning', 'info'
// ─────────────────────────────────────────────────────────────────────

/**
 * Muestra una notificación toast en la pantalla.
 *
 * @param {string} message - Texto del mensaje
 * @param {'success'|'error'|'warning'|'info'} [type='info'] - Tipo de notificación
 * @param {number} [duration] - Duración en ms (default: MF_CONFIG.ui.toastDurationMs)
 *
 * @example
 * showToast('Producto agregado al carrito', 'success');
 * showToast('No hay stock disponible', 'error');
 * showToast('¡Últimas unidades!', 'warning');
 */
function showToast(message, type, duration) {
  type = type || 'info';
  duration = duration || MF_CONFIG.ui.toastDurationMs;

  // Crear contenedor si no existe
  var container = document.getElementById('mf-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'mf-toast-container';
    container.style.cssText =
      'position:fixed;top:60px;right:20px;z-index:99999;' +
      'display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(container);
  }

  // Colores según tipo
  var colors = {
    success: { bg: '#065F46', border: '#10B981', icon: '✓' },
    error:   { bg: '#7F1D1D', border: '#EF4444', icon: '✕' },
    warning: { bg: '#78350F', border: '#F59E0B', icon: '⚠' },
    info:    { bg: '#1E3A5F', border: '#3B82F6', icon: 'ℹ' }
  };
  var c = colors[type] || colors.info;

  // Crear toast
  var toast = document.createElement('div');
  toast.style.cssText =
    'pointer-events:auto;display:flex;align-items:center;gap:10px;' +
    'padding:12px 20px;border-radius:12px;' +
    'background:' + c.bg + ';border:1px solid ' + c.border + ';' +
    'color:#fff;font-family:var(--font-family,Inter,sans-serif);' +
    'font-size:14px;font-weight:600;letter-spacing:0.02em;' +
    'box-shadow:0 8px 24px rgba(0,0,0,0.3);' +
    'transform:translateX(120%);transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1);' +
    'max-width:340px;line-height:1.4;';

  toast.innerHTML =
    '<span style="font-size:16px;flex-shrink:0;">' + c.icon + '</span>' +
    '<span>' + escapeHtml(message) + '</span>';

  container.appendChild(toast);

  // Animar entrada
  requestAnimationFrame(function() {
    toast.style.transform = 'translateX(0)';
  });

  // Animar salida y remover
  setTimeout(function() {
    toast.style.transform = 'translateX(120%)';
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}

window.showToast = showToast;


// ─────────────────────────────────────────────────────────────────────
// CART TOAST — Notificación rica de "producto agregado al carrito"
// ─────────────────────────────────────────────────────────────────────
// Muestra una tarjeta con imagen del producto, nombre, cantidad y un
// botón "IR A PAGAR" que lleva al checkout.
// Solo una instancia a la vez. Auto-cierra a los 5 segundos.
// ─────────────────────────────────────────────────────────────────────

/**
 * Muestra la notificación de "agregado al carrito" con datos del producto.
 *
 * @param {Object} product    - Objeto del producto (de PRODUCTS[])
 * @param {number} [qty=1]    - Cantidad agregada
 * @param {string} [packLabel] - Etiqueta del pack seleccionado (ej: "6-PACK")
 */
function showCartToast(product, qty, packLabel) {
  if (!product) return;
  qty = qty || 1;

  // Descartar cualquier toast de carrito anterior
  var prev = document.getElementById('mf-cart-toast');
  if (prev && typeof prev._dismiss === 'function') prev._dismiss();
  else if (prev && prev.parentNode) prev.parentNode.removeChild(prev);

  // Precio del ítem agregado
  var priceStr = '';
  if (typeof window.getProductPriceUYU === 'function' && typeof window.formatPriceUYU === 'function') {
    var unitPrice = window.getProductPriceUYU(product);
    priceStr = window.formatPriceUYU(unitPrice * qty);
  }

  // Total del carrito (incluye lo que se acaba de agregar)
  var totalStr = '';
  if (typeof window.getCartTotal === 'function' && typeof window.formatPriceUYU === 'function') {
    totalStr = window.formatPriceUYU(window.getCartTotal());
  }

  // Línea de detalle: "2x · 6-PACK · $U 440"
  var parts = [qty + 'x'];
  if (packLabel) parts.push(packLabel);
  if (priceStr)  parts.push(priceStr);
  var detailStr = parts.join(' · ');

  var imgSrc  = product.image || '';
  var name    = escapeHtml(product.name || '');
  var detail  = escapeHtml(detailStr);
  var total   = escapeHtml(totalStr);

  var toast = document.createElement('div');
  toast.id = 'mf-cart-toast';
  toast.className = 'mf-cart-toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML =
    '<div class="mf-cart-toast__progress"></div>' +
    '<button class="mf-cart-toast__close" aria-label="Cerrar">✕</button>' +
    '<div class="mf-cart-toast__body">' +
      (imgSrc
        ? '<div class="mf-cart-toast__img"><img src="' + imgSrc + '" alt="' + name + '" loading="lazy"></div>'
        : '') +
      '<div class="mf-cart-toast__info">' +
        '<p class="mf-cart-toast__added">✓&nbsp;AGREGADO AL CARRITO</p>' +
        '<p class="mf-cart-toast__name">' + name + '</p>' +
        '<p class="mf-cart-toast__detail">' + detail + '</p>' +
        (total ? '<p class="mf-cart-toast__total">TOTAL CARRITO: <strong>' + total + '</strong></p>' : '') +
      '</div>' +
    '</div>' +
    '<button class="mf-cart-toast__cta" type="button">' +
      '<span class="mf-cart-toast__cta-fill"></span>' +
      '<span class="mf-cart-toast__cta-text">IR A PAGAR →</span>' +
    '</button>';

  document.body.appendChild(toast);

  var dismissed = false;
  var autoTimer;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(autoTimer);
    toast.classList.remove('mf-cart-toast--in');
    toast.classList.add('mf-cart-toast--out');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 400);
  }

  toast._dismiss = dismiss;

  // Animar entrada: pequeño delay para que el navegador pinte el estado inicial antes de transicionar
  setTimeout(function () {
    toast.classList.add('mf-cart-toast--in');
    // Iniciar barra de progreso (shrink de 100% → 0% en 5s)
    var bar = toast.querySelector('.mf-cart-toast__progress');
    if (bar) {
      bar.style.transition = 'width 5s linear';
      bar.style.width = '0%';
    }
  }, 30);

  // Auto-cierre a los 5 s
  autoTimer = setTimeout(dismiss, 5000);

  // Botón cerrar
  var closeBtn = toast.querySelector('.mf-cart-toast__close');
  if (closeBtn) closeBtn.addEventListener('click', function (e) { e.stopPropagation(); dismiss(); });

  // Botón "IR A PAGAR" → navegar a checkout (serializa carrito a sessionStorage)
  var ctaBtn = toast.querySelector('.mf-cart-toast__cta');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (typeof window.goToCheckout === 'function') {
        window.goToCheckout();
      } else {
        window.location.href = 'checkout.html';
      }
      dismiss();
    });
  }
}

window.showCartToast = showCartToast;


// ─────────────────────────────────────────────────────────────────────
// VALIDACIÓN DE EMAIL
// ─────────────────────────────────────────────────────────────────────

/**
 * Valida un email con regex robusto.
 * Más confiable que solo chequear si contiene '@'.
 *
 * @param {string} email - Email a validar
 * @returns {boolean} true si el formato es válido
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

window.isValidEmail = isValidEmail;


// ─────────────────────────────────────────────────────────────────────
// SVG DEL CARRITO (reutilizado en pack.js, merch.js, app.js)
// ─────────────────────────────────────────────────────────────────────

/**
 * Retorna el HTML del ícono SVG del carrito de compras.
 * Centralizado para no repetir el SVG en cada archivo.
 *
 * @param {number} [size=18] - Tamaño del ícono en px
 * @returns {string} HTML del SVG
 */
function cartIconSVG(size) {
  size = size || 18;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>' +
    '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' +
    '</svg>';
}

window.cartIconSVG = cartIconSVG;


// ─────────────────────────────────────────────────────────────────────
// FEEDBACK VISUAL DE "AGREGAR AL CARRITO"
// ─────────────────────────────────────────────────────────────────────

/**
 * Aplica feedback visual al botón de agregar al carrito.
 * Muestra "✓ ¡Agregado!" en verde por 1.5s y luego restaura.
 *
 * @param {HTMLElement} btn - El botón de agregar al carrito
 * @param {string} [originalHTML] - HTML original del botón para restaurar.
 *   Si no se pasa, se usa el SVG del carrito + "Agregar al carrito".
 */
function addToCartFeedback(btn, originalHTML) {
  if (!btn) return;
  var restore = originalHTML || (cartIconSVG() + ' Agregar al carrito');
  btn.textContent = '✓ ¡Agregado!';
  btn.style.background = '#16a34a';

  // Mostrar toast de confirmación
  showToast('Producto agregado al carrito', 'success');

  setTimeout(function() {
    btn.style.background = '';
    btn.innerHTML = restore;
  }, MF_CONFIG.ui.addToCartFeedbackMs);
}

window.addToCartFeedback = addToCartFeedback;


// ─────────────────────────────────────────────────────────────────────
// CARRUSEL DE PRODUCTOS RELACIONADOS
// ─────────────────────────────────────────────────────────────────────

/**
 * Carga y renderiza productos relacionados en un carrusel horizontal.
 * Excluye el producto actual, productos archivados y sin stock.
 *
 * @param {HTMLElement} container - Elemento del carrusel (#relatedCarousel)
 * @param {Object} currentProduct - Producto actual (para excluirlo)
 * @param {number} [maxItems=6] - Cantidad máxima de relacionados
 */
function loadRelatedProducts(container, currentProduct, maxItems) {
  if (!container || typeof window.createProductCardExternal !== 'function') return;
  maxItems = maxItems || 6;

  var related = PRODUCTS.filter(function(p) {
    return p.id !== currentProduct.id &&
           !p.tags.includes('archive') &&
           (typeof isProductAvailable === 'function' ? isProductAvailable(p.id) : true);
  }).slice(0, maxItems);

  related.forEach(function(p) {
    var card = window.createProductCardExternal(p);
    if (card) container.appendChild(card);
  });
}

window.loadRelatedProducts = loadRelatedProducts;


// ─────────────────────────────────────────────────────────────────────
// CONTROLES DE CANTIDAD (+/-)
// ─────────────────────────────────────────────────────────────────────

/**
 * Inicializa controles de cantidad (botón -, display, botón +).
 * Retorna un objeto con getter/setter para la cantidad actual.
 *
 * @param {HTMLElement} minusBtn - Botón de decrementar
 * @param {HTMLElement} plusBtn - Botón de incrementar
 * @param {HTMLElement} display - Elemento que muestra el número
 * @param {number} [initial=1] - Cantidad inicial
 * @returns {{ get: () => number, set: (n: number) => void }}
 *
 * @example
 * var qty = initQuantityControls(minusEl, plusEl, displayEl);
 * // Después: qty.get() → 3
 */
function initQuantityControls(minusBtn, plusBtn, display, initial) {
  var qty = initial || 1;
  var max = MF_CONFIG.cart.maxQuantityPerItem;

  function update() {
    if (display) display.textContent = qty;
  }

  if (minusBtn) {
    minusBtn.addEventListener('click', function() {
      if (qty > 1) { qty--; update(); }
    });
  }

  if (plusBtn) {
    plusBtn.addEventListener('click', function() {
      if (qty < max) { qty++; update(); }
    });
  }

  update();

  return {
    get: function() { return qty; },
    set: function(n) { qty = Math.max(1, Math.min(n, max)); update(); }
  };
}

window.initQuantityControls = initQuantityControls;
