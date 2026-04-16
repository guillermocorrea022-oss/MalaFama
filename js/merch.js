// =============================================
// MERCH PAGE — Página de producto merch/no-cerveza
// =============================================
// Carga el producto dinámicamente por ?slug= en la URL.
// Layout con fondo blanco, distinto al PDP de cervezas.
// Depende de: data.js (PRODUCTS), app.js (cart/stock), utils.js (helpers)
// =============================================

(function() {
  'use strict';

  var merchHero = document.getElementById('merchHero');
  if (!merchHero) return;

  // ===== Obtener slug de la URL =====
  var params = new URLSearchParams(window.location.search);
  var slug = params.get('slug');
  if (!slug) {
    window.location.href = 'index.html';
    return;
  }

  // ===== Buscar producto en el catálogo =====
  var product = null;
  for (var i = 0; i < PRODUCTS.length; i++) {
    if (PRODUCTS[i].slug === slug) {
      product = PRODUCTS[i];
      break;
    }
  }
  if (!product) {
    window.location.href = 'index.html';
    return;
  }

  // ===== Datos de la página =====
  document.title = product.name + ' | Cervecería Mala Fama';

  // Imagen principal
  var merchImage = document.getElementById('merchImage');
  if (merchImage) {
    merchImage.src = product.image;
    merchImage.alt = product.name;
  }

  // Breadcrumb
  var breadcrumb = document.getElementById('merchBreadcrumb');
  if (breadcrumb) breadcrumb.textContent = product.name;

  // Título — usa titleColor o accentColor del producto
  var titleEl = document.getElementById('merchTitle');
  if (titleEl) {
    titleEl.textContent = product.name;
    titleEl.style.color = product.titleColor || product.accentColor || '#1a1a1a';
  }

  // Subtítulo
  var subtitleEl = document.getElementById('merchSubtitle');
  if (subtitleEl) subtitleEl.textContent = product.subtitle;

  // Precio
  var priceEl = document.getElementById('merchPrice');
  if (priceEl && typeof formatPriceUYU === 'function' && typeof getProductPriceUYU === 'function') {
    priceEl.textContent = formatPriceUYU(getProductPriceUYU(product));
  }

  // Descripción
  var descEl = document.getElementById('merchDesc');
  if (descEl) descEl.textContent = product.description;

  // ===== Grilla de detalles — info relevante según tipo de producto =====
  var detailsGrid = document.getElementById('merchDetails');
  if (detailsGrid) {
    var details = [];

    if (product.size) {
      details.push({ label: 'Tamaño', value: product.size });
    }
    if (product.container === 'merch') {
      if (product.name.toLowerCase().includes('buzo') || product.name.toLowerCase().includes('remera')) {
        details.push({ label: 'Material', value: '100% algodón' });
        details.push({ label: 'Fit', value: 'Unisex' });
      }
      if (product.name.toLowerCase().includes('vaso')) {
        details.push({ label: 'Capacidad', value: '400ml' });
        details.push({ label: 'Tipo', value: 'Con serigrafía' });
      }
    }

    if (details.length > 0) {
      detailsGrid.innerHTML = details.map(function(d) {
        return '<div class="merch-detail">' +
          '<span class="merch-detail__label">' + escapeHtml(d.label) + '</span>' +
          '<span class="merch-detail__value">' + escapeHtml(d.value) + '</span>' +
          '</div>';
      }).join('');
    }
  }

  // ===== Estado de stock =====
  var stockStatusEl = document.getElementById('merchStockStatus');
  var addBtn = document.getElementById('merchAddBtn');
  if (typeof isProductAvailable === 'function') {
    var available = isProductAvailable(product.id);
    var stk = typeof getProductStockCount === 'function' ? getProductStockCount(product.id) : 999;

    if (!available) {
      if (stockStatusEl) stockStatusEl.innerHTML = '<span class="merch-stock merch-stock--out">PRODUCTO SIN STOCK</span>';
      if (addBtn) {
        addBtn.disabled = true;
        addBtn.style.opacity = '0.4';
        addBtn.style.cursor = 'not-allowed';
        addBtn.innerHTML = 'Sin Stock';
      }
    } else if (stk < 10) {
      // Alerta visual de pocas unidades
      if (stockStatusEl) stockStatusEl.innerHTML = '<span class="merch-stock merch-stock--low">¡Últimas ' + stk + ' unidades!</span>';
    }
  }

  // ===== Controles de cantidad (usa utilidad compartida de utils.js) =====
  var qtyControls = initQuantityControls(
    document.getElementById('merchQtyMinus'),
    document.getElementById('merchQtyPlus'),
    document.getElementById('merchQtyValue')
  );

  // ===== Agregar al carrito =====
  if (addBtn) {
    addBtn.addEventListener('click', function() {
      // Verificar stock antes de agregar
      if (typeof isProductAvailable === 'function' && !isProductAvailable(product.id)) {
        showToast('Este producto no tiene stock disponible.', 'error');
        return;
      }

      // Usar la función global de app.js para agregar al carrito
      if (typeof window._addStandardToCart === 'function') {
        window._addStandardToCart(product, qtyControls.get());
      }

      // Feedback visual (usa utilidad compartida de utils.js)
      addToCartFeedback(addBtn, cartIconSVG() + ' Agregar al carrito');
    });
  }

  // ===== Productos relacionados (usa utilidad compartida de utils.js) =====
  var relatedCarousel = document.getElementById('relatedCarousel');
  if (relatedCarousel) {
    loadRelatedProducts(relatedCarousel, product);
  }

})();
