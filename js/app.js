// =========================================
// TWO CHEFS BREWING — Application Logic
// =========================================

(function () {
  'use strict';

  // ===== State =====
  let currentContainer = 'all';
  let currentStyle = 'all';
  let currentSort = 'default';
  let cart = [];
  let cartCount = 0;
  let selectedPack = 0; // Índice del pack seleccionado en la página de producto
  let quantity = 1; // Cantidad seleccionada en la página de producto
  let currentProductRef = null; // Referencia al producto actual para actualizar el precio dinámicamente
  let stockData = {}; // { productId: { stock, active, price_uyu } }
  let priceOverrides = {}; // { productId: priceUYU }

  // ===== Cart Persistence (localStorage) =====
  function saveCartToStorage() {
    try {
      const simplified = cart.map(item => {
        var entry = { productId: item.product.id, quantity: item.quantity };
        if (item.selectedBeers) entry.selectedBeers = item.selectedBeers;
        return entry;
      });
      localStorage.setItem('tcb_cart', JSON.stringify(simplified));
      // If logged in, also sync to server silently
      if (window.__tcbUser) {
        fetch('/api/cart/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: simplified })
        }).catch(function(e) { console.warn('[Cart] Error al sincronizar con servidor:', e.message); });
      }
    } catch (e) { /* localStorage might be full or unavailable */ }
  }

  function loadCartFromStorage() {
    try {
      const saved = JSON.parse(localStorage.getItem('tcb_cart') || '[]');
      if (!Array.isArray(saved) || saved.length === 0) return;
      cart = saved.map(item => {
        const product = PRODUCTS.find(p => p.id === item.productId);
        if (!product) return null;
        var cartItem = { product, quantity: item.quantity };
        if (item.selectedBeers) cartItem.selectedBeers = item.selectedBeers;
        return cartItem;
      }).filter(Boolean);
      cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
    } catch (e) { cart = []; cartCount = 0; }
  }

  // ===== Stock Data =====
  async function loadStockData() {
    try {
      const res = await fetch('/api/stock');
      const data = await res.json();
      if (data.stock) {
        stockData = {};
        priceOverrides = {};
        data.stock.forEach(s => {
          stockData[s.product_id] = { stock: s.stock, active: !!s.active };
          if (s.price_uyu > 0) {
            priceOverrides[s.product_id] = s.price_uyu;
          }
        });
      }
    } catch (e) {
      // Stock API no disponible — permitir todos los productos por defecto.
      // Esto ocurre en entornos sin servidor (preview estático).
      console.warn('[Stock] API no disponible, permitiendo todos los productos:', e.message);
    }
  }

  function isProductAvailable(productId) {
    const s = stockData[productId];
    if (!s) {
      const product = PRODUCTS.find(p => p.id === productId);
      if (product && product.tags && product.tags.includes('archive')) return false;
      return true;
    }
    return s.active && s.stock > 0;
  }

  function getProductStockCount(productId) {
    const s = stockData[productId];
    return s ? s.stock : 999;
  }

  function isProductActive(productId) {
    const s = stockData[productId];
    if (!s) {
      const product = PRODUCTS.find(p => p.id === productId);
      if (product && product.tags && product.tags.includes('archive')) return false;
      return true;
    }
    return s.active;
  }

  // Expose cart functions globally for auth.js integration
  window.saveCartToStorage = saveCartToStorage;
  window.loadCartFromStorage = loadCartFromStorage;
  window.getCart = function() { return cart; };
  window.setCart = function(newCart) {
    cart = newCart;
    cartCount = cart.reduce((s, i) => s + i.quantity, 0);
    updateCartCount();
    renderCart();
    saveCartToStorage();
  };
  window.refreshCartUI = function() {
    updateCartCount();
    renderCart();
  };

  // ===== Utilities =====
  function getProductBySlug(slug) {
    return PRODUCTS.find(p => p.slug === slug);
  }

  function getUrlParam(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  }

  // ===== Auto-detect vibrant color from product image =====
  var _vibrantCache = {};
  function extractVibrantColor(imgSrc) {
    return new Promise(function(resolve) {
      if (_vibrantCache[imgSrc]) return resolve(_vibrantCache[imgSrc]);
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        try {
          var canvas = document.createElement('canvas');
          var size = (typeof MF_CONFIG !== 'undefined') ? MF_CONFIG.ui.colorSampleSize : 80;
          canvas.width = size;
          canvas.height = size;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, size, size);
          var data = ctx.getImageData(0, 0, size, size).data;

          // Collect colors with their HSL values
          var colorBuckets = {};
          for (var i = 0; i < data.length; i += 16) { // sample every 4th pixel
            var r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
            if (a < 200) continue; // skip transparent

            // RGB to HSL
            var rn = r/255, gn = g/255, bn = b/255;
            var max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
            var h, s, l = (max + min) / 2;

            if (max === min) { h = s = 0; }
            else {
              var d = max - min;
              s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
              if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
              else if (max === gn) h = ((bn - rn) / d + 2) / 6;
              else h = ((rn - gn) / d + 4) / 6;
            }

            // Skip grays (low saturation), very dark, very light
            if (s < 0.25 || l < 0.15 || l > 0.85) continue;

            // Bucket by hue (36 buckets = 10° each)
            var bucket = Math.floor(h * 36);
            if (!colorBuckets[bucket]) colorBuckets[bucket] = { count: 0, totalS: 0, totalL: 0, totalR: 0, totalG: 0, totalB: 0 };
            colorBuckets[bucket].count++;
            colorBuckets[bucket].totalS += s;
            colorBuckets[bucket].totalL += l;
            colorBuckets[bucket].totalR += r;
            colorBuckets[bucket].totalG += g;
            colorBuckets[bucket].totalB += b;
          }

          // Score each bucket: prefer vibrant, eye-catching colors
          var bestScore = 0, bestColor = null;
          Object.keys(colorBuckets).forEach(function(key) {
            var b = colorBuckets[key];
            if (b.count < 3) return; // ignore very rare colors
            var avgS = b.totalS / b.count;
            var avgL = b.totalL / b.count;
            var hue = parseFloat(key) / 36; // 0-1

            // Lightness bonus: prefer 0.35-0.55 range (rich, not washed out)
            var lBonus = 1 - Math.abs(avgL - 0.45) * 2;
            lBonus = Math.max(lBonus, 0.2);

            // Hue bonus: boost reds, blues, teals, magentas (eye-catching)
            // Penalize yellows/beiges (hue 0.1-0.2) which are less striking
            var hueBonus = 1;
            if (hue < 0.05 || hue > 0.95) hueBonus = 1.6;  // Red — most eye-catching
            else if (hue > 0.55 && hue < 0.75) hueBonus = 1.4; // Blue/teal
            else if (hue > 0.8 && hue < 0.95) hueBonus = 1.5;  // Magenta/pink
            else if (hue > 0.1 && hue < 0.2) hueBonus = 0.5;   // Yellow/beige — penalize
            else if (hue > 0.2 && hue < 0.45) hueBonus = 1.1;  // Green
            else if (hue > 0.45 && hue < 0.55) hueBonus = 1.3;  // Cyan/teal

            // Score = saturation * sqrt(count) * lightness * hue preference
            var score = avgS * Math.sqrt(b.count) * lBonus * hueBonus;
            if (score > bestScore) {
              bestScore = score;
              // Boost saturation for the final color to make it pop
              var finalS = Math.min(avgS * 1.3, 1);
              var finalL = Math.max(Math.min(avgL, 0.5), 0.35);
              bestColor = hslToHex(hue, finalS, finalL);
            }
          });

          _vibrantCache[imgSrc] = bestColor;
          resolve(bestColor);
        } catch(e) {
          resolve(null); // CORS or other error
        }
      };
      img.onerror = function() { resolve(null); };
      img.src = imgSrc;
    });
  }

  function hslToHex(h, s, l) {
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      function hue2rgb(p, q, t) {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      }
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return '#' + [r, g, b].map(function(x) {
      var hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  // ===== Auto-detect background color from product can image =====
  var _bgCache = {};
  function extractBgColor(imgSrc) {
    return new Promise(function(resolve) {
      if (_bgCache[imgSrc]) return resolve(_bgCache[imgSrc]);
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        try {
          var canvas = document.createElement('canvas');
          var w = 120, h = 160;
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          var data = ctx.getImageData(0, 0, w, h).data;

          // HYBRID: Sample edges (2x weight) + center (1x weight)
          // Edges show real background; center confirms it.
          // Larger buckets (round to 20) to group similar shades better.
          var buckets = {};
          var labelTop = Math.floor(h * 0.25);
          var labelBot = Math.floor(h * 0.75);
          var labelLeft = Math.floor(w * 0.1);
          var labelRight = Math.floor(w * 0.9);
          var edgeW = Math.floor(w * 0.15);
          var edgeH = Math.floor(h * 0.08);

          function samplePixel(x, y, weight) {
            var i = (y * w + x) * 4;
            var r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
            if (a < 200) return;
            var rr = Math.round(r / 20) * 20;
            var gg = Math.round(g / 20) * 20;
            var bb = Math.round(b / 20) * 20;
            var key = rr + ',' + gg + ',' + bb;
            if (!buckets[key]) buckets[key] = { count: 0, r: 0, g: 0, b: 0, samples: 0 };
            buckets[key].count += weight;
            buckets[key].samples++;
            buckets[key].r += r;
            buckets[key].g += g;
            buckets[key].b += b;
          }

          // Edge regions (weight=2): sides + top/bottom strips
          for (var y = labelTop; y < labelBot; y++) {
            for (var x = labelLeft; x < labelLeft + edgeW; x++) samplePixel(x, y, 2);
            for (var x = labelRight - edgeW; x < labelRight; x++) samplePixel(x, y, 2);
          }
          for (var y = labelTop; y < labelTop + edgeH; y++) {
            for (var x = labelLeft + edgeW; x < labelRight - edgeW; x++) samplePixel(x, y, 2);
          }
          for (var y = labelBot - edgeH; y < labelBot; y++) {
            for (var x = labelLeft + edgeW; x < labelRight - edgeW; x++) samplePixel(x, y, 2);
          }
          // Center region (weight=1)
          for (var y = Math.floor(h * 0.35); y < Math.floor(h * 0.65); y++) {
            for (var x = Math.floor(w * 0.25); x < Math.floor(w * 0.75); x++) samplePixel(x, y, 1);
          }

          // Find the most common weighted color (= label background)
          var best = null, bestCount = 0;
          var keys = Object.keys(buckets);
          for (var k = 0; k < keys.length; k++) {
            if (buckets[keys[k]].count > bestCount) {
              bestCount = buckets[keys[k]].count;
              best = buckets[keys[k]];
            }
          }
          // Use sample count for averaging (not weighted count)
          if (best) best.count = best.samples;

          if (best) {
            var fr = Math.round(best.r / best.count);
            var fg = Math.round(best.g / best.count);
            var fb = Math.round(best.b / best.count);
            var hex = '#' + [fr, fg, fb].map(function(c) { return c.toString(16).padStart(2, '0'); }).join('');
            _bgCache[imgSrc] = hex;
            resolve(hex);
          } else {
            resolve(null);
          }
        } catch(e) { resolve(null); }
      };
      img.onerror = function() { resolve(null); };
      img.src = imgSrc;
    });
  }

  // ===== Color contrast utilities =====
  // Parse hex color to RGB array
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16)
    ];
  }

  // Relative luminance (W3C formula)
  function getLuminance(rgb) {
    var a = rgb.map(function(v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }

  // WCAG contrast ratio between two hex colors (1:1 to 21:1)
  function getContrastRatio(hex1, hex2) {
    var l1 = getLuminance(hexToRgb(hex1));
    var l2 = getLuminance(hexToRgb(hex2));
    var lighter = Math.max(l1, l2);
    var darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // Get hue from hex (0-360)
  function getHueFromHex(hex) {
    var rgb = hexToRgb(hex);
    var r = rgb[0]/255, g = rgb[1]/255, b = rgb[2]/255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max === min) return 0;
    var d = max - min, h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return h * 360;
  }

  // Check if two colors are too similar (considers both contrast AND hue difference)
  function colorsAreTooSimilar(hex1, hex2) {
    if (!hex1 || !hex2) return false;
    var contrast = getContrastRatio(hex1, hex2);
    // High contrast = always ok
    if (contrast >= 3) return false;
    // Check hue difference — colors with very different hues look distinct
    // even with similar luminance (e.g. yellow on teal, red on green)
    var hue1 = getHueFromHex(hex1);
    var hue2 = getHueFromHex(hex2);
    var hueDiff = Math.abs(hue1 - hue2);
    if (hueDiff > 180) hueDiff = 360 - hueDiff; // circular distance
    // If hues are very different (>60°) AND contrast is at least 1.5, it's ok
    if (hueDiff > 60 && contrast >= 1.5) return false;
    // Otherwise, need at least 2.0 contrast
    return contrast < 2.0;
  }

  // Extract the best vibrant color that CONTRASTS with the background
  function extractContrastingVibrantColor(imgSrc, bgHex) {
    return new Promise(function(resolve) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        try {
          var canvas = document.createElement('canvas');
          var size = 80;
          canvas.width = size;
          canvas.height = size;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, size, size);
          var data = ctx.getImageData(0, 0, size, size).data;

          var colorBuckets = {};
          for (var i = 0; i < data.length; i += 16) {
            var r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
            if (a < 200) continue;
            var rn = r/255, gn = g/255, bn = b/255;
            var max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
            var h, s, l = (max + min) / 2;
            if (max === min) { h = s = 0; }
            else {
              var d = max - min;
              s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
              if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
              else if (max === gn) h = ((bn - rn) / d + 2) / 6;
              else h = ((rn - gn) / d + 4) / 6;
            }
            if (s < 0.25 || l < 0.15 || l > 0.85) continue;
            var bucket = Math.floor(h * 36);
            if (!colorBuckets[bucket]) colorBuckets[bucket] = { count: 0, totalS: 0, totalL: 0, totalH: 0 };
            colorBuckets[bucket].count++;
            colorBuckets[bucket].totalS += s;
            colorBuckets[bucket].totalL += l;
            colorBuckets[bucket].totalH += h;
          }

          // Score all buckets, but filter out colors too similar to bg
          var candidates = [];
          Object.keys(colorBuckets).forEach(function(key) {
            var b = colorBuckets[key];
            if (b.count < 3) return;
            var avgS = b.totalS / b.count;
            var avgL = b.totalL / b.count;
            var hue = parseFloat(key) / 36;

            var lBonus = 1 - Math.abs(avgL - 0.45) * 2;
            lBonus = Math.max(lBonus, 0.2);
            var hueBonus = 1;
            if (hue < 0.05 || hue > 0.95) hueBonus = 1.6;
            else if (hue > 0.55 && hue < 0.75) hueBonus = 1.4;
            else if (hue > 0.8 && hue < 0.95) hueBonus = 1.5;
            else if (hue > 0.1 && hue < 0.2) hueBonus = 0.5;
            else if (hue > 0.2 && hue < 0.45) hueBonus = 1.1;
            else if (hue > 0.45 && hue < 0.55) hueBonus = 1.3;

            var score = avgS * Math.sqrt(b.count) * lBonus * hueBonus;
            var finalS = Math.min(avgS * 1.3, 1);
            var finalL = Math.max(Math.min(avgL, 0.5), 0.35);
            var candidateHex = hslToHex(hue, finalS, finalL);

            candidates.push({ hex: candidateHex, score: score });
          });

          // Sort by score descending
          candidates.sort(function(a, b) { return b.score - a.score; });

          // Pick the best color that contrasts with the background
          for (var c = 0; c < candidates.length; c++) {
            if (!colorsAreTooSimilar(candidates[c].hex, bgHex)) {
              resolve(candidates[c].hex);
              return;
            }
          }

          // Fallback: if all colors are too similar, use white or black depending on bg
          var bgLum = getLuminance(hexToRgb(bgHex));
          resolve(bgLum > 0.5 ? '#1a1a1a' : '#ffffff');
        } catch(e) { resolve(null); }
      };
      img.onerror = function() { resolve(null); };
      img.src = imgSrc;
    });
  }

  // Convert CSS rgb() string to hex
  function rgbToHex(rgbStr) {
    if (!rgbStr) return null;
    if (rgbStr.charAt(0) === '#') return rgbStr;
    var match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return null;
    return '#' + [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])].map(function(c) {
      return c.toString(16).padStart(2, '0');
    }).join('');
  }

  function getProductPriceUYU(product) {
    if (priceOverrides[product.id]) return priceOverrides[product.id];
    return product.price || 0;
  }

  // formatPrice y formatPriceUYU son la misma función — usar solo formatPriceUYU
  function formatPriceUYU(priceUYU) {
    return '$U ' + priceUYU.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  var formatPrice = formatPriceUYU; // Alias para compatibilidad

  // ===== Age Gate (desactivado) =====
  window.dismissAgeGate = function () {
    const gate = document.getElementById('ageGate');
    if (gate) gate.classList.add('hidden');
  };

  function checkAgeGate() {
    // Verificación de edad desactivada — se oculta siempre
    const gate = document.getElementById('ageGate');
    if (gate) gate.classList.add('hidden');
  }

  // ===== Product Card Component =====
  function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    var cardHref = product.customPack ? 'pack.html' : (product.container === 'merch' ? 'merch.html?slug=' + product.slug : 'product.html?slug=' + product.slug);
    card.setAttribute('data-href', cardHref);
    card.setAttribute('data-category', product.category);
    card.setAttribute('data-tags', product.tags.join(','));
    card.style.cursor = 'pointer';

    const isLimited = product.tags.includes('limited');
    const outOfStock = !isProductAvailable(product.id);
    const lowStock = getProductStockCount(product.id) > 0 && getProductStockCount(product.id) < 10;

    var eName = escapeHtml(product.name);
    var eSub = escapeHtml(product.subtitle);
    card.innerHTML = `
      ${isLimited ? '<div class="product-card__badge">Limited<br>Edition</div>' : ''}
      ${outOfStock ? '<div class="product-card__badge" style="background:#dc2626;color:#fff;">Sin<br>Stock</div>' : ''}
      ${lowStock && !outOfStock ? '<div class="product-card__badge" style="background:#f59e0b;color:#000;font-size:9px;">Últimas<br>unidades</div>' : ''}
      <div class="product-card__image-wrapper">
        <img class="product-card__image" src="${escapeHtml(product.cardImage || product.image)}" alt="${eName}" loading="lazy"${outOfStock ? ' style="opacity:0.5;"' : ''}>
      </div>
      <div class="product-card__info">
        <div>
          <div class="product-card__name" style="color: ${product.titleColor || product.accentColor}">${eName}</div>
          <div class="product-card__subtitle">${eSub}</div>
        </div>
        <div class="product-card__bottom">
          <div class="product-card__price">
            <span class="product-card__price-label">DESDE</span>
            ${formatPriceUYU(getProductPriceUYU(product))}
            ${product.itauPrice ? '<span class="product-card__itau-price">ITAÚ ' + formatPriceUYU(product.itauPrice) + '</span>' : ''}
          </div>
          ${outOfStock
            ? '<button class="product-card__buy-btn" disabled style="opacity:0.4;cursor:not-allowed;">Sin Stock</button>'
            : '<button class="product-card__buy-btn" data-product-id="' + product.id + '">Comprar</button>'
          }
        </div>
      </div>
    `;

    // Click en la card → navega al producto (excepto si clickearon el botón o el qty picker)
    card.addEventListener('click', function(e) {
      if (e.target.closest('.product-card__buy-btn') || e.target.closest('.card-qty-picker')) return;
      window.location.href = cardHref;
    });

    // Click en el botón comprar → muestra selector de cantidad
    var buyBtn = card.querySelector('.product-card__buy-btn:not([disabled])');
    if (buyBtn) {
      buyBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        // Si ya hay un qty picker abierto, no hacer nada
        if (card.querySelector('.card-qty-picker')) return;

        var maxStock = getProductStockCount(product.id);
        var currentInCart = (cart.find(function(i){ return i.product.id === product.id; }) || {}).quantity || 0;
        var maxAvailable = Math.max(1, maxStock - currentInCart);

        // Crear el qty picker
        var picker = document.createElement('div');
        picker.className = 'card-qty-picker';
        picker.innerHTML =
          '<button class="card-qty-picker__btn card-qty-picker__minus" type="button">−</button>' +
          '<span class="card-qty-picker__num">1</span>' +
          '<button class="card-qty-picker__btn card-qty-picker__plus" type="button">+</button>' +
          '<button class="card-qty-picker__confirm" type="button">✓</button>';

        // Reemplazar el botón comprar con el picker
        buyBtn.style.display = 'none';
        buyBtn.parentElement.appendChild(picker);

        var qty = 1;
        var numEl = picker.querySelector('.card-qty-picker__num');
        var minusBtn = picker.querySelector('.card-qty-picker__minus');
        var plusBtn = picker.querySelector('.card-qty-picker__plus');
        var confirmBtn = picker.querySelector('.card-qty-picker__confirm');

        function updateQty() {
          numEl.textContent = qty;
          minusBtn.style.opacity = qty <= 1 ? '0.3' : '1';
          plusBtn.style.opacity = qty >= maxAvailable ? '0.3' : '1';
        }

        minusBtn.addEventListener('click', function(ev) {
          ev.stopPropagation();
          if (qty > 1) { qty--; updateQty(); }
        });

        plusBtn.addEventListener('click', function(ev) {
          ev.stopPropagation();
          if (qty < maxAvailable) {
            qty++; updateQty();
          } else {
            showToast('Stock insuficiente. Stock disponible: ' + maxAvailable + (maxAvailable === 1 ? ' unidad' : ' unidades'), 'warning');
          }
        });

        confirmBtn.addEventListener('click', function(ev) {
          ev.stopPropagation();
          addToCartQuick(product.id, qty);
          // Restaurar el botón comprar
          picker.remove();
          buyBtn.style.display = '';
        });

        // Auto-cerrar si hacen click afuera después de 8s
        setTimeout(function() {
          if (picker.parentElement) {
            picker.remove();
            buyBtn.style.display = '';
          }
        }, 8000);

        updateQty();
      });
    }

    return card;
  }

  // ===== Advanced Cart System =====
  window.addToCartQuick = function (productId, qty) {
    qty = qty || 1;
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    // Check stock
    var totalStock = getProductStockCount(productId);
    if (!isProductAvailable(productId) || totalStock <= 0) {
      showToast('Este producto no tiene stock disponible.', 'error');
      return;
    }
    const currentInCart = (cart.find(i => i.product.id === productId) || {}).quantity || 0;
    var availableStock = totalStock - currentInCart;
    if (qty > availableStock) {
      showToast('Stock insuficiente. Stock disponible: ' + availableStock + (availableStock === 1 ? ' unidad' : ' unidades'), 'warning');
      return;
    }

    const existing = cart.find(item => item.product.id === productId);
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({ product: product, quantity: qty });
    }

    updateCartCount();
    renderCart();
    saveCartToStorage();

    // Notificación rica de carrito
    if (typeof showCartToast === 'function') showCartToast(product, qty);
  };

  window.updateCartItemQty = function(productId, delta) {
    const item = cart.find(i => i.product.id === productId);
    if (item) {
      // Validar stock al incrementar
      if (delta > 0) {
        var stockTotal = getProductStockCount(productId);
        if (item.quantity + delta > stockTotal) {
          showToast('Stock insuficiente. Stock disponible: ' + stockTotal + (stockTotal === 1 ? ' unidad' : ' unidades'), 'warning');
          return;
        }
      }
      item.quantity += delta;
      if (item.quantity <= 0) {
        cart = cart.filter(i => i.product.id !== productId);
      }
      updateCartCount();
      renderCart();
      saveCartToStorage();
    }
  };

  window.removeCartItem = function(productId) {
    cart = cart.filter(i => i.product.id !== productId || i.selectedBeers);
    updateCartCount();
    renderCart();
    saveCartToStorage();
  };

  // Index-based cart operations for custom packs (multiple entries with same product.id)
  window.updateCartByIndex = function(index, delta) {
    if (cart[index]) {
      cart[index].quantity += delta;
      if (cart[index].quantity <= 0) cart.splice(index, 1);
      updateCartCount();
      renderCart();
      saveCartToStorage();
    }
  };

  window.removeCartByIndex = function(index) {
    if (cart[index]) {
      cart.splice(index, 1);
      updateCartCount();
      renderCart();
      saveCartToStorage();
    }
  };

  function updateCartCount() {
    cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    const badge = document.getElementById('cartBadge');
    if (badge) {
      badge.textContent = cartCount;
      badge.style.display = cartCount > 0 ? 'flex' : 'none';
    }
  }

  function toggleCart(forceOpen = undefined) {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (!drawer || !overlay) return;

    const isOpen = drawer.classList.contains('active');
    const shouldOpen = forceOpen !== undefined ? forceOpen : !isOpen;

    if (shouldOpen) {
      drawer.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden'; // prevent scrolling
    } else {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function renderCart() {
    const container = document.getElementById('cartItemsContainer');
    const subtotalEl = document.getElementById('cartSubtotal');
    const progressEl = document.getElementById('shippingProgress');
    const shippingText = document.getElementById('shippingText');
    
    if (!container || !subtotalEl) return;

    if (cart.length === 0) {
      container.innerHTML = '<div class="cart-empty-message">TU CARRITO ESTÁ VACÍO. MERECE UNAS CERVEZAS!</div>';
      subtotalEl.textContent = '$U 0';
      progressEl.style.width = '0%';
      var freeThreshold = (typeof MF_CONFIG !== 'undefined') ? MF_CONFIG.cart.freeShippingThreshold : 2000;
      shippingText.textContent = 'ENVÍO GRATIS EN COMPRAS MAYORES A $U ' + freeThreshold.toLocaleString('es-UY');
      return;
    }

    let subtotalUYU = 0;
    container.innerHTML = '';

    cart.forEach((item, cartIndex) => {
      const itemPrice = getProductPriceUYU(item.product);
      subtotalUYU += itemPrice * item.quantity;
      const uyuPrice = itemPrice * item.quantity;

      // Show selected beers for custom packs (escapar nombres para prevenir XSS)
      var beersInfo = '';
      if (item.selectedBeers && item.selectedBeers.length > 0) {
        beersInfo = '<div class="cart-item__beers">' +
          item.selectedBeers.map(function(b) { return '<span class="cart-item__beer-tag">' + escapeHtml(b.name) + '</span>'; }).join('') +
          '</div>';
      }

      // For custom packs, use cartIndex-based functions
      var isCustomPack = !!item.selectedBeers;
      var qtyMinusAction = isCustomPack ? 'updateCartByIndex(' + cartIndex + ', -1)' : 'updateCartItemQty(' + item.product.id + ', -1)';
      var qtyPlusAction = isCustomPack ? 'updateCartByIndex(' + cartIndex + ', 1)' : 'updateCartItemQty(' + item.product.id + ', 1)';
      var removeAction = isCustomPack ? 'removeCartByIndex(' + cartIndex + ')' : 'removeCartItem(' + item.product.id + ')';

      container.innerHTML += `
        <div class="cart-item">
          <img src="${escapeHtml(item.product.cardImage || item.product.image)}" alt="${escapeHtml(item.product.name)}" class="cart-item__image">
          <div class="cart-item__info">
            <div class="cart-item__size">${escapeHtml(item.product.size || '')}</div>
            <div class="cart-item__name">${escapeHtml(item.product.name)}</div>
            ${beersInfo}
          </div>
          <div class="quantity-selector">
            <button class="quantity-btn" onclick="${qtyMinusAction}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <span class="quantity-value">${item.quantity}</span>
            <button class="quantity-btn" onclick="${qtyPlusAction}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
          <div class="cart-item__price">$U ${uyuPrice.toLocaleString('es-UY')}</div>
          <button class="cart-item__remove" onclick="${removeAction}" title="Eliminar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `;
    });

    // Descuento por volumen: usa valores centralizados de MF_CONFIG
    var bulkThreshold = (typeof MF_CONFIG !== 'undefined') ? MF_CONFIG.cart.bulkDiscountThreshold : 16;
    var bulkPercent = (typeof MF_CONFIG !== 'undefined') ? MF_CONFIG.cart.bulkDiscountPercent : 0.15;
    var totalCans = cart.reduce(function(sum, item) {
      return sum + (item.product.container === 'can' ? item.quantity : 0);
    }, 0);
    var volumeDiscountEl = document.getElementById('volumeDiscount');
    if (totalCans >= bulkThreshold) {
      var discount = Math.round(subtotalUYU * bulkPercent);
      subtotalUYU = subtotalUYU - discount;
      if (!volumeDiscountEl) {
        var discDiv = document.createElement('div');
        discDiv.id = 'volumeDiscount';
        discDiv.className = 'cart-drawer__volume-discount';
        subtotalEl.parentNode.insertBefore(discDiv, subtotalEl.parentNode.firstChild);
        volumeDiscountEl = discDiv;
      }
      volumeDiscountEl.innerHTML = '🎉 ' + Math.round(bulkPercent * 100) + '% OFF<br>por +' + bulkThreshold + ' latas <span>−$U\u00A0' + discount.toLocaleString('es-UY') + '</span>';
      volumeDiscountEl.style.display = 'flex';
    } else if (volumeDiscountEl) {
      volumeDiscountEl.style.display = 'none';
    }

    subtotalEl.textContent = '$U ' + subtotalUYU.toLocaleString('es-UY');

    // Progreso de envío gratis — usa umbral de MF_CONFIG
    const FREE_SHIPPING_THRESHOLD = (typeof MF_CONFIG !== 'undefined') ? MF_CONFIG.cart.freeShippingThreshold : 2000;
    const progressPercent = Math.min((subtotalUYU / FREE_SHIPPING_THRESHOLD) * 100, 100);
    progressEl.style.width = progressPercent + '%';

    if (subtotalUYU >= FREE_SHIPPING_THRESHOLD) {
      shippingText.innerHTML = '¡FELICITACIONES! <strong>TIENES ENVÍO GRATIS</strong>';
      progressEl.style.background = '#00c853'; // Green when complete
    } else {
      const remaining = FREE_SHIPPING_THRESHOLD - subtotalUYU;
      shippingText.innerHTML = `TE FALTAN <strong>$U ${remaining.toLocaleString('es-UY')}</strong> PARA ENVÍO GRATIS`;
      progressEl.style.background = 'var(--color-black)';
    }
  }

  function ensureCartDrawerMarkup() {
    if (document.getElementById('cartDrawer')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
  <div class="cart-overlay" id="cartOverlay"></div>
  <div class="cart-drawer" id="cartDrawer">
    <div class="cart-drawer__header">
      <h2 class="cart-drawer__title">TU CARRITO</h2>
      <button class="cart-drawer__close" id="cartCloseBtn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <div class="cart-drawer__shipping">
      <div class="cart-drawer__shipping-text" id="shippingText">ENVÍO GRATIS A PARTIR DE $U 2.000</div>
      <div class="cart-drawer__shipping-bar"><div class="cart-drawer__shipping-progress" id="shippingProgress"></div></div>
    </div>
    <div class="cart-drawer__scroll">
      <div class="cart-drawer__items" id="cartItemsContainer"></div>
      <div class="cart-drawer__personal-message">
        <label for="cartMessage">AGREGÁ UN MENSAJE PERSONAL</label>
        <textarea id="cartMessage" placeholder="ESCRIBÍ TU MENSAJE ACÁ..." maxlength="120"></textarea>
        <p class="cart-message-help">POR EJEMPLO, SI ES UN REGALO. MÁXIMO 120 CARACTERES.</p>
      </div>
    </div>
    <div class="cart-drawer__footer">
      <div class="cart-drawer__subtotal"><span>TOTAL</span><span id="cartSubtotal">$U 0</span></div>
      <div class="cart-drawer__terms">
        <label class="cart-drawer__checkbox-label">
          <input type="checkbox" id="cartTermsCheck">
          <span class="checkbox-custom"></span>
          <span class="terms-text">ACEPTO LOS <a href="#">TÉRMINOS Y CONDICIONES</a> Y DECLARO SER MAYOR DE 18 AÑOS.</span>
        </label>
      </div>
      <div class="cart-drawer__actions">
        <button class="cart-drawer__shop-btn" id="continueShoppingBtn">SEGUIR COMPRANDO</button>
        <button class="cart-drawer__checkout-btn" id="checkoutBtn" disabled>FINALIZAR COMPRA</button>
      </div>
    </div>
  </div>`;
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
  }

  function initCartUI() {
    ensureCartDrawerMarkup();
    const cartBtn = document.getElementById('cartBtn');
    const closeBtn = document.getElementById('cartCloseBtn');
    const overlay = document.getElementById('cartOverlay');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const continueShoppingBtn = document.getElementById('continueShoppingBtn');
    const termsCheck = document.getElementById('cartTermsCheck');

    if (cartBtn) cartBtn.addEventListener('click', () => toggleCart(true));
    if (closeBtn) closeBtn.addEventListener('click', () => toggleCart(false));
    if (overlay) overlay.addEventListener('click', () => toggleCart(false));
    if (continueShoppingBtn) continueShoppingBtn.addEventListener('click', () => toggleCart(false));
    
    if (termsCheck && checkoutBtn) {
      termsCheck.addEventListener('change', (e) => {
        checkoutBtn.disabled = !e.target.checked;
      });
    }
    
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
          showToast('Tu carrito está vacío.', 'warning');
          return;
        }

        // Serialize the cart for checkout.html
        const checkoutCart = cart.map(item => ({
          id: item.product.id,
          name: item.product.name,
          subtitle: item.product.subtitle || '',
          image: item.product.image,
          priceUYU: getProductPriceUYU(item.product),
          quantity: item.quantity
        }));

        sessionStorage.setItem('checkoutCart', JSON.stringify(checkoutCart));
        window.location.href = 'checkout.html';
      });
    }
    
    renderCart(); // Initial empty state
  }

  // ===== Filter & Sort Logic =====
  function filterAndSortProducts() {
    // Filter by category or view
    const activeNav = document.querySelector('.shop-subnav__link.active');
    const view = activeNav ? activeNav.getAttribute('data-view') : 'cans';

    let filtered;

    if (view === 'archive') {
      // Sin Stock view: show ONLY inactive products or products with 0 stock
      filtered = PRODUCTS.filter(p => !isProductActive(p.id) || getProductStockCount(p.id) === 0);
    } else {
      // All other views: filter out inactive products
      filtered = PRODUCTS.filter(p => isProductActive(p.id));
    }

    if (view === 'valuepacks') {
      filtered = filtered.filter(p => p.category === 'valuepack' || p.tags.includes('valuepack'));
    } else if (view === 'specials') {
      filtered = filtered.filter(p => p.category === 'special' || p.tags.includes('special') || p.tags.includes('limited'));
    } else if (view === 'merch') {
      filtered = filtered.filter(p => p.category === 'merch' || p.tags.includes('merch'));
    } else {
      // Normal filtering (Cans or Home) — SOLO cervezas (latas/botellas)
      // Excluye merch, valuepacks y especiales para que no aparezcan en "Cervezas".
      filtered = filtered.filter(p =>
        p.category !== 'merch' &&
        p.category !== 'valuepack' &&
        p.category !== 'special' &&
        !p.tags.includes('merch') &&
        !p.tags.includes('valuepack')
      );
      if (currentContainer !== 'all') {
        filtered = filtered.filter(p => p.container === currentContainer);
      }
      if (currentStyle !== 'all') {
        // Acepta match por category, style (sub-estilo) o tag.
        // Esto permite que NEIPA (style="neipa", category="ipa") aparezca al filtrar NEIPA.
        filtered = filtered.filter(p =>
          p.category === currentStyle ||
          p.style === currentStyle ||
          (p.tags && p.tags.includes(currentStyle))
        );
      }
    }


    // Sort
    switch (currentSort) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        // Keep original order
        break;
    }

    return filtered;
  }

  // ===== Carousel Auto-Scroll Logic (infinite loop) =====
  let carouselInterval = null;

  function initInfiniteCarousel() {
    const container = document.querySelector('.home-promos__inner');
    if (!container) return;
    // Avoid double-init
    if (container.dataset.infiniteReady) return;
    container.dataset.infiniteReady = '1';

    const originalCards = Array.from(container.querySelectorAll('.promo-card'));
    if (originalCards.length < 2) return;

    // Clone all cards and append at end + prepend at start
    originalCards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      container.appendChild(clone);
    });
    originalCards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      container.insertBefore(clone, container.firstChild);
    });

    // Start scrolled to the first real card (after the prepended clones)
    const cardWidth = originalCards[0].clientWidth + parseInt(getComputedStyle(container).gap || 0);
    const startPos = cardWidth * originalCards.length;
    container.scrollLeft = startPos;

    // When scroll reaches clone zone → jump silently to real cards
    container.addEventListener('scroll', function() {
      const totalReal = originalCards.length;
      const cw = originalCards[0].clientWidth + parseInt(getComputedStyle(container).gap || 0);
      const maxReal = cw * totalReal * 2; // end of real cards zone
      const minReal = cw * totalReal;     // start of real cards zone

      if (container.scrollLeft >= maxReal) {
        container.scrollLeft -= cw * totalReal;
      } else if (container.scrollLeft <= 0) {
        container.scrollLeft += cw * totalReal;
      }
    }, { passive: true });
  }

  function startCarouselAutoScroll() {
    if (carouselInterval) return;
    const container = document.querySelector('.home-promos__inner');
    if (!container) return;

    initInfiniteCarousel();

    const isMobile = window.innerWidth <= 640;
    const interval = isMobile ? 3000 : 4000;

    carouselInterval = setInterval(() => {
      const firstCard = container.querySelector('.promo-card');
      if (!firstCard) return;
      const cardWidthAndGap = firstCard.clientWidth + parseInt(getComputedStyle(container).gap || 0);
      container.scrollBy({ left: cardWidthAndGap, behavior: 'smooth' });
    }, interval);
  }

  function stopCarouselAutoScroll() {
    if (carouselInterval) {
      clearInterval(carouselInterval);
      carouselInterval = null;
    }
  }

  function renderProductGrid() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    // Check if we are on Shop Home view
    const homeLink = document.querySelector('.shop-subnav__link[data-view="home"]');
    const isHome = homeLink && homeLink.classList.contains('active');
    
    // Manage carousel auto-scroll interval based on view
    if (isHome) {
      startCarouselAutoScroll();
    } else {
      stopCarouselAutoScroll();
    }

    let products = filterAndSortProducts();
    
    if (isHome) {
      // Only show top 4 featured products for the home view
      products = products.slice(0, 4);
    }

    grid.innerHTML = '';

    if (products.length === 0) {
      grid.innerHTML = '<div class="no-results">No se encontraron productos en esta categoría</div>';
      return;
    }

    products.forEach((product, i) => {
      const card = createProductCard(product);
      card.style.animationDelay = `${Math.min(i * 0.04, 0.5)}s`;
      grid.appendChild(card);
    });

    // ─── Scroll-triggered entry animation para view "home" ───
    // Cada sección anima cuando entra al viewport con IntersectionObserver.
    if (document.body.classList.contains('view-home-anim')) {
      initHomeEntranceAnimations();
    }

    // ─── Scroll-triggered entry animation para view "cervezas" ───
    // Cada card anima cuando entra al viewport (no todas a la vez al cargar).
    if (document.body.classList.contains('view-cans-anim')) {
      var cards = grid.querySelectorAll('.product-card');
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              // Pequeño stagger basado en el orden de aparición en pantalla
              var idx = Array.prototype.indexOf.call(cards, entry.target);
              entry.target.style.animationDelay = (Math.min((idx % 4) * 0.08, 0.32)) + 's';
              entry.target.classList.add('card-in-view');
              io.unobserve(entry.target);
            }
          });
        }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
        cards.forEach(function (c) { io.observe(c); });
      } else {
        // Fallback sin IO: animar todas
        cards.forEach(function (c) { c.classList.add('card-in-view'); });
      }
    }
  }

  // ===== Initialize Sidebar Filters =====
  function initSidebarFilters() {
    const containerFilters = document.getElementById('containerFilters');
    const styleFilters = document.getElementById('categoryFilters');

    if (containerFilters && typeof CONTAINER_TYPES !== 'undefined') {
      CONTAINER_TYPES.forEach(type => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn' + (type.id === 'all' ? ' active' : '');
        btn.textContent = type.label;
        btn.setAttribute('data-container', type.id);
        btn.addEventListener('click', () => {
          currentContainer = type.id;
          containerFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderProductGrid();
        });
        containerFilters.appendChild(btn);
      });
    }

    if (styleFilters && typeof BEER_STYLES !== 'undefined') {
      BEER_STYLES.forEach(style => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn' + (style.id === 'all' ? ' active' : '');
        btn.textContent = style.label;
        btn.setAttribute('data-category', style.id);
        btn.addEventListener('click', () => {
          currentStyle = style.id;
          styleFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderProductGrid();
        });
        styleFilters.appendChild(btn);
      });
    }
  }

  // ===== Initialize Sort Dropdown =====
  function initSortDropdown() {
    const select = document.getElementById('sortSelect');
    if (!select) return;

    SORT_OPTIONS.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.id;
      option.textContent = opt.label;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderProductGrid();
    });
  }


  // ===== Product Detail Page — 3-Zone Integrated Layout =====
  function initProductPage() {
    const productPage = document.getElementById('productPage');
    if (!productPage) return;

    const slug = getUrlParam('slug');
    if (!slug) {
      window.location.href = 'index.html';
      return;
    }

    const product = getProductBySlug(slug);
    if (!product) {
      window.location.href = 'index.html';
      return;
    }
    currentProductRef = product; // Guarda referencia para actualizar precio con cantidad

    // Set page title
    document.title = product.name + ' | Mala Fama Brewing';

    // --- Background color (auto-detect from can if not set) ---
    var pdpBg = document.getElementById('pdpBg');
    var pdpPageEl = document.querySelector('.product-page');

    function applyBgColor(bgHex) {
      if (pdpBg) pdpBg.style.background = bgHex;
      // Detecta si el fondo es claro y cambia el texto a oscuro
      if (pdpPageEl && bgHex) {
        var bgLum = getLuminance(hexToRgb(bgHex));
        if (bgLum > 0.75) {
          pdpPageEl.classList.add('pdp-dark-text');
        } else {
          pdpPageEl.classList.remove('pdp-dark-text');
        }
      }
      // Store for title contrast check
      window._currentBgColor = bgHex;
    }

    if (product.bgColor) {
      // Use manual bgColor first
      applyBgColor(product.bgColor);
      // Also auto-detect to compare — if manual is a placeholder, use detected
      extractBgColor(product.image).then(function(detected) {
        if (detected) window._detectedBgColor = detected;
      });
    } else {
      // No bgColor set — auto-detect from can image
      applyBgColor('#eeeeee'); // temporary neutral
      extractBgColor(product.image).then(function(detected) {
        if (detected) {
          applyBgColor(detected);
          window._detectedBgColor = detected;
          // Re-check title contrast with new bg
          var titleEl = document.getElementById('productTitle');
          if (titleEl && titleEl.style.color) {
            var titleHex = rgbToHex(titleEl.style.color);
            if (titleHex && colorsAreTooSimilar(titleHex, detected)) {
              extractContrastingVibrantColor(product.image, detected).then(function(newColor) {
                if (newColor) titleEl.style.color = newColor;
              });
            }
          }
        }
      });
    }

    // --- LEFT COLUMN: Scrolling content ---

    // Hero illustration (top of left column)
    var heroIllustration = document.getElementById('heroIllustration');
    var pdpLayout = document.getElementById('pdpLayout');
    if (heroIllustration && product.illustration) {
      heroIllustration.src = product.illustration;
      heroIllustration.alt = product.name + ' illustration';
      if (pdpLayout) pdpLayout.classList.add('pdp-has-illust');
    } else if (heroIllustration) {
      // Sin ilustración: ocultar el contenedor para que no quede un hueco vacío
      heroIllustration.closest('.pdp-hero-illust').style.display = 'none';
      if (pdpLayout) pdpLayout.classList.remove('pdp-has-illust');
    }

    // Tagline
    var tagline = document.getElementById('pdpTagline');
    if (tagline) {
      var firstSentence = product.description ? product.description.split('.')[0] + '.' : '';
      tagline.textContent = firstSentence;
    }

    // Specs
    var specAbv = document.getElementById('specAbv');
    if (specAbv) specAbv.textContent = product.abv;

    var specTemp = document.getElementById('specTemp');
    if (specTemp) specTemp.textContent = product.servingTemp;

    var specFlavors = document.getElementById('specFlavors');
    if (specFlavors && product.flavorNotes) {
      specFlavors.textContent = product.flavorNotes.slice(0, 3).join(', ');
    }

    // Story text
    var storyText = document.getElementById('storyText');
    if (storyText) storyText.textContent = product.description;

    // Geeky info
    var geekyGrid = document.getElementById('geekyGrid');
    if (geekyGrid) {
      var geekyItems = [
        product.abv + ' ABV',
        'Lúpulos: variados',
        product.tags.includes('limited') ? 'Edición limitada — cuando se acaba, se acaba' : 'Parte de nuestra línea principal'
      ];
      if (product.flavorNotes) {
        product.flavorNotes.forEach(function(note) {
          geekyItems.push(note);
        });
      }
      geekyGrid.innerHTML = geekyItems.map(function(item) {
        return '<div class="pdp-geeky-item">' +
          '<span class="pdp-geeky-item__value">' + escapeHtml(item) + '</span>' +
          '</div>';
      }).join('');
    }

    // Sello "EDICIÓN LIMITADA" / "RECETA ÚNICA" sobre la lata sticky
    var stampEl = document.getElementById('pdpStamp');
    if (stampEl) {
      var isLimited = product.limitedEdition === true || (product.tags && product.tags.indexOf('limited') !== -1);
      var isUnique = product.uniqueRecipe === true;
      if (isLimited || isUnique) {
        var l1 = stampEl.querySelector('.pdp-stamp__line1');
        var l2 = stampEl.querySelector('.pdp-stamp__line2');
        if (isUnique && !isLimited) {
          if (l1) l1.textContent = 'RECETA';
          if (l2) l2.textContent = 'ÚNICA';
        } else {
          if (l1) l1.textContent = 'EDICIÓN';
          if (l2) l2.textContent = 'LIMITADA';
        }
        stampEl.style.color = product.accentColor || product.titleColor || '#c2410c';
        stampEl.hidden = false;
      } else {
        stampEl.hidden = true;
      }
    }

    // "Para tomarla cuando…" — momentos/maridaje (3 cards con icono hand-drawn SVG)
    var momentsGrid = document.getElementById('pdpMomentsGrid');
    if (momentsGrid) {
      // Default por si el producto no define moments propios
      var defaultMoments = [
        { icon: 'fire',   title: 'Asado del domingo',     sub: 'Con los hermanos y la guitarra' },
        { icon: 'moon',   title: 'Última del día',        sub: 'Cuando la noche ya se rindió' },
        { icon: 'guitar', title: 'Tocada en el fondo',    sub: 'Vinilo girando, tapa fría' }
      ];
      var moments = (product.moments && product.moments.length) ? product.moments : defaultMoments;
      // Íconos SVG inline, trazo grueso, estilo dibujado a mano
      var icons = {
        fire:   '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 28c5 0 8-3.5 8-8 0-3-2-5-3-7-1 2-3 3-4 2 0-3 1-5-1-8-2 3-7 6-7 12 0 5 3 9 7 9z"/></svg>',
        moon:   '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 19c-1 .4-2 .6-3 .6-5 0-9-4-9-9 0-1.5.4-3 1-4.2C8 7.6 5 11.4 5 16c0 6 5 11 11 11 4 0 7.5-2.2 9.3-5.4-.4.2-.8.3-1.3.4z"/></svg>',
        guitar: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="20" r="6"/><circle cx="13" cy="20" r="1.5" fill="currentColor"/><path d="M17 16l8-8M22 6l4 4M20 8l4 4"/></svg>',
        sun:    '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="16" r="5"/><path d="M16 3v3M16 26v3M3 16h3M26 16h3M6.5 6.5l2 2M23.5 23.5l2 2M6.5 25.5l2-2M23.5 8.5l2-2"/></svg>',
        beach:  '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 24c3-2 5-2 8 0s5 2 8 0 5-2 8 0"/><path d="M4 28c3-2 5-2 8 0s5 2 8 0 5-2 8 0"/><circle cx="22" cy="8" r="3"/></svg>'
      };
      momentsGrid.innerHTML = moments.slice(0, 3).map(function(m) {
        var icon = icons[m.icon] || icons.fire;
        return '<div class="pdp-moment">' +
               '<div class="pdp-moment__icon">' + icon + '</div>' +
               '<div class="pdp-moment__text">' +
                 '<div class="pdp-moment__title">' + escapeHtml(m.title) + '</div>' +
                 '<div class="pdp-moment__sub">' + escapeHtml(m.sub || '') + '</div>' +
               '</div>' +
               '</div>';
      }).join('');
    }

    // Bottom illustration — usa illustration2 si existe, sino la misma que el hero
    var bottomIllust = document.getElementById('bottomIllustration');
    var bottomSrc = product.illustration2 || product.illustration;
    if (bottomIllust && bottomSrc) {
      bottomIllust.src = bottomSrc;
      bottomIllust.alt = product.name + ' artwork';
    } else if (bottomIllust) {
      bottomIllust.closest('.pdp-bottom-illust').style.display = 'none';
    }

    // Accordion toggle behavior
    initAccordions();

    // --- RIGHT COLUMN: Sticky panel ---

    // Can image
    var productImage = document.getElementById('productImage');
    if (productImage) {
      productImage.src = product.image;
      productImage.alt = product.name;
    }

    // Breadcrumb
    var breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = product.name;

    // Title & subtitle
    var productTitle = document.getElementById('productTitle');
    if (productTitle) {
      productTitle.textContent = product.name;
      var currentBg = window._currentBgColor || product.bgColor || '#eeeeee';

      if (product.titleColor) {
        // Manual override — but still check contrast with background
        if (colorsAreTooSimilar(product.titleColor, currentBg)) {
          // Title color clashes with bg! Find a contrasting one from the image
          extractContrastingVibrantColor(product.image, currentBg).then(function(color) {
            productTitle.style.color = color || '#ffffff';
          });
        } else {
          productTitle.style.color = product.titleColor;
        }
      } else {
        // Auto-detect from image — always pick one that contrasts with bg
        productTitle.style.color = product.accentColor || '#333';
        extractContrastingVibrantColor(product.image, currentBg).then(function(color) {
          if (color) productTitle.style.color = color;
        });
      }
    }

    var productSubtitle = document.getElementById('productSubtitle');
    if (productSubtitle) productSubtitle.textContent = product.subtitle;

    // Price
    var productPrice = document.getElementById('productPrice');
    if (productPrice) productPrice.textContent = formatPriceUYU(getProductPriceUYU(product));

    // Pack options — standard or custom beer picker
    var packSelectorStandard = document.getElementById('packSelectorStandard');
    var beerPickerEl = document.getElementById('beerPicker');

    if (product.customPack && beerPickerEl) {
      // ===== CUSTOM PACK: "Armá tu Pack" =====
      if (packSelectorStandard) packSelectorStandard.style.display = 'none';
      beerPickerEl.style.display = 'block';
      initBeerPicker(product);
    } else {
      // ===== STANDARD PACK OPTIONS (UNIDAD / 6-PACK / etc) =====
      if (beerPickerEl) beerPickerEl.style.display = 'none';
      var packContainer = document.getElementById('packOptions');
      if (packContainer && product.packOptions) {
        product.packOptions.forEach(function (pack, index) {
          var btn = document.createElement('button');
          btn.className = 'pack-option' + (index === 0 ? ' active' : '');
          btn.textContent = pack.label;
          btn.addEventListener('click', function () {
            selectedPack = index;
            packContainer.querySelectorAll('.pack-option').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            updateProductPrice(product);
          });
          packContainer.appendChild(btn);
        });
      }
    }

    // Quantity controls
    var qtyMinus = document.getElementById('qtyMinus');
    var qtyPlus = document.getElementById('qtyPlus');
    var qtyValue = document.getElementById('qtyValue');

    if (qtyMinus && qtyPlus && qtyValue) {
      qtyMinus.addEventListener('click', function () {
        if (quantity > 1) {
          quantity--;
          qtyValue.textContent = quantity;
          if (currentProductRef) updateProductPrice(currentProductRef); // Actualiza precio al cambiar cantidad
        }
      });
      qtyPlus.addEventListener('click', function () {
        if (quantity < 99) {
          quantity++;
          qtyValue.textContent = quantity;
          if (currentProductRef) updateProductPrice(currentProductRef); // Actualiza precio al cambiar cantidad
        }
      });
    }

    // Show stock status on product page
    var stockStatusEl = document.getElementById('stockStatus');
    if (product) {
      var stk = getProductStockCount(product.id);
      var available = isProductAvailable(product.id);
      if (!available) {
        if (stockStatusEl) stockStatusEl.textContent = 'PRODUCTO SIN STOCK';
        if (stockStatusEl) stockStatusEl.style.cssText = 'color:#dc2626;font-weight:700;font-size:14px;';
        var addBtn = document.getElementById('addToCartBtn');
        if (addBtn) { addBtn.disabled = true; addBtn.style.opacity = '0.4'; addBtn.style.cursor = 'not-allowed'; addBtn.textContent = 'Sin Stock'; }
      } else if (stk < 10) {
        if (stockStatusEl) stockStatusEl.textContent = '¡Últimas ' + stk + ' unidades!';
        if (stockStatusEl) stockStatusEl.style.cssText = 'color:#f59e0b;font-weight:700;font-size:13px;';
      }
    }

    // Add to cart button
    var addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', function () {
        var productToAdd = currentProductRef;
        if (!productToAdd) return;

        // Custom pack: must have 3 beers selected
        if (productToAdd.customPack) {
          if (_selectedBeers.length < 3) {
            showToast('Tenés que elegir 3 cervezas para armar tu pack.', 'warning');
            return;
          }
          // Add pack with selected beers info
          var beerNames = _selectedBeers.map(function(b) { return b.name; });
          var beerIds = _selectedBeers.map(function(b) { return b.id; });
          var packItem = {
            product: productToAdd,
            quantity: quantity,
            selectedBeers: _selectedBeers.map(function(b) { return { id: b.id, name: b.name, image: b.image }; })
          };
          // Each custom pack is unique based on beer selection, so always add new entry
          cart.push(packItem);
          updateCartCount();
          renderCart();
          saveCartToStorage();

          // Notificación rica de carrito (pack personalizado)
          if (typeof showCartToast === 'function') showCartToast(productToAdd, quantity, 'PACK PERSONALIZADO');
        } else {
          // Standard product
          var pdpStockTotal = getProductStockCount(productToAdd.id);
          if (!isProductAvailable(productToAdd.id) || pdpStockTotal <= 0) {
            showToast('Este producto no tiene stock disponible.', 'error');
            return;
          }
          // Multiplicador del pack seleccionado (UNIDAD=1, 6-PACK=6, etc.)
          var packMultiplier = (productToAdd.packOptions && productToAdd.packOptions[selectedPack])
            ? productToAdd.packOptions[selectedPack].multiplier
            : 1;
          var totalQty = quantity * packMultiplier;
          var currentInCart = (cart.find(function(i) { return i.product.id === productToAdd.id; }) || {}).quantity || 0;
          var pdpAvailable = pdpStockTotal - currentInCart;
          if (totalQty > pdpAvailable) {
            showToast('Stock insuficiente. Stock disponible: ' + pdpAvailable + (pdpAvailable === 1 ? ' unidad' : ' unidades'), 'warning');
            return;
          }
          var existing = cart.find(function(item) { return item.product.id === productToAdd.id && !item.selectedBeers; });
          if (existing) {
            existing.quantity += totalQty;
          } else {
            cart.push({ product: productToAdd, quantity: totalQty });
          }
          updateCartCount();
          renderCart();
          saveCartToStorage();

          // Notificación rica de carrito
          var _packLabel = (productToAdd.packOptions && productToAdd.packOptions[selectedPack])
            ? productToAdd.packOptions[selectedPack].label
            : null;
          if (typeof showCartToast === 'function') showCartToast(productToAdd, totalQty, _packLabel);
        }

        addToCartBtn.textContent = '\u2713 ¡Agregado!';
        addToCartBtn.style.background = 'var(--color-green)';
        addToCartBtn.style.color = 'var(--color-black)';

        var feedbackMs = (typeof MF_CONFIG !== 'undefined') ? MF_CONFIG.ui.addToCartFeedbackMs : 1500;
        setTimeout(function () {
          if (productToAdd.customPack) {
            updateAddToCartForPack();
          } else {
            addToCartBtn.innerHTML = cartIconSVG() + ' Agregar al carrito';
          }
          addToCartBtn.style.background = '';
          addToCartBtn.style.color = '';
        }, feedbackMs);
      });
    }

    // Related products
    initRelatedProducts(product);

    // Scroll effects
    initScrollEffects();
  }

  // ===== Beer Picker — "Armá tu Pack" custom beer selection =====
  var _selectedBeers = []; // Array of up to 3 product objects

  function initBeerPicker(packProduct) {
    _selectedBeers = [];
    var grid = document.getElementById('beerPickerGrid');
    if (!grid) return;

    // Get available cans (in-stock, active, container=can)
    var availableCans = PRODUCTS.filter(function(p) {
      return p.container === 'can' && !p.tags.includes('archive') && isProductAvailable(p.id);
    });

    grid.innerHTML = '';
    availableCans.forEach(function(beer) {
      var card = document.createElement('div');
      card.className = 'beer-pick-card';
      card.setAttribute('data-beer-id', beer.id);
      card.innerHTML =
        '<img class="beer-pick-card__img" src="' + escapeHtml(beer.image) + '" alt="' + escapeHtml(beer.name) + '" loading="lazy">' +
        '<div class="beer-pick-card__name">' + escapeHtml(beer.name) + '</div>';
      card.addEventListener('click', function() {
        toggleBeerSelection(beer);
      });
      grid.appendChild(card);
    });

    updateBeerPickerUI();
    updateAddToCartForPack();
  }

  function toggleBeerSelection(beer) {
    var idx = -1;
    for (var i = 0; i < _selectedBeers.length; i++) {
      if (_selectedBeers[i].id === beer.id) { idx = i; break; }
    }

    if (idx >= 0) {
      // Remove this beer
      _selectedBeers.splice(idx, 1);
    } else if (_selectedBeers.length < 3) {
      // Add this beer
      _selectedBeers.push(beer);
    }
    // If already 3 and clicking a new one, do nothing

    updateBeerPickerUI();
    updateAddToCartForPack();
  }

  function updateBeerPickerUI() {
    // Update slots
    var slots = document.querySelectorAll('.beer-slot');
    slots.forEach(function(slot, i) {
      if (_selectedBeers[i]) {
        slot.classList.add('filled');
        slot.innerHTML =
          '<img class="beer-slot__img" src="' + escapeHtml(_selectedBeers[i].image) + '" alt="' + escapeHtml(_selectedBeers[i].name) + '">' +
          '<button class="beer-slot__remove" onclick="event.stopPropagation(); removeBeerFromSlot(' + i + ')">✕</button>';
      } else {
        slot.classList.remove('filled');
        slot.innerHTML = '<span class="beer-slot__empty">+</span>';
      }
    });

    // Update counter
    var counter = document.getElementById('beerPickerCounter');
    if (counter) {
      counter.textContent = _selectedBeers.length + ' / 3 seleccionadas';
      counter.className = 'beer-picker__counter' + (_selectedBeers.length === 3 ? ' complete' : '');
    }

    // Update grid card states
    var cards = document.querySelectorAll('.beer-pick-card');
    cards.forEach(function(card) {
      var beerId = parseInt(card.getAttribute('data-beer-id'));
      var isSelected = _selectedBeers.some(function(b) { return b.id === beerId; });
      card.classList.toggle('selected', isSelected);
      // Disable unselected cards when 3 are already picked
      card.classList.toggle('disabled', _selectedBeers.length >= 3 && !isSelected);
    });
  }

  window.removeBeerFromSlot = function(slotIndex) {
    if (_selectedBeers[slotIndex]) {
      _selectedBeers.splice(slotIndex, 1);
      updateBeerPickerUI();
      updateAddToCartForPack();
    }
  };

  function updateAddToCartForPack() {
    var addBtn = document.getElementById('addToCartBtn');
    if (!addBtn) return;

    if (_selectedBeers.length < 3) {
      addBtn.disabled = true;
      addBtn.style.opacity = '0.4';
      addBtn.style.cursor = 'not-allowed';
      addBtn.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>' +
        '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' +
        '</svg> Elegí ' + (3 - _selectedBeers.length) + ' cerveza' + (_selectedBeers.length < 2 ? 's' : '') + ' más';
    } else {
      addBtn.disabled = false;
      addBtn.style.opacity = '';
      addBtn.style.cursor = '';
      addBtn.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>' +
        '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' +
        '</svg> Agregar al carrito';
    }
  }

  // ===== Accordion Toggle — each accordion is independent, both can be open =====
  function initAccordions() {
    document.querySelectorAll('.pdp-accordion__trigger').forEach(function(trigger) {
      trigger.addEventListener('click', function() {
        var content = trigger.nextElementSibling;
        var isOpen = content.classList.contains('open');

        // Toggle only THIS accordion — others stay as they are
        if (isOpen) {
          trigger.classList.remove('active');
          content.classList.remove('open');
        } else {
          trigger.classList.add('active');
          content.classList.add('open');
        }
      });
    });
  }

  // ===== Scroll Effects =====
  function initScrollEffects() {
    var pdpBg = document.getElementById('pdpBg');
    var colLeft = document.getElementById('pdpColLeft');

    // Make bg stay behind the layout, hide when reaching related products
    if (pdpBg && colLeft) {
      window.addEventListener('scroll', function () {
        var leftRect = colLeft.getBoundingClientRect();
        // When left column scrolls past viewport, hide background
        if (leftRect.bottom < 0) {
          pdpBg.style.opacity = '0';
        } else {
          pdpBg.style.opacity = '1';
        }
      }, { passive: true });
    }
  }

  function updateProductPrice(product) {
    var productPrice = document.getElementById('productPrice');
    if (!productPrice) return;
    var multiplier = product.packOptions[selectedPack].multiplier;
    var unitPrice = getProductPriceUYU(product);
    var totalPrice = unitPrice * multiplier * quantity;
    productPrice.textContent = formatPriceUYU(totalPrice);
  }

  // ===== Related Products =====
  function initRelatedProducts(currentProduct) {
    const carousel = document.getElementById('relatedCarousel');
    if (!carousel) return;

    // Get products from same category, excluding current
    let related = PRODUCTS.filter(p =>
      p.id !== currentProduct.id && (
        p.category === currentProduct.category ||
        p.tags.some(t => currentProduct.tags.includes(t))
      )
    );

    // If not enough, add random ones
    if (related.length < 4) {
      const others = PRODUCTS.filter(p =>
        p.id !== currentProduct.id && !related.includes(p)
      );
      related = [...related, ...others.slice(0, 4 - related.length)];
    }

    // Limit to 8
    related = related.slice(0, 8);

    related.forEach(product => {
      const card = createProductCard(product);
      carousel.appendChild(card);
    });
  }

  // ===== Sticky Filters Shadow =====
  function initStickyFilters() {
    const filters = document.getElementById('filtersBar');
    if (!filters) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        filters.classList.toggle('stuck', !entry.isIntersecting);
      },
      { threshold: 1, rootMargin: '-1px 0px 0px 0px' }
    );

    // Create a sentinel element right above filters
    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    sentinel.style.width = '100%';
    sentinel.style.position = 'absolute';
    sentinel.style.top = `${filters.offsetTop - 1}px`;
    sentinel.style.left = '0';
    sentinel.style.pointerEvents = 'none';
    document.body.appendChild(sentinel);
    observer.observe(sentinel);
  }

  // ===== Home Entrance Animations =====
  // Observa los elementos debajo del hero en la home y les agrega .home-in-view
  // cuando entran al viewport, disparando la animación CSS.
  function initHomeEntranceAnimations() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: mostrar todo directamente
      document.querySelectorAll('.product-card, .promo-card, .home-categories__title, .cat-card').forEach(function(el) {
        el.classList.add('home-in-view');
      });
      return;
    }

    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('home-in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    // Tarjetas de producto — stagger escalonado de a 4
    var productCards = document.querySelectorAll('#productGrid .product-card');
    productCards.forEach(function(card, i) {
      card.style.animationDelay = (Math.min((i % 4) * 0.08, 0.28)) + 's';
      io.observe(card);
    });

    // Tarjetas promo — stagger escalonado de a 3
    var promoCards = document.querySelectorAll('.promo-card');
    promoCards.forEach(function(card, i) {
      card.style.animationDelay = (Math.min((i % 3) * 0.1, 0.3)) + 's';
      io.observe(card);
    });

    // Título de categorías
    var catTitle = document.querySelector('.home-categories__title');
    if (catTitle) io.observe(catTitle);

    // Tarjetas de categoría — stagger
    var catCards = document.querySelectorAll('.cat-card');
    catCards.forEach(function(card, i) {
      card.style.animationDelay = (i * 0.1) + 's';
      io.observe(card);
    });
  }

  // ===== Shop View Switching =====
  function initShopViews() {
    const navLinks = document.querySelectorAll('.shop-subnav__link');
    const heroTitle = document.getElementById('heroTitle');
    const filtersBar = document.querySelector('.filters'); // The sidebar filters container
    const homePromos = document.getElementById('homePromos');
    const homeCategories = document.getElementById('homeCategories');
    
    if (!navLinks.length) return;

    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-view');
        if (!view) return;

        // Scroll al tope al cambiar de view — si estabas al final del home y
        // clickeás "Cervezas", querés ver el top de Cervezas, no el footer.
        window.scrollTo({ top: 0, behavior: 'instant' });

        // Update active state
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Toggle body class for full-bleed home mode (hero fullwidth + navbar oculto)
        if (view === 'home') {
          document.body.classList.add('view-home');
          initHomeSubnavReveal();
        } else {
          document.body.classList.remove('view-home');
          document.body.classList.remove('subnav-revealed');
        }

        if (view === 'home') {
          // Home View — manifesto hero (el rotativo dynHero migra a "cervezas")
          if (heroTitle) {
            // Imagen responsive: celular vs PC
            heroTitle.innerHTML = `<picture class="home-title-picture">
              <source media="(max-width: 640px)" srcset="img/index/la-malafama-estademoda-celular.png">
              <img src="img/index/la-malafama-estademoda-pc.png" alt="La Mala Fama Está de Moda" class="home-title-img">
            </picture>`;
            heroTitle.classList.add('hero__title--home');
          }
          if (filtersBar) filtersBar.style.display = 'none';
          if (homePromos) homePromos.style.display = 'block';
          if (homeCategories) homeCategories.style.display = 'block';
          // Rotativo OFF en home
          var dynHeroEl = document.getElementById('dynHero');
          if (dynHeroEl) { dynHeroEl.style.display = 'none'; stopHeroInterval(); }
          // Home hero manifiesto ON
          var homeHeroEl = document.getElementById('homeHero');
          if (homeHeroEl) {
            homeHeroEl.style.display = 'block';
            showHomeHero();
          }

          renderProductGrid();
          // Animaciones de entrada para secciones debajo del hero
          document.body.classList.remove('view-home-anim');
          void document.body.offsetWidth; // reflow para reiniciar
          document.body.classList.add('view-home-anim');
          setTimeout(initHomeEntranceAnimations, 50); // pequeño delay para que el DOM esté renderizado
        } else {
          document.body.classList.remove('view-home-anim');
          // Cans View and Other Views
          if (heroTitle) {
            let titleText = 'CERVEZAS';
            if (view === 'valuepacks') titleText = 'PACKS';
            if (view === 'specials') titleText = 'ESPECIALES';
            if (view === 'merch') titleText = 'MERCH';
            if (view === 'archive') titleText = 'SIN STOCK';
            
            heroTitle.innerHTML = titleText;
            heroTitle.classList.remove('hero__title--home');
          }
          
          if (view === 'cans') {
              if (filtersBar) filtersBar.style.display = ''; // Show filters
              // Disparar animaciones de entrada de la view cervezas
              document.body.classList.remove('view-cans-anim');
              void document.body.offsetWidth; // reflow
              document.body.classList.add('view-cans-anim');
          } else {
              if (filtersBar) filtersBar.style.display = 'none'; // Hide filters for non-beer tabs to keep UI clean
              document.body.classList.remove('view-cans-anim');
          }
          
          if (homePromos) homePromos.style.display = 'none';
          if (homeCategories) homeCategories.style.display = 'none';
          // Home hero manifiesto OFF fuera de home
          var homeHeroOff = document.getElementById('homeHero');
          if (homeHeroOff) { homeHeroOff.style.display = 'none'; homeHeroOff.classList.remove('home-hero--ready'); }
          // El rotativo ahora vive en "cervezas" (view === 'cans')
          var dynHero = document.getElementById('dynHero');
          if (dynHero) {
            if (view === 'cans') {
              dynHero.style.display = 'block';
              // Reset + reflow para reiniciar animaciones de entrada
              dynHero.classList.remove('dyn-hero--anim');
              void dynHero.offsetWidth;
              dynHero.classList.add('dyn-hero--anim');
              startHeroInterval();
            } else {
              dynHero.style.display = 'none';
              dynHero.classList.remove('dyn-hero--anim');
              stopHeroInterval();
            }
          }
          
          // Reset internal filters to all when switching main tabs
          currentContainer = 'all';
          currentStyle = 'all';
          const styleFilters = document.getElementById('categoryFilters');
          if (styleFilters) {
             styleFilters.querySelectorAll('.filter-btn').forEach(b => {
               b.classList.toggle('active', b.getAttribute('data-category') === 'all');
             });
          }
          const containerFilters = document.getElementById('containerFilters');
          if (containerFilters) {
             containerFilters.querySelectorAll('.filter-btn').forEach(b => {
               b.classList.toggle('active', b.getAttribute('data-container') === 'all');
             });
          }

          renderProductGrid();
        }
      });
    });
  }

  // ===== Search Overlay =====
  function initSearch() {
    var searchBtn = document.getElementById('searchBtn');
    var overlay = document.getElementById('searchOverlay');
    var closeBtn = document.getElementById('searchCloseBtn');
    var input = document.getElementById('searchInput');
    var resultsEl = document.getElementById('searchResults');
    if (!searchBtn || !overlay) return;

    function openSearch() {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      setTimeout(function() { input.focus(); }, 100);
    }

    function closeSearch() {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      input.value = '';
      resultsEl.innerHTML = '';
    }

    searchBtn.addEventListener('click', openSearch);
    closeBtn.addEventListener('click', closeSearch);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeSearch();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.classList.contains('active')) closeSearch();
      // Ctrl+K or Cmd+K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
    });

    var debounceTimer;
    input.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() { doSearch(input.value.trim()); }, 150);
    });

    function doSearch(query) {
      if (!query || query.length < 2) {
        resultsEl.innerHTML = '';
        return;
      }

      var q = query.toLowerCase();
      var results = PRODUCTS.filter(function(p) {
        var haystack = [
          p.name, p.subtitle, p.category, p.style,
          p.description || '',
          (p.flavorNotes || []).join(' '),
          (p.tags || []).join(' ')
        ].join(' ').toLowerCase();
        return haystack.indexOf(q) !== -1;
      }).slice(0, 12);

      if (results.length === 0) {
        resultsEl.innerHTML = '<div class="search-no-results">No se encontraron resultados para "' + query + '"</div>';
        return;
      }

      resultsEl.innerHTML = results.map(function(p) {
        var href = p.customPack ? 'pack.html' : (p.container === 'merch' ? 'merch.html?slug=' + p.slug : 'product.html?slug=' + p.slug);
        var price = formatPriceUYU(getProductPriceUYU(p));
        return '<a class="search-result" href="' + href + '">' +
          '<img class="search-result__img" src="' + (p.cardImage || p.image) + '" alt="' + p.name + '" loading="lazy">' +
          '<div class="search-result__info">' +
            '<div class="search-result__name">' + p.name + '</div>' +
            '<div class="search-result__sub">' + p.subtitle + '</div>' +
          '</div>' +
          '<div class="search-result__price">' + price + '</div>' +
        '</a>';
      }).join('');
    }
  }

  // ===== Dynamic Hero Rotation =====
  var heroInterval = null;
  var heroIndex = 0;
  var heroProducts = [];

  function initDynHero() {
    var hero = document.getElementById('dynHero');
    if (!hero) return;

    // Pick products that have illustrations and are cans
    heroProducts = PRODUCTS.filter(function(p) {
      return p.illustration && p.illustration.length > 0 && isProductActive(p.id) && p.container === 'can';
    }).slice(0, 8); // Max 8 for rotation

    if (heroProducts.length === 0) return;

    // Build dots
    var dotsEl = document.getElementById('heroDots');
    if (dotsEl) {
      dotsEl.innerHTML = heroProducts.map(function(_, i) {
        return '<button class="dyn-hero__dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '"></button>';
      }).join('');
      dotsEl.addEventListener('click', function(e) {
        var dot = e.target.closest('.dyn-hero__dot');
        if (!dot) return;
        heroIndex = parseInt(dot.getAttribute('data-index'));
        updateHero();
        restartHeroInterval();
      });
    }

    updateHero();
    startHeroInterval();
    initHeroParallax();
  }

  // ═══════════════════════════════════════════════════════════
  // HOME HERO — Manifiesto Malafama: entrada escalonada + parallax scroll
  // ═══════════════════════════════════════════════════════════
  // Revela el shop-subnav con transform al scrollear en home view.
  // Se inicializa una única vez; depende del body.view-home que se toggle en initShopViews.
  var homeSubnavInited = false;
  function initHomeSubnavReveal() {
    if (homeSubnavInited) return;
    homeSubnavInited = true;
    var threshold = function() { return Math.min(window.innerHeight * 0.55, 460); };
    function onScroll() {
      if (!document.body.classList.contains('view-home')) return;
      if (window.scrollY > threshold()) {
        document.body.classList.add('subnav-revealed');
      } else {
        document.body.classList.remove('subnav-revealed');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  // ─── Mobile: mostrar subnav al hacer scroll hacia ARRIBA ───
  (function initMobileSubnavScrollUp() {
    if (!document.querySelector('.shop-subnav')) return;
    var lastY = window.scrollY;
    var ticking = false;
    function isMobile() { return window.matchMedia('(max-width: 900px)').matches; }
    function update() {
      ticking = false;
      if (!isMobile()) {
        document.body.classList.remove('subnav-mobile-visible');
        return;
      }
      var y = window.scrollY;
      if (y < lastY - 3 && y > 60) {
        document.body.classList.add('subnav-mobile-visible');
      } else if (y > lastY + 3 || y <= 30) {
        document.body.classList.remove('subnav-mobile-visible');
      }
      lastY = y;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  })();

  // ─── Desktop: todas las páginas — ocultar subnav al scroll down, mostrar al scroll up ───
  (function initDesktopSubnavToggle() {
    if (!document.querySelector('.shop-subnav')) return;
    var lastY = window.scrollY;
    var ticking = false;
    function isDesktop() { return window.matchMedia('(min-width: 901px)').matches; }
    function update() {
      ticking = false;
      if (!isDesktop()) {
        document.body.classList.remove('subnav-desktop-hidden');
        return;
      }
      var y = window.scrollY;
      if (y > lastY + 5 && y > 100) {
        document.body.classList.add('subnav-desktop-hidden');
      } else if (y < lastY - 5) {
        document.body.classList.remove('subnav-desktop-hidden');
      }
      lastY = y;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  })();

  var homeHeroInitialized = false;
  function showHomeHero() {
    var el = document.getElementById('homeHero');
    if (!el) return;
    // Limpiar transform inline del retrato (lo deja el parallax del mouse)
    // así la animación de entrada CSS puede correr de cero.
    var portraitReset = document.getElementById('homeHeroPortrait');
    if (portraitReset) {
      portraitReset.style.transform = '';
      portraitReset.style.opacity = '';
    }
    // Dispara la animación de entrada (clase .home-hero--ready)
    // Espera a que el loader termine de salir para que el usuario vea las animaciones completas.
    el.classList.remove('home-hero--ready');
    void el.offsetWidth; // reflow
    function triggerHeroAnim() {
      el.classList.remove('home-hero--ready');
      void el.offsetWidth;
      requestAnimationFrame(function() {
        el.classList.add('home-hero--ready');
      });
    }
    if (document.body.classList.contains('mf-page-ready')) {
      // Loader ya desapareció → animar de una
      triggerHeroAnim();
    } else {
      // Loader todavía visible → esperar que termine de salir
      window.addEventListener('mf:page-ready', triggerHeroAnim, { once: true });
    }
    if (homeHeroInitialized) return;
    homeHeroInitialized = true;

    // Wire del CTA "VER LAS CERVEZAS" → dispara switch a "cans"
    var ctaSwitch = el.querySelector('[data-view-switch]');
    if (ctaSwitch) {
      ctaSwitch.addEventListener('click', function(e) {
        e.preventDefault();
        var target = ctaSwitch.getAttribute('data-view-switch');
        if (window.switchToView) window.switchToView(target);
      });
    }

    // Parallax suave al scrollear (fondo lento, sello contra, pilares ligeros)
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      var bg = document.getElementById('homeHeroBg');
      var portrait = document.getElementById('homeHeroPortrait');
      var rafPending = false;
      function onScroll() {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(function() {
          rafPending = false;
          var rect = el.getBoundingClientRect();
          var progress = Math.max(0, Math.min(1, -rect.top / (rect.height || 1)));
          if (bg) bg.style.transform = 'translate3d(0, ' + (progress * 60).toFixed(1) + 'px, 0) scale(1.04)';
          if (portrait && window.innerWidth > 900) portrait.style.transform = 'translateY(calc(-50% + ' + (-progress * 30).toFixed(1) + 'px)) rotate(8deg)';
        });
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      // Parallax sutil al mover mouse — se activa SOLO después de que termina
      // la animación de entrada, así no pisa el transform durante el slide-in.
      var noHover = window.matchMedia('(hover: none)').matches;
      if (!noHover && portrait) {
        setTimeout(function () {
          el.addEventListener('mousemove', function(e) {
            if (portrait.classList.contains('mf-portrait--hidden')) return;
            var r = el.getBoundingClientRect();
            var x = (e.clientX - r.left) / r.width - 0.5;
            var y = (e.clientY - r.top) / r.height - 0.5;
            portrait.style.transform = 'translate(' + (x * -10).toFixed(1) + 'px, calc(-50% + ' + (y * -8).toFixed(1) + 'px)) rotate(8deg)';
          });
        }, 1800);
      }
    }

    // ─── Animación de entrada del retrato en mobile (scroll trigger) ───
    (function() {
      if (window.innerWidth > 900) return; // solo mobile
      var mPortrait = document.getElementById('homeHeroPortrait');
      if (!mPortrait) return;
      // Resetear al volver al home
      mPortrait.classList.remove('portrait-in-view');
      if (mPortrait._portraitScrollFn) window.removeEventListener('scroll', mPortrait._portraitScrollFn);

      function checkPortrait() {
        // El retrato es abs bottom:32px dentro del hero — observamos la posición
        // vertical del hero bottom para detectar cuando el retrato entra al viewport
        var heroRect = el.getBoundingClientRect();
        var portraitTop = heroRect.bottom - 32 - 280; // aprox top del retrato
        if (portraitTop < window.innerHeight * 0.9) {
          mPortrait.classList.add('portrait-in-view');
          window.removeEventListener('scroll', mPortrait._portraitScrollFn, { passive: true });
        }
      }
      mPortrait._portraitScrollFn = checkPortrait;
      window.addEventListener('scroll', checkPortrait, { passive: true });
    })();

    // ─── Lightbox del retrato: al clickear se abre en el centro ───
    var portraitEl = document.getElementById('homeHeroPortrait');
    if (portraitEl && !portraitEl._mfLightboxWired) {
      portraitEl._mfLightboxWired = true;
      var portraitImg = portraitEl.querySelector('.home-hero__portrait-img');

      // Crear lightbox una sola vez
      var lb = document.createElement('div');
      lb.className = 'mf-portrait-lightbox';
      lb.innerHTML =
        '<img src="' + (portraitImg ? portraitImg.src : '') + '" alt="" class="mf-portrait-lightbox__img">' +
        '<button type="button" class="mf-portrait-lightbox__close" aria-label="Cerrar">✕</button>';
      document.body.appendChild(lb);
      var lbImg = lb.querySelector('.mf-portrait-lightbox__img');
      var lbClose = lb.querySelector('.mf-portrait-lightbox__close');

      // ─── Lightbox con técnica FLIP (transform-only, ultra confiable) ───
      // Idea: la imagen vive SIEMPRE centrada (via flexbox). Para abrir,
      // calculamos el delta entre el retrato original y el centro, y ponemos
      // un transform inicial que la hace aparecer EN el retrato. Luego
      // pasamos a transform "" → animación al centro. Para cerrar, ponemos el
      // mismo transform inverso → animación de vuelta. SIN tocar top/left/width.
      // Devuelve transform que coloca lbImg EXACTAMENTE encima del retrato real.
      // Usa el rect de la <img> interna (no del div) para que el scale sea exacto
      // y la imagen no se deforme.
      function getPortraitTransform() {
        var sourceImg = portraitEl.querySelector('.home-hero__portrait-img') || portraitEl;
        var pr = sourceImg.getBoundingClientRect();
        var ir = lbImg.getBoundingClientRect(); // estado centrado actual
        if (!ir.width || !pr.width) return 'rotate(8deg)';
        // Scale uniforme: ambas imágenes mantienen el mismo aspect ratio
        // (height: auto sin max-height), entonces scaleX === scaleY.
        var scale = pr.width / ir.width;
        var dx = (pr.left + pr.width / 2) - (ir.left + ir.width / 2);
        var dy = (pr.top + pr.height / 2) - (ir.top + ir.height / 2);
        return 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ') rotate(8deg)';
      }

      var closeTimer = null;
      function openLightbox() {
        if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
        // 1. Mostrar lightbox (img centrada via flex)
        lb.classList.add('mf-portrait-lightbox--open');
        // 2. Sin transición: arrancar en la posición del retrato real
        lbImg.style.transition = 'none';
        lbImg.style.transform = getPortraitTransform();
        // 3. Reflow + reactivar transición → animación al centro
        void lbImg.offsetWidth;
        lbImg.style.transition = '';
        lbImg.style.transform = '';
        portraitEl.style.opacity = '0';
        portraitEl.classList.add('portrait-lb-open');
      }
      function closeLightbox() {
        // Cierre: fade out de la imagen + del fondo. El retrato real reaparece
        // en su posición normal sin animación de vuelo.
        lbImg.style.opacity = '0';
        lb.style.background = 'rgba(0,0,0,0)';
        // Devolvemos el retrato real ya mismo (queda detrás del fade)
        portraitEl.style.opacity = '';
        portraitEl.classList.remove('portrait-lb-open');
        closeTimer = setTimeout(function () {
          lb.classList.remove('mf-portrait-lightbox--open');
          lb.style.background = '';
          // Reset sin transición (queda hidden de todas formas)
          lbImg.style.transition = 'none';
          lbImg.style.transform = '';
          lbImg.style.opacity = '';
          void lbImg.offsetWidth;
          lbImg.style.transition = '';
          closeTimer = null;
        }, 520);
      }

      portraitEl.addEventListener('click', openLightbox);
      lbClose.addEventListener('click', closeLightbox);
      lb.addEventListener('click', function (e) {
        if (e.target === lb) closeLightbox();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && lb.classList.contains('mf-portrait-lightbox--open')) {
          closeLightbox();
        }
      });
    }
  }

  // Parallax sutil en el hero al mover el mouse. Se desactiva por completo
  // en dispositivos touch (hover:none) y respeta prefers-reduced-motion.
  function initHeroParallax() {
    var hero = document.getElementById('dynHero');
    if (!hero) return;
    var noHover = window.matchMedia('(hover: none)').matches;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (noHover || reduced) return;

    var illEl = document.getElementById('heroIllustration');
    var canWrap = hero.querySelector('.dyn-hero__can');
    if (!illEl && !canWrap) return;

    var targetX = 0, targetY = 0;
    var curX = 0, curY = 0;
    var rafId = null, active = false;

    function onMove(e) {
      var rect = hero.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5..0.5
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = x;
      targetY = y;
      if (!active) { active = true; loop(); }
    }
    function onLeave() {
      targetX = 0; targetY = 0;
    }
    function loop() {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      // Ilustración: contra el mouse, rango ±14px
      if (illEl) {
        illEl.style.transform = 'translateY(-50%) translate(' + (-curX * 14).toFixed(2) + 'px, ' + (-curY * 10).toFixed(2) + 'px)';
      }
      // Lata: con el mouse, rango ±7px (se suma al transform actual de la lata)
      if (canWrap) {
        canWrap.style.transform = 'translate(' + (curX * 7).toFixed(2) + 'px, ' + (curY * 5).toFixed(2) + 'px)';
      }
      if (Math.abs(targetX - curX) > 0.001 || Math.abs(targetY - curY) > 0.001) {
        rafId = requestAnimationFrame(loop);
      } else {
        active = false;
        rafId = null;
      }
    }
    hero.addEventListener('mousemove', onMove);
    hero.addEventListener('mouseleave', onLeave);
  }

  function updateHero() {
    var hero = document.getElementById('dynHero');
    if (!hero || heroProducts.length === 0) return;

    var p = heroProducts[heroIndex % heroProducts.length];

    // Determine if background is light or dark
    var bg = p.bgColor || '#1a1a1a';
    var isLight = isLightColor(bg);

    hero.style.backgroundColor = bg;
    hero.className = 'dyn-hero ' + (isLight ? 'dyn-hero--light' : 'dyn-hero--dark');

    var illEl = document.getElementById('heroIllustration');
    if (illEl) illEl.style.backgroundImage = 'url(' + p.illustration + ')';

    var nameEl = document.getElementById('heroName');
    if (nameEl) {
      nameEl.style.color = p.heroTitleColor || p.titleColor || '';
      if (p.heroNameHTML) {
        nameEl.innerHTML = p.heroNameHTML;
      } else {
        kineticType(nameEl, p.name);
      }
    }

    var eyebrowEl = document.getElementById('heroEyebrow');
    if (eyebrowEl) eyebrowEl.textContent = (p.style || p.category).toUpperCase() + ' · ' + (p.abv || '');

    var descEl = document.getElementById('heroDesc');
    if (descEl) descEl.textContent = p.description || '';

    var notesEl = document.getElementById('heroNotes');
    if (notesEl && p.flavorNotes) {
      notesEl.innerHTML = p.flavorNotes.map(function(n) {
        return '<span class="dyn-hero__note">' + n + '</span>';
      }).join('');
    }

    var canEl = document.getElementById('heroCan');
    if (canEl) {
      canEl.src = p.image;
      canEl.alt = p.name;
      canEl.parentElement.style.cursor = 'pointer';
      canEl.parentElement.onclick = function() {
        window.location.href = p.customPack ? 'pack.html' : (p.container === 'merch' ? 'merch.html?slug=' + p.slug : 'product.html?slug=' + p.slug);
      };
    }

    var ctaEl = document.getElementById('heroCta');
    if (ctaEl) {
      ctaEl.href = p.customPack ? 'pack.html' : 'product.html?slug=' + p.slug;
    }

    // Update dots
    var dots = document.querySelectorAll('.dyn-hero__dot');
    dots.forEach(function(d, i) {
      d.classList.toggle('active', i === (heroIndex % heroProducts.length));
    });
  }

  // Kinetic type: splits text into letter spans and animates them in
  // with staggered entrance. Mobile (hover:none OR ≤640px) uses a calmer
  // variant: shorter stagger, no random offset/rotation.
  function kineticType(el, text) {
    if (!el) return;
    var isMobile = window.matchMedia('(max-width: 640px)').matches ||
                   window.matchMedia('(hover: none)').matches;
    var stagger = isMobile ? 20 : 45;
    var chars = String(text).split('');
    var html = chars.map(function(ch) {
      if (ch === ' ') return '<span class="dyn-hero__letter">&nbsp;</span>';
      var kx = 0, ky = 0, kr = 0;
      if (!isMobile) {
        kx = (Math.random() * 16 - 8).toFixed(1);
        ky = (Math.random() * 16 - 8).toFixed(1);
        kr = (Math.random() * 6 - 3).toFixed(1);
      }
      return '<span class="dyn-hero__letter" style="--kx:' + kx + 'px;--ky:' + ky + 'px;--kr:' + kr + 'deg;">' + ch + '</span>';
    }).join('');
    el.innerHTML = html;
    var letters = el.querySelectorAll('.dyn-hero__letter');
    letters.forEach(function(letter, i) {
      setTimeout(function() {
        letter.classList.add('dyn-hero__letter--in');
      }, i * stagger + 30);
    });
  }

  function isLightColor(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    var r = parseInt(hex.substr(0,2), 16);
    var g = parseInt(hex.substr(2,2), 16);
    var b = parseInt(hex.substr(4,2), 16);
    var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55;
  }

  function startHeroInterval() {
    if (heroInterval) return;
    heroInterval = setInterval(function() {
      heroIndex = (heroIndex + 1) % heroProducts.length;
      updateHero();
    }, 6000);
  }

  function stopHeroInterval() {
    if (heroInterval) { clearInterval(heroInterval); heroInterval = null; }
  }

  function restartHeroInterval() {
    stopHeroInterval();
    startHeroInterval();
  }

  // ===== Initialize =====
  async function init() {
    // Multiplicar el contenido del marquee para cubrir pantallas ultra-anchas sin dejar espacios en blanco
    var marqueeTracks = document.querySelectorAll('.top-marquee__track');
    marqueeTracks.forEach(function(t) {
      // Duplicar hasta que el contenido cubra al menos 2x el ancho de pantalla
      var original = t.innerHTML;
      while (t.scrollWidth < window.innerWidth * 2) {
        t.innerHTML += original;
      }
      // Una copia más para asegurar cobertura total
      t.innerHTML += original;
      // Calcular el porcentaje que representa una copia del original
      var totalItems = t.children.length;
      var originalItems = original.split('</span>').length - 1;
      var pct = (originalItems / totalItems) * 100;
      t.style.animationDuration = '20s';
      t.style.setProperty('--marquee-pct', '-' + pct + '%');
    });

    checkAgeGate();
    loadCartFromStorage(); // Restaurar carrito desde localStorage
    updateCartCount();
    initCartUI(); // siempre inicializar el carrito en todas las páginas

    // Search
    initSearch();

    // Show skeletons while loading
    var skeletonGrid = document.getElementById('productGrid');
    if (skeletonGrid) {
      var skeletonHTML = '';
      for (var s = 0; s < 8; s++) {
        skeletonHTML += '<div class="skeleton-card"><div class="skeleton-card__image"></div><div class="skeleton-card__info"><div class="skeleton-card__line skeleton-card__line--title"></div><div class="skeleton-card__line skeleton-card__line--sub"></div><div class="skeleton-card__line skeleton-card__line--price"></div></div></div>';
      }
      skeletonGrid.innerHTML = skeletonHTML;
    }

    // Load stock data from server
    await loadStockData();

    // Dynamic hero
    initDynHero();

    // Collection page
    const grid = document.getElementById('productGrid');
    if (grid) {
      initSidebarFilters();
      initSortDropdown();
      initShopViews();
      initStickyFilters();
      
      // Si la URL trae ?view=X (ej: viniendo desde la PDP subnav), abrir esa view
      var requestedView = new URLSearchParams(window.location.search).get('view');
      var initialTab = null;
      if (requestedView) {
        initialTab = document.querySelector('.shop-subnav__link[data-view="' + requestedView + '"]');
      }
      if (!initialTab) {
        initialTab = document.querySelector('.shop-subnav__link[data-view="home"]');
      }
      if (initialTab) {
        initialTab.click();
        setTimeout(function() { window.scrollTo(0, 0); }, 10);
      } else {
        renderProductGrid();
      }
    }

    // Product detail page
    const productPage = document.getElementById('productPage');
    if (productPage) {
      initProductPage();
      // Disparar animaciones de entrada de la PDP en el próximo frame
      // (después de que el contenido dinámico ya se haya inyectado).
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          document.body.classList.add('pdp-anim-ready');

          // Scroll-triggered: acordeones, moments y bottom-illust animan
          // recién cuando entran en viewport.
          var lazyEls = document.querySelectorAll(
            '.pdp-accordion, .pdp-moments, .pdp-bottom-illust'
          );
          if ('IntersectionObserver' in window && lazyEls.length) {
            var pdpIO = new IntersectionObserver(function (entries) {
              entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                  entry.target.classList.add('pdp-in-view');
                  pdpIO.unobserve(entry.target);
                }
              });
            }, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' });
            lazyEls.forEach(function (el) { pdpIO.observe(el); });
          } else {
            // Fallback sin IO
            lazyEls.forEach(function (el) { el.classList.add('pdp-in-view'); });
          }

          // Floating navbar: aparece cuando "También te van a gustar" entra en viewport
          var floatingNav = document.getElementById('pdpFloatingNav');
          var related = document.querySelector('.related-products');
          if (floatingNav && related && 'IntersectionObserver' in window) {
            var navIO = new IntersectionObserver(function (entries) {
              entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                  floatingNav.classList.add('is-visible');
                } else {
                  floatingNav.classList.remove('is-visible');
                }
              });
            }, { threshold: 0, rootMargin: '0px 0px -20% 0px' });
            navIO.observe(related);
          }
        });
      });
    }
  }

  // ===== Expose functions for pack.html and external pages =====
  window.formatPriceUYU = formatPriceUYU;
  window.getProductPriceUYU = getProductPriceUYU;
  window.isProductAvailable = isProductAvailable;

  // Retorna el total del carrito en UYU (usado por showCartToast en utils.js)
  window.getCartTotal = function () {
    var total = 0;
    cart.forEach(function (item) {
      total += getProductPriceUYU(item.product) * item.quantity;
    });
    return total;
  };

  // Navega a checkout serializando el carrito a sessionStorage
  // (checkout.html lee de sessionStorage y redirige a index.html si está vacío)
  window.goToCheckout = function () {
    if (cart.length === 0) {
      if (typeof showToast === 'function') showToast('Tu carrito está vacío.', 'warning');
      return false;
    }
    var checkoutCart = cart.map(function (item) {
      return {
        id: item.product.id,
        name: item.product.name,
        subtitle: item.product.subtitle || '',
        image: item.product.image,
        priceUYU: getProductPriceUYU(item.product),
        quantity: item.quantity,
        selectedBeers: item.selectedBeers || undefined
      };
    });
    sessionStorage.setItem('checkoutCart', JSON.stringify(checkoutCart));
    window.location.href = 'checkout.html';
    return true;
  };

  window.addCustomPackToCart = function(packProduct, qty, selectedBeers) {
    var packItem = {
      product: packProduct,
      quantity: qty,
      selectedBeers: selectedBeers.map(function(b) { return { id: b.id, name: b.name, image: b.image }; })
    };
    cart.push(packItem);
    updateCartCount();
    renderCart();
    saveCartToStorage();
  };

  window.switchToView = function(viewName) {
    var link = document.querySelector('.shop-subnav__link[data-view="' + viewName + '"]');
    if (link) {
      link.click();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  window.createProductCardExternal = function(product) {
    return createProductCard(product);
  };

  window._addStandardToCart = function(product, qty) {
    if (!isProductAvailable(product.id)) return;
    var existing = cart.find(function(item) { return item.product.id === product.id && !item.selectedBeers; });
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({ product: product, quantity: qty });
    }
    updateCartCount();
    renderCart();
    saveCartToStorage();
  };

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
