// =====================================================================
// LOADER.JS — Pantalla de carga entre páginas
// =====================================================================
// Se carga PRIMERO en el <head> de cada HTML (antes que cualquier otro
// script). Inyecta un loader full-screen con el logo de malafama sobre
// fondo negro que aparece durante las transiciones de página.
//
// Flujo:
// 1. Al cargar el script (head sincrónico): inyecta el DOM + CSS inline
//    del loader en estado visible. Así evita el FOUC (flash of unstyled
//    content) mientras el HTML + CSS principal terminan de parsear.
// 2. Cuando window.load dispara: fade out del loader (opacity + remove).
// 3. Cuando el usuario clickea un link interno (.html del mismo dominio):
//    muestra el loader, espera ~200ms, y navega. Esto garantiza que el
//    loader sea visible durante la transición entre páginas.
// 4. Expone window.mfNavigate(url) para navegación programática
//    (goToCheckout, product cards, etc.).
// =====================================================================

(function () {
  'use strict';

  // ─── 1. Inyectar CSS inline inmediatamente (antes de que cargue styles.css) ───
  var style = document.createElement('style');
  style.id = 'mf-loader-inline-style';
  style.textContent = [
    '.mf-loader{',
    '  position:fixed;inset:0;z-index:2147483647;',
    '  background:#000;',
    '  display:flex;align-items:center;justify-content:center;',
    '  transform:translate3d(0,0,0);',
    '  transition:transform 0.5s cubic-bezier(0.4,0,0.2,1);',
    '  will-change:transform;',
    '  backface-visibility:hidden;',
    '}',
    /* Estado inicial al mostrar: fuera de pantalla por abajo */
    '.mf-loader--down{transform:translate3d(0,100%,0);}',
    /* Estado al ocultar: fuera de pantalla por arriba */
    '.mf-loader--up{transform:translate3d(0,-100%,0);}',
    '.mf-loader__logo{',
    '  width:220px;max-width:40vw;height:auto;',
    '  filter:none;',
    '}',
    '@media (prefers-reduced-motion:reduce){',
    '  .mf-loader{transition:transform 0.2s linear;}',
    '}'
  ].join('');
  // Insertar al principio del <head> para máxima prioridad
  (document.head || document.documentElement).appendChild(style);

  // ─── 2. Crear el loader (helper). startClass = 'down' para entrada, '' para visible directo ───
  function createLoader(startClass) {
    if (document.getElementById('mfLoader')) {
      return document.getElementById('mfLoader');
    }
    var loader = document.createElement('div');
    loader.id = 'mfLoader';
    loader.className = 'mf-loader' + (startClass ? ' ' + startClass : '');
    loader.setAttribute('aria-hidden', 'true');
    loader.innerHTML =
      '<img src="img/logo-historia/logo.carga.png" alt="" class="mf-loader__logo">';
    var img = loader.querySelector('img');
    img.addEventListener('error', function () {
      loader.innerHTML = '<div style="color:#fff;font-family:Arial,sans-serif;' +
        'font-size:24px;font-weight:900;letter-spacing:0.1em;">MALA FAMA</div>';
    });
    (document.body || document.documentElement).appendChild(loader);
    return loader;
  }

  // Al cargar la página, mostramos el loader visible (translateY 0) inmediatamente
  // para tapar el FOUC. Después se desliza hacia arriba en hideLoader.
  if (document.body) {
    createLoader('');
  } else {
    document.addEventListener('DOMContentLoaded', function () { createLoader(''); });
  }

  // ─── 3. Ocultar = slide hacia arriba ───
  function hideLoader() {
    var loader = document.getElementById('mfLoader');
    if (!loader) return;
    loader.classList.remove('mf-loader--down');
    loader.classList.add('mf-loader--up');
    setTimeout(function () {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
      // Liberar animaciones de hero DESPUÉS de que el loader desaparece,
      // así el usuario las ve completas y no tapadas.
      document.body.classList.add('mf-page-ready');
      window.dispatchEvent(new CustomEvent('mf:page-ready'));
    }, 550);
  }

  // ─── Mostrar = entra deslizando desde abajo ───
  // Trick clave: inyectar el loader YA en posición --down (fuera de pantalla por abajo).
  // Forzar reflow para que el navegador registre ese estado inicial.
  // Recién entonces quitar la clase → transición fluida de translateY(100%) a 0.
  function showLoader() {
    // Si ya existe (ej: en home apenas se hizo hide), removerlo y crearlo de cero
    var existing = document.getElementById('mfLoader');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    var loader = createLoader('mf-loader--down');
    // Forzar reflow para que el estado --down se registre como "frame inicial"
    void loader.offsetHeight;
    // Próximo frame: quitar la clase → transition de 100% → 0 (slide-up suave)
    requestAnimationFrame(function () {
      loader.classList.remove('mf-loader--down');
    });
  }

  // Ocultar cuando la página termine de cargar (pequeño delay para evitar flash)
  if (document.readyState === 'complete') {
    setTimeout(hideLoader, 150);
  } else {
    window.addEventListener('load', function () {
      setTimeout(hideLoader, 150);
    });
  }

  // ─── 4. Interceptar clicks en links internos ───
  // Lista de archivos HTML internos del sitio
  var INTERNAL_PAGES = [
    'index.html', 'product.html', 'checkout.html', 'pack.html',
    'merch.html', 'nosotros.html', 'restaurant.html'
  ];

  function isInternalHTMLLink(href) {
    if (!href) return false;
    // Ignorar anchors, mailto, tel, javascript, hashes, URLs externas
    if (href.indexOf('#') === 0) return false;
    if (href.indexOf('mailto:') === 0) return false;
    if (href.indexOf('tel:') === 0) return false;
    if (href.indexOf('javascript:') === 0) return false;
    // URLs absolutas a otro dominio
    if (/^https?:\/\//.test(href)) {
      try {
        var u = new URL(href);
        if (u.hostname !== window.location.hostname) return false;
        href = u.pathname + u.search;
      } catch (e) { return false; }
    }
    // Extraer el nombre del archivo
    var pathOnly = href.split('?')[0].split('#')[0];
    var fileName = pathOnly.split('/').pop();
    if (!fileName) return false;
    return INTERNAL_PAGES.indexOf(fileName) !== -1;
  }

  document.addEventListener('click', function (e) {
    // Ignorar si es click con modificadores (nueva pestaña, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.button !== 0) return; // solo click izquierdo

    // Buscar el <a> más cercano al target
    var target = e.target;
    while (target && target !== document.body) {
      if (target.tagName === 'A') break;
      target = target.parentNode;
    }
    if (!target || target.tagName !== 'A') return;

    var href = target.getAttribute('href');
    if (!href) return;

    // Ignorar links con target="_blank" o download
    if (target.target === '_blank') return;
    if (target.hasAttribute('download')) return;

    if (!isInternalHTMLLink(href)) return;

    // Es un link interno a .html: interceptar y mostrar loader
    e.preventDefault();
    showLoader();
    setTimeout(function () {
      window.location.href = href;
    }, 480);
  }, true); // capture phase para que corra antes que otros handlers

  // ─── 5. Exponer API pública ───
  window.mfLoader = {
    show: showLoader,
    hide: hideLoader
  };

  // Navegación programática que muestra el loader antes de navegar
  window.mfNavigate = function (url) {
    showLoader();
    setTimeout(function () {
      window.location.href = url;
    }, 480);
  };

  // ─── 6. Gesto Swipe-Back (estilo iOS) ───
  // Arrastrar desde el borde izquierdo hacia la derecha → history.back()
  // Feedback visual: la página se desliza hacia la derecha siguiendo el dedo.
  // Solo en mobile + si hay página anterior en el history.
  (function initSwipeBack() {
    var EDGE_WIDTH = 28;       // px desde el borde izquierdo para iniciar el gesto
    var TRIGGER_RATIO = 0.30;  // debe arrastrar al menos 30% del ancho para disparar
    var MIN_VELOCITY = 0.35;   // px/ms para disparar por velocidad (flick corto)

    var startX = 0, startY = 0, startT = 0;
    var currentX = 0;
    var active = false;
    var dragging = false;   // pasó del umbral inicial → ya sabemos que es swipe-back
    var finished = false;

    function isTouchMobile() {
      return ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
             window.matchMedia('(max-width: 900px)').matches;
    }

    // Crear overlay una sola vez — velo oscuro que se va aclarando a medida que sale la página
    var overlay = null;
    function ensureOverlay() {
      if (overlay) return overlay;
      overlay = document.createElement('div');
      overlay.id = 'mfSwipeOverlay';
      overlay.style.cssText = [
        'position:fixed','inset:0','z-index:2147483646',
        'background:#000','opacity:0','pointer-events:none',
        'will-change:opacity'
      ].join(';');
      document.body.appendChild(overlay);
      return overlay;
    }

    function setTransform(x) {
      var root = document.documentElement;
      root.style.transform = x > 0 ? 'translate3d(' + x + 'px,0,0)' : '';
      root.style.transition = 'none';
      // Velo: a medida que la página sale, el fondo queda más oscuro (siguiente página visible)
      if (overlay) {
        var w = window.innerWidth || 1;
        overlay.style.opacity = String(Math.min(0.35, (x / w) * 0.45));
      }
    }

    function resetTransform(animated) {
      var root = document.documentElement;
      root.style.transition = animated ? 'transform 0.22s ease-out' : 'none';
      root.style.transform = '';
      if (overlay) {
        overlay.style.transition = animated ? 'opacity 0.22s ease-out' : 'none';
        overlay.style.opacity = '0';
      }
      setTimeout(function () {
        root.style.transition = '';
        root.style.transform = '';
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
          overlay = null;
        }
      }, animated ? 240 : 0);
    }

    function completeAndGoBack() {
      if (finished) return;
      finished = true;
      var root = document.documentElement;
      root.style.transition = 'transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1)';
      root.style.transform = 'translate3d(100%, 0, 0)';
      if (overlay) {
        overlay.style.transition = 'opacity 0.28s ease-out';
        overlay.style.opacity = '0';
      }
      // Pequeño delay para que se vea la animación antes de navegar
      setTimeout(function () {
        window.history.back();
        // Fallback: si por alguna razón history.back no navegó (bfcache bugs),
        // resetear el transform tras 600ms
        setTimeout(function () {
          resetTransform(false);
          finished = false;
        }, 600);
      }, 180);
    }

    function onStart(e) {
      if (!isTouchMobile()) return;
      if (window.history.length <= 1) return; // no hay atrás
      if (document.getElementById('mfLoader')) return; // loader visible → ignorar
      var t = e.touches ? e.touches[0] : e;
      if (t.clientX > EDGE_WIDTH) return;
      startX = t.clientX;
      startY = t.clientY;
      startT = Date.now();
      currentX = startX;
      active = true;
      dragging = false;
      finished = false;
    }

    function onMove(e) {
      if (!active) return;
      var t = e.touches ? e.touches[0] : e;
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;

      // Si aún no estamos arrastrando, decidir si este gesto es swipe-back o scroll
      if (!dragging) {
        if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) {
          // Movimiento predominante vertical → cancelar (dejar que scrollee)
          active = false;
          return;
        }
        if (dx < 8) return; // aún no nos comprometemos
        dragging = true;
        ensureOverlay();
      }

      // Ya estamos arrastrando: prevenir scroll horizontal nativo y mover la página
      if (e.cancelable) e.preventDefault();
      var x = Math.max(0, dx);
      currentX = t.clientX;
      setTransform(x);
    }

    function onEnd() {
      if (!active) return;
      var dx = currentX - startX;
      var dt = Date.now() - startT;
      var velocity = dt > 0 ? dx / dt : 0;
      var threshold = window.innerWidth * TRIGGER_RATIO;
      active = false;

      if (!dragging) return; // nunca pasamos del umbral, nada que resetear

      if (dx > threshold || velocity > MIN_VELOCITY) {
        completeAndGoBack();
      } else {
        resetTransform(true);
      }
      dragging = false;
    }

    function onCancel() {
      if (!active) return;
      active = false;
      if (dragging) resetTransform(true);
      dragging = false;
    }

    // passive:false en touchmove para poder llamar preventDefault
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onCancel, { passive: true });
  })();

})();
