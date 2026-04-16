// =============================================
// PACK PAGE — Página "Armá tu Pack"
// =============================================
// Lógica standalone para la página pack.html.
// Depende de: data.js (PRODUCTS), app.js (cart functions), utils.js (helpers)
// =============================================

(function() {
  'use strict';

  // Only run on pack page
  var packGrid = document.getElementById('packBeerGrid');
  if (!packGrid) return;

  // Find the pack product from data
  var packProduct = null;
  for (var i = 0; i < PRODUCTS.length; i++) {
    if (PRODUCTS[i].customPack) {
      packProduct = PRODUCTS[i];
      break;
    }
  }
  if (!packProduct) return;

  // Set page data
  document.title = packProduct.name + ' | Cervecería Mala Fama';

  var packImage = document.getElementById('packImage');
  if (packImage) packImage.src = packProduct.image;

  var packTitle = document.getElementById('packTitle');
  if (packTitle) packTitle.textContent = packProduct.name;

  var packSubtitle = document.getElementById('packSubtitle');
  if (packSubtitle) packSubtitle.textContent = packProduct.subtitle;

  var packPrice = document.getElementById('packPrice');
  if (packPrice && typeof formatPriceUYU === 'function' && typeof getProductPriceUYU === 'function') {
    packPrice.textContent = formatPriceUYU(getProductPriceUYU(packProduct));
  }

  var packDesc = document.getElementById('packDesc');
  if (packDesc) packDesc.textContent = packProduct.description;

  // ===== Estado de selección de cervezas =====
  var selectedBeers = [];

  // ===== Build beer grid =====
  var availableCans = PRODUCTS.filter(function(p) {
    return p.container === 'can' &&
           !p.tags.includes('archive') &&
           (typeof isProductAvailable === 'function' ? isProductAvailable(p.id) : true);
  });

  availableCans.forEach(function(beer) {
    var card = document.createElement('div');
    card.className = 'pack-beer-card';
    card.setAttribute('data-beer-id', beer.id);
    card.innerHTML =
      '<img class="pack-beer-card__img" src="' + escapeHtml(beer.image) + '" alt="' + escapeHtml(beer.name) + '" loading="lazy">' +
      '<div class="pack-beer-card__name">' + escapeHtml(beer.name) + '</div>';
    card.addEventListener('click', function() {
      toggleBeer(beer);
    });
    packGrid.appendChild(card);
  });

  // ===== Toggle beer selection =====
  function toggleBeer(beer) {
    var idx = -1;
    for (var i = 0; i < selectedBeers.length; i++) {
      if (selectedBeers[i].id === beer.id) { idx = i; break; }
    }
    if (idx >= 0) {
      selectedBeers.splice(idx, 1);
    } else if (selectedBeers.length < 3) {
      selectedBeers.push(beer);
    }
    updateUI();
  }

  // ===== Remove from slot =====
  window.removePackSlot = function(slotIndex) {
    if (selectedBeers[slotIndex]) {
      selectedBeers.splice(slotIndex, 1);
      updateUI();
    }
  };

  // ===== Update all UI =====
  function updateUI() {
    // Slots
    var slots = document.querySelectorAll('.pack-slot');
    slots.forEach(function(slot, i) {
      if (selectedBeers[i]) {
        slot.classList.add('filled');
        slot.innerHTML =
          '<img class="pack-slot__img" src="' + escapeHtml(selectedBeers[i].image) + '" alt="' + escapeHtml(selectedBeers[i].name) + '">' +
          '<span class="pack-slot__name">' + escapeHtml(selectedBeers[i].name) + '</span>' +
          '<button class="pack-slot__remove" onclick="event.stopPropagation(); removePackSlot(' + i + ')">✕</button>';
      } else {
        slot.classList.remove('filled');
        slot.innerHTML = '<span class="pack-slot__empty">+</span>';
      }
    });

    // Counter
    var counter = document.getElementById('packCounter');
    if (counter) {
      counter.textContent = selectedBeers.length + ' / 3 seleccionadas';
      counter.className = 'pack-counter' + (selectedBeers.length === 3 ? ' complete' : '');
    }

    // Grid card states
    var cards = document.querySelectorAll('.pack-beer-card');
    cards.forEach(function(card) {
      var beerId = parseInt(card.getAttribute('data-beer-id'));
      var isSelected = selectedBeers.some(function(b) { return b.id === beerId; });
      card.classList.toggle('selected', isSelected);
      card.classList.toggle('disabled', selectedBeers.length >= 3 && !isSelected);
    });

    // Add to cart button
    var addBtn = document.getElementById('packAddBtn');
    if (addBtn) {
      if (selectedBeers.length < 3) {
        addBtn.disabled = true;
        var remaining = 3 - selectedBeers.length;
        addBtn.innerHTML =
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>' +
          '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' +
          '</svg> Elegí ' + remaining + ' cerveza' + (remaining > 1 ? 's' : '') + ' más';
      } else {
        addBtn.disabled = false;
        addBtn.innerHTML =
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>' +
          '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' +
          '</svg> Agregar al carrito';
      }
    }
  }

  // ===== Controles de cantidad (usa utilidad compartida de utils.js) =====
  var qtyControls = initQuantityControls(
    document.getElementById('packQtyMinus'),
    document.getElementById('packQtyPlus'),
    document.getElementById('packQtyValue')
  );

  // ===== Add to cart =====
  var addBtn = document.getElementById('packAddBtn');
  if (addBtn) {
    addBtn.addEventListener('click', function() {
      if (selectedBeers.length < MF_CONFIG.pack.maxBeers) {
        showToast('Tenés que elegir ' + MF_CONFIG.pack.maxBeers + ' cervezas para armar tu pack.', 'warning');
        return;
      }

      // Agregar al carrito usando la función global de app.js
      if (typeof window.addCustomPackToCart === 'function') {
        window.addCustomPackToCart(packProduct, qtyControls.get(), selectedBeers);
      }

      // Feedback visual (usa utilidad compartida de utils.js)
      addToCartFeedback(addBtn, cartIconSVG() + ' Agregar al carrito');
      setTimeout(updateUI, MF_CONFIG.ui.addToCartFeedbackMs);
    });
  }

  // ===== Productos relacionados (usa utilidad compartida de utils.js) =====
  var relatedCarousel = document.getElementById('relatedCarousel');
  if (relatedCarousel) {
    loadRelatedProducts(relatedCarousel, packProduct);
  }

  // Initial UI
  updateUI();

})();
