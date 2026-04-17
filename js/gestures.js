// =====================================================================
// GESTURES.JS — Gestos móviles + polish UX
// =====================================================================
// Agrega las siguientes funcionalidades sin tocar visuales existentes:
//   1. Botón "atrás" de Android cierra modales primero (no sale de la página)
//   2. Haptic feedback (vibración sutil) en interacciones clave
//   3. Swipe-down para cerrar modales (auth, nosotros, booking, search)
//   4. Swipe-right para cerrar drawers (carrito, pedidos)
//   5. navigator.share() API para compartir producto (window.mfShare)
//   6. Doble-tap en top-marquee / logo → scroll-to-top
//   7. Long-press en product card → bottom sheet de acciones rápidas
//   8. Overscroll-behavior para prevenir pull-to-refresh accidental (CSS)
//
// Se carga DESPUÉS de app.js / auth.js para que las modales ya existan.
// Funciona por polling + event-based para detectar cambios de estado sin
// tener que modificar las funciones open/close existentes.
// =====================================================================

(function () {
  'use strict';

  var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  function isMobileVW() { return window.matchMedia('(max-width: 900px)').matches; }
  function mobile() { return isTouch && isMobileVW(); }

  // ─── Haptic: vibración sutil ──────────────────────────────────────
  // Android/Chrome soportan navigator.vibrate. iOS Safari no (ignora silenciosamente).
  function haptic(pattern) {
    if (!navigator.vibrate) return false;
    try { return navigator.vibrate(pattern || 10); } catch (e) { return false; }
  }
  window.mfHaptic = haptic; // expuesto por si otro script lo necesita

  // ═══════════════════════════════════════════════════════════════════
  // REGISTRY DE MODALES
  // ═══════════════════════════════════════════════════════════════════
  // Prioridad: el primero en la lista con isOpen()=true es "el de arriba".
  // swipe: 'down' → modal-centrado que se cierra arrastrando hacia abajo
  //        'right' → drawer que sale de la derecha, se cierra arrastrando a la derecha
  var modalDefs = [
    {
      name: 'authModal', swipe: 'down',
      getRoot: function () { return document.getElementById('authModal'); },
      getCard: function () { return document.querySelector('#authModal .auth-modal__card'); },
      isOpen: function () { var r = this.getRoot(); return !!(r && r.classList.contains('active')); },
      close: function () {
        var btn = document.getElementById('authModalClose');
        if (btn) { btn.click(); return; }
        var r = this.getRoot(); if (r) r.classList.remove('active');
      }
    },
    {
      name: 'ordersDrawer', swipe: 'right',
      getRoot: function () { return document.getElementById('ordersDrawerPanel'); },
      getCard: function () { return document.getElementById('ordersDrawerPanel'); },
      isOpen: function () { var r = this.getRoot(); return !!(r && r.classList.contains('active')); },
      close: function () {
        var btn = document.getElementById('ordersCloseBtn');
        if (btn) { btn.click(); return; }
        var r = this.getRoot();
        var ov = document.getElementById('ordersOverlay');
        if (r) r.classList.remove('active');
        if (ov) ov.classList.remove('active');
      }
    },
    {
      name: 'searchOverlay', swipe: 'down',
      getRoot: function () { return document.getElementById('searchOverlay'); },
      getCard: function () { return document.querySelector('#searchOverlay .search-overlay__panel') || document.getElementById('searchOverlay'); },
      isOpen: function () { var r = this.getRoot(); return !!(r && r.classList.contains('active')); },
      close: function () {
        var btn = document.getElementById('searchCloseBtn');
        if (btn) { btn.click(); return; }
        var r = this.getRoot(); if (r) r.classList.remove('active');
      }
    },
    {
      name: 'cartDrawer', swipe: 'right',
      getRoot: function () { return document.getElementById('cartDrawer'); },
      getCard: function () { return document.getElementById('cartDrawer'); },
      isOpen: function () { var r = this.getRoot(); return !!(r && r.classList.contains('active')); },
      close: function () {
        var btn = document.getElementById('cartCloseBtn');
        if (btn) { btn.click(); return; }
        var r = this.getRoot();
        var ov = document.getElementById('cartOverlay');
        if (r) r.classList.remove('active');
        if (ov) ov.classList.remove('active');
      }
    },
    {
      name: 'bookingModal', swipe: 'down',
      getRoot: function () { return document.getElementById('bookingModal'); },
      getCard: function () { return document.querySelector('#bookingModal .booking-modal__card') || document.getElementById('bookingModal'); },
      isOpen: function () { var r = this.getRoot(); return !!(r && r.style && r.style.display === 'block'); },
      close: function () {
        if (typeof window.closeBookingModal === 'function') { window.closeBookingModal(); return; }
        var r = this.getRoot(); if (r) r.style.display = 'none';
      }
    },
    {
      name: 'nosModal', swipe: 'down',
      getRoot: function () { return document.getElementById('nosModal'); },
      getCard: function () { return document.getElementById('nosModalCard'); },
      isOpen: function () { var r = this.getRoot(); return !!(r && r.classList.contains('nos-modal--open')); },
      close: function () {
        var btn = document.getElementById('nosModalClose');
        if (btn) { btn.click(); return; }
        var r = this.getRoot(); if (r) r.classList.remove('nos-modal--open');
      }
    }
  ];

  function topOpenModal() {
    for (var i = 0; i < modalDefs.length; i++) {
      if (modalDefs[i].isOpen()) return modalDefs[i];
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 1. BOTÓN ATRÁS (ANDROID) CIERRA MODALES PRIMERO
  // ═══════════════════════════════════════════════════════════════════
  // Flujo:
  //   Modal abre → push fake history entry
  //   User hace "back" → popstate → cerramos modal (sin navegar)
  //   User cierra modal con X → poll detecta → history.back() para
  //     consumir el fake entry, así el próximo back sí navega.
  var pushedForModal = false;
  var closingViaPopstate = false;

  function syncBackButton() {
    var open = !!topOpenModal();
    if (open && !pushedForModal) {
      try { history.pushState({ mfModal: true }, ''); } catch (e) {}
      pushedForModal = true;
    } else if (!open && pushedForModal && !closingViaPopstate) {
      pushedForModal = false;
      try { history.back(); } catch (e) {}
    }
  }
  setInterval(syncBackButton, 180);

  window.addEventListener('popstate', function () {
    if (!pushedForModal) return;
    closingViaPopstate = true;
    pushedForModal = false;
    var top = topOpenModal();
    if (top) {
      top.close();
      haptic(8);
    }
    setTimeout(function () { closingViaPopstate = false; }, 200);
  });

  // ═══════════════════════════════════════════════════════════════════
  // 2. HAPTIC FEEDBACK EN INTERACCIONES CLAVE
  // ═══════════════════════════════════════════════════════════════════
  document.addEventListener('click', function (e) {
    if (!isTouch) return;
    var t = e.target;
    if (!t || !t.closest) return;
    // Agregar al carrito (todas las variantes de botón)
    if (t.closest('.product-card__buy-btn') ||
        t.closest('.pdp-buy-btn') ||
        t.closest('.add-to-cart') ||
        t.closest('[data-action="add-to-cart"]') ||
        t.closest('.pdp-add-btn')) {
      haptic(15);
      return;
    }
    // Quitar del carrito / cambiar cantidad
    if (t.closest('.card-qty-picker__btn') ||
        t.closest('.cart-item__qty-btn') ||
        t.closest('.qty-picker__btn')) {
      haptic(8);
      return;
    }
    // CTAs primarias
    if (t.closest('.btn-primary') ||
        t.closest('.cta-primary') ||
        t.closest('.pdp-checkout-btn') ||
        t.closest('.auth-form__submit')) {
      haptic(10);
    }
  }, true);

  // ═══════════════════════════════════════════════════════════════════
  // 3 + 4. SWIPE-TO-CLOSE (DOWN PARA MODALES, RIGHT PARA DRAWERS)
  // ═══════════════════════════════════════════════════════════════════
  function findScrollAncestor(node, boundary) {
    while (node && node !== boundary && node !== document.body) {
      var oY = '';
      try { oY = getComputedStyle(node).overflowY; } catch (e) {}
      if ((oY === 'auto' || oY === 'scroll') &&
          node.scrollHeight > node.clientHeight) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function installSwipeClose(modal) {
    var target = modal.getCard && modal.getCard();
    if (!target || target._mfSwipeInstalled) return;
    target._mfSwipeInstalled = true;

    var dir = modal.swipe;
    var sx = 0, sy = 0, cx = 0, cy = 0;
    var active = false, dragging = false;

    target.addEventListener('touchstart', function (e) {
      if (!mobile()) return;
      if (!modal.isOpen()) return;
      // No interceptar si el touch empezó en un input/botón de cerrar
      if (e.target.closest('input, textarea, select')) return;
      var t = e.touches[0];
      sx = cx = t.clientX;
      sy = cy = t.clientY;
      active = true;
      dragging = false;
      // Quitar cualquier transición que el CSS tenga
    }, { passive: true });

    target.addEventListener('touchmove', function (e) {
      if (!active) return;
      var t = e.touches[0];
      var dx = t.clientX - sx;
      var dy = t.clientY - sy;
      cx = t.clientX; cy = t.clientY;

      if (!dragging) {
        // Decidir dirección
        if (dir === 'down') {
          // Si el usuario mueve hacia arriba o muy lateral → no es swipe-down
          if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { active = false; return; }
          if (dy < -8) { active = false; return; }
          if (dy > 8 && dy > Math.abs(dx)) {
            // Si hay scroll hacia arriba disponible dentro del modal, no interceptar
            var scroller = findScrollAncestor(e.target, target);
            if (scroller && scroller.scrollTop > 0) { active = false; return; }
            dragging = true;
          } else {
            return;
          }
        } else if (dir === 'right') {
          if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { active = false; return; }
          if (dx < -8) { active = false; return; }
          if (dx > 8 && dx > Math.abs(dy)) {
            // Si hay scroll horizontal interno, no interceptar
            var hs = e.target;
            while (hs && hs !== target) {
              if (hs.scrollWidth > hs.clientWidth) { var ox = getComputedStyle(hs).overflowX; if (ox === 'auto' || ox === 'scroll') { active = false; return; } }
              hs = hs.parentNode;
            }
            dragging = true;
          } else {
            return;
          }
        }
      }

      if (dragging) {
        if (e.cancelable) e.preventDefault();
        target.style.transition = 'none';
        if (dir === 'down') {
          var ty = Math.max(0, dy);
          // Resistencia: drag reducido después de 200px
          if (ty > 200) ty = 200 + (ty - 200) * 0.4;
          target.style.transform = 'translate3d(0, ' + ty + 'px, 0)';
          // Opacidad del backdrop reduce
          var root = modal.getRoot();
          if (root && root !== target) {
            root.style.backgroundColor = 'rgba(0,0,0,' + Math.max(0, 0.55 - ty / 600) + ')';
          }
        } else {
          var tx = Math.max(0, dx);
          if (tx > 200) tx = 200 + (tx - 200) * 0.4;
          target.style.transform = 'translate3d(' + tx + 'px, 0, 0)';
        }
      }
    }, { passive: false });

    target.addEventListener('touchend', function () {
      if (!active) { return; }
      active = false;
      if (!dragging) return;
      dragging = false;

      var shouldClose;
      if (dir === 'down') shouldClose = (cy - sy) > 110;
      else shouldClose = (cx - sx) > 90;

      if (shouldClose) {
        haptic(15);
        target.style.transition = 'transform 0.22s ease-out, opacity 0.22s ease-out';
        target.style.transform = dir === 'down'
          ? 'translate3d(0, 100%, 0)'
          : 'translate3d(100%, 0, 0)';
        setTimeout(function () {
          modal.close();
          // Reset después del close
          setTimeout(function () {
            target.style.transition = '';
            target.style.transform = '';
            var root = modal.getRoot();
            if (root && root !== target) root.style.backgroundColor = '';
          }, 250);
        }, 180);
      } else {
        target.style.transition = 'transform 0.22s ease-out';
        target.style.transform = '';
        var root = modal.getRoot();
        if (root && root !== target) {
          root.style.transition = 'background-color 0.22s ease-out';
          root.style.backgroundColor = '';
        }
        setTimeout(function () {
          target.style.transition = '';
          if (root) root.style.transition = '';
        }, 240);
      }
    }, { passive: true });

    target.addEventListener('touchcancel', function () {
      if (!active) return;
      active = false;
      if (dragging) {
        dragging = false;
        target.style.transition = 'transform 0.2s';
        target.style.transform = '';
      }
    }, { passive: true });
  }

  // Instalar swipe-close en cada modal cuando aparece en el DOM.
  // Los modales inyectados por JS (auth, orders) pueden no existir al cargar.
  var installCheckInterval = setInterval(function () {
    modalDefs.forEach(function (m) {
      var el = m.getCard && m.getCard();
      if (el && !el._mfSwipeInstalled) installSwipeClose(m);
    });
  }, 500);
  // Parar el intervalo luego de 60s si ya se instaló todo
  setTimeout(function () { clearInterval(installCheckInterval); }, 60000);

  // ═══════════════════════════════════════════════════════════════════
  // 5. navigator.share() API
  // ═══════════════════════════════════════════════════════════════════
  window.mfShare = function (url, title) {
    url = url || window.location.href;
    title = title || document.title;
    var data = {
      title: title,
      text: 'Mirá esto en Mala Fama — ' + title,
      url: url
    };
    if (navigator.share) {
      navigator.share(data).then(function () {
        haptic(10);
      }).catch(function () { /* user canceled */ });
      return;
    }
    // Fallback 1: clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        if (window.mfToast) window.mfToast('Link copiado');
        else {
          var t = document.createElement('div');
          t.textContent = 'Link copiado al portapapeles';
          t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#000;color:#fff;padding:10px 18px;border-radius:999px;z-index:2147483647;font:600 13px/1 Arial;letter-spacing:.5px;';
          document.body.appendChild(t);
          setTimeout(function () { t.remove(); }, 1800);
        }
        haptic(10);
      });
      return;
    }
    // Fallback 2: whatsapp
    window.open('https://wa.me/?text=' + encodeURIComponent(url), '_blank');
  };

  // ═══════════════════════════════════════════════════════════════════
  // 6. DOBLE-TAP EN TOP-MARQUEE → SCROLL TO TOP
  // ═══════════════════════════════════════════════════════════════════
  // Solo sobre .top-marquee (zona decorativa sin click destino).
  // El logo se excluye porque un solo tap ya navega al home → conflictúa.
  (function initDoubleTapTop() {
    var lastTap = 0;
    document.addEventListener('touchend', function (e) {
      if (!mobile()) return;
      var t = e.target;
      if (!t || !t.closest) return;
      var inTop = t.closest('.top-marquee');
      if (!inTop) return;

      var now = Date.now();
      if (now - lastTap < 380) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        haptic(12);
        lastTap = 0;
      } else {
        lastTap = now;
      }
    }, true);
  })();

  // ═══════════════════════════════════════════════════════════════════
  // 7. LONG-PRESS EN PRODUCT CARD → QUICK ACTIONS SHEET
  // ═══════════════════════════════════════════════════════════════════
  (function initLongPress() {
    var pressTimer = null;
    var pressedCard = null;
    var startX = 0, startY = 0;
    var suppressNextClick = false; // bloquear el click que viene después del long-press

    function cancel() {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
      pressedCard = null;
    }

    document.addEventListener('touchstart', function (e) {
      if (!mobile()) return;
      var card = e.target.closest && e.target.closest('.product-card');
      if (!card) return;
      // No disparar sobre controles interactivos del card
      if (e.target.closest('.product-card__buy-btn') ||
          e.target.closest('.card-qty-picker') ||
          e.target.closest('button')) return;

      var t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      pressedCard = card;
      pressTimer = setTimeout(function () {
        if (!pressedCard) return;
        haptic([10, 60, 18]); // triple pulso = long-press confirmado
        openQuickActions(pressedCard);
        suppressNextClick = true;
        pressedCard = null;
      }, 550);
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (!pressedCard) return;
      var t = e.touches[0];
      if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) {
        cancel();
      }
    }, { passive: true });

    document.addEventListener('touchend', cancel, { passive: true });
    document.addEventListener('touchcancel', cancel, { passive: true });
    document.addEventListener('scroll', cancel, { passive: true, capture: true });

    // Bloquear el click sintético que sigue al touchend después del long-press
    document.addEventListener('click', function (e) {
      if (suppressNextClick) {
        suppressNextClick = false;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation && e.stopImmediatePropagation();
      }
    }, true);

    // Bloquear menú contextual nativo sobre product cards
    document.addEventListener('contextmenu', function (e) {
      if (!mobile()) return;
      if (e.target.closest && e.target.closest('.product-card')) e.preventDefault();
    });
  })();

  function openQuickActions(card) {
    // Si ya hay un sheet abierto, ignorar
    if (document.querySelector('.mf-quick-sheet')) return;

    var nameEl = card.querySelector('.product-card__name');
    var subEl = card.querySelector('.product-card__subtitle');
    var priceEl = card.querySelector('.product-card__price');
    var imgEl = card.querySelector('.product-card__image, .product-card__image-wrapper img');
    // Las cards guardan la URL en data-href (navegación via JS), no en un <a>
    var dataHref = card.getAttribute('data-href');
    var linkEl = card.querySelector('a[href*="product.html"]') || card.closest('a[href*="product.html"]');

    var name = nameEl ? nameEl.textContent.trim() : '';
    var sub = subEl ? subEl.textContent.trim() : '';
    var price = priceEl ? priceEl.textContent.trim() : '';
    var imgSrc = imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || '') : '';
    var productUrl = dataHref
      ? new URL(dataHref, window.location.href).href
      : (linkEl ? linkEl.href : window.location.href);

    var sheet = document.createElement('div');
    sheet.className = 'mf-quick-sheet';
    sheet.innerHTML =
      '<div class="mf-quick-sheet__backdrop"></div>' +
      '<div class="mf-quick-sheet__panel" role="dialog" aria-label="Acciones rápidas">' +
        '<div class="mf-quick-sheet__handle" aria-hidden="true"></div>' +
        '<div class="mf-quick-sheet__preview">' +
          (imgSrc ? '<img src="' + imgSrc + '" alt="" class="mf-quick-sheet__img">' : '') +
          '<div class="mf-quick-sheet__info">' +
            '<div class="mf-quick-sheet__name">' + escapeHtml(name) + '</div>' +
            (sub ? '<div class="mf-quick-sheet__sub">' + escapeHtml(sub) + '</div>' : '') +
            (price ? '<div class="mf-quick-sheet__price">' + escapeHtml(price) + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="mf-quick-sheet__actions">' +
          '<button class="mf-quick-sheet__btn" data-act="view" type="button">' +
            '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>' +
            '<span>Ver</span>' +
          '</button>' +
          '<button class="mf-quick-sheet__btn" data-act="add" type="button">' +
            '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' +
            '<span>Agregar</span>' +
          '</button>' +
          '<button class="mf-quick-sheet__btn" data-act="share" type="button">' +
            '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>' +
            '<span>Compartir</span>' +
          '</button>' +
        '</div>' +
        '<button class="mf-quick-sheet__cancel" type="button">Cancelar</button>' +
      '</div>';
    document.body.appendChild(sheet);
    void sheet.offsetHeight;
    sheet.classList.add('mf-quick-sheet--open');

    // Back button cierra el sheet — push fake history entry
    var pushedEntry = false;
    try { history.pushState({ mfQuickSheet: true }, ''); pushedEntry = true; } catch (e) {}

    var dismissUI = function () {
      sheet.classList.remove('mf-quick-sheet--open');
      setTimeout(function () { if (sheet.parentNode) sheet.parentNode.removeChild(sheet); }, 280);
    };

    var onBack = function () {
      // Este popstate consumió la fake entry → solo dismiss UI
      window.removeEventListener('popstate', onBack);
      pushedEntry = false;
      dismissUI();
    };
    window.addEventListener('popstate', onBack);

    // close() usado por los botones del sheet: además de dismiss, consumir el history entry
    var close = function () {
      window.removeEventListener('popstate', onBack);
      if (pushedEntry) {
        pushedEntry = false;
        try { history.back(); } catch (e) {} // history.back dispara popstate, pero ya quitamos el listener
      }
      dismissUI();
    };

    // Swipe-down para cerrar el sheet también
    var panel = sheet.querySelector('.mf-quick-sheet__panel');
    var sy = 0, cy = 0, active = false, dragging = false;
    panel.addEventListener('touchstart', function (e) {
      var t = e.touches[0]; sy = cy = t.clientY; active = true; dragging = false;
    }, { passive: true });
    panel.addEventListener('touchmove', function (e) {
      if (!active) return;
      var t = e.touches[0]; var dy = t.clientY - sy; cy = t.clientY;
      if (!dragging && dy > 8) { dragging = true; }
      if (dragging) {
        if (e.cancelable) e.preventDefault();
        var ty = Math.max(0, dy);
        panel.style.transform = 'translate3d(0,' + ty + 'px,0)';
        panel.style.transition = 'none';
      }
    }, { passive: false });
    panel.addEventListener('touchend', function () {
      if (!active) return; active = false;
      if (!dragging) return; dragging = false;
      if (cy - sy > 90) { haptic(12); close(); }
      else {
        panel.style.transition = 'transform 0.22s';
        panel.style.transform = '';
      }
    }, { passive: true });

    sheet.addEventListener('click', function (e) {
      var actBtn = e.target.closest('[data-act]');
      if (actBtn) {
        var a = actBtn.dataset.act;
        haptic(10);
        if (a === 'view') {
          close();
          if (window.mfNavigate) window.mfNavigate(productUrl);
          else window.location.href = productUrl;
        } else if (a === 'add') {
          // Disparar click en el botón real del card
          var btn = card.querySelector('.product-card__buy-btn');
          if (btn) btn.click();
          close();
        } else if (a === 'share') {
          close();
          setTimeout(function () { window.mfShare(productUrl, name); }, 150);
        }
        return;
      }
      if (e.target.classList.contains('mf-quick-sheet__backdrop') ||
          e.target.classList.contains('mf-quick-sheet__cancel')) {
        close();
      }
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

})();
