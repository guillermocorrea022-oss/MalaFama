// ===== Multi-Step Booking Modal =====

var bookingState = {
  location: '',
  guests: 0,
  date: '',
  time: '',
  step: 1
};

function openBookingModal(location) {
  var modal = document.getElementById('bookingModal');
  if (!modal) return;
  // Reset state
  bookingState = { location: '', guests: 0, date: '', time: '', step: 1 };
  // Show step 1, hide all others
  showStep(1);
  updatePills();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  // Fetch capacity for today
  fetchTodayCapacity();
  // Pre-select location if passed
  if (location) {
    selectLocation(location);
  }
}

function closeBookingModal() {
  var modal = document.getElementById('bookingModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}

function showStep(n) {
  bookingState.step = n;
  for (var i = 1; i <= 5; i++) {
    var el = document.getElementById('bkStep' + i);
    if (el) el.classList.toggle('hidden', i !== n);
  }
  var success = document.getElementById('bkStepSuccess');
  if (success) success.classList.toggle('hidden', n !== 6);
}

// ===== Pills =====
function updatePills() {
  var container = document.getElementById('bkPills');
  if (!container) return;
  container.innerHTML = '';
  if (bookingState.location) {
    addPill(container, bookingState.location === 'montevideo' ? 'MONTEVIDEO' : 'PDE', 1);
  }
  if (bookingState.guests > 0) {
    addPill(container, bookingState.guests + ' PERSONA' + (bookingState.guests > 1 ? 'S' : ''), 2);
  }
  if (bookingState.date) {
    addPill(container, formatDateShort(bookingState.date), 3);
  }
  if (bookingState.time) {
    addPill(container, bookingState.time, 4);
  }
}

function addPill(container, text, goToStep) {
  var pill = document.createElement('span');
  pill.className = 'bk-pill';
  pill.textContent = text;
  pill.addEventListener('click', function() { showStep(goToStep); updatePills(); });
  container.appendChild(pill);
}

function formatDateShort(dateStr) {
  var d = new Date(dateStr + 'T12:00:00');
  var days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  var months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return days[d.getDay()] + '. ' + d.getDate() + ', ' + months[d.getMonth()] + '.';
}

function formatDateFull(dateStr) {
  var d = new Date(dateStr + 'T12:00:00');
  var days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return days[d.getDay()] + ' ' + d.getDate() + ' de ' + months[d.getMonth()];
}

function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ===== Step 1: Location =====
function fetchTodayCapacity() {
  var today = todayStr();
  fetchCapacity('montevideo', today, 'capMdeo');
  fetchCapacity('punta del este', today, 'capPde');
}

function fetchCapacity(location, date, elementId) {
  var el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = 'Cargando...';
  fetch('/api/reservas/capacity?location=' + encodeURIComponent(location) + '&date=' + date)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        el.textContent = 'Cupos disponibles hoy: ' + data.available;
      } else {
        el.textContent = '';
      }
    })
    .catch(function() { el.textContent = ''; });
}

function selectLocation(loc) {
  bookingState.location = loc;
  updatePills();
  showStep(2);
}

// ===== Step 2: Guests =====
function selectGuests(n) {
  bookingState.guests = n;
  updatePills();
  // Highlight active button
  document.querySelectorAll('.bk-guest-btn').forEach(function(btn) {
    btn.classList.toggle('active', parseInt(btn.dataset.guests) === n && n <= 4);
  });
  if (n <= 4) {
    document.getElementById('guestNum').textContent = 5;
    var confirmBtn = document.getElementById('confirmGuestsBtn');
    if (confirmBtn) confirmBtn.classList.add('hidden');
  }
  showStep(3);
  buildDatePicker();
}

function updateCustomGuests(n) {
  if (n < 5) n = 5;
  if (n > 50) n = 50;
  document.getElementById('guestNum').textContent = n;
  // Deselect quick buttons
  document.querySelectorAll('.bk-guest-btn').forEach(function(btn) { btn.classList.remove('active'); });
  // Show confirm button
  var confirmBtn = document.getElementById('confirmGuestsBtn');
  if (confirmBtn) confirmBtn.classList.remove('hidden');
}

function confirmCustomGuests() {
  var n = parseInt(document.getElementById('guestNum').textContent);
  bookingState.guests = n;
  updatePills();
  var confirmBtn = document.getElementById('confirmGuestsBtn');
  if (confirmBtn) confirmBtn.classList.add('hidden');
  showStep(3);
  buildDatePicker();
}

// ===== Step 3: Date Picker =====
function buildDatePicker() {
  var container = document.getElementById('bkDatesScroll');
  if (!container) return;
  container.innerHTML = '';

  var today = new Date();
  var dayNames = ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'];
  var monthNames = ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'];

  for (var i = 0; i < 14; i++) {
    var d = new Date(today);
    d.setDate(d.getDate() + i);
    var dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var isMonday = d.getDay() === 1;
    var isToday = i === 0;

    var item = document.createElement('div');
    item.className = 'bk-date-item';
    if (isMonday) item.className += ' disabled';
    if (isToday) item.className += ' today';
    item.dataset.date = dateStr;

    item.innerHTML =
      '<span class="bk-date-item__day">' + (isToday ? 'Hoy' : dayNames[d.getDay()]) + '</span>' +
      '<span class="bk-date-item__num">' + d.getDate() + '</span>' +
      '<span class="bk-date-item__month">' + monthNames[d.getMonth()] + '</span>';

    if (!isMonday) {
      item.addEventListener('click', (function(ds) {
        return function() { selectDate(ds); };
      })(dateStr));
    }

    container.appendChild(item);
  }
}

function selectDate(dateStr) {
  bookingState.date = dateStr;
  // Highlight active
  document.querySelectorAll('.bk-date-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.date === dateStr);
  });
  updatePills();
  showStep(4);
  buildTimeSlots();
}

// ===== Step 4: Time Slots =====
function buildTimeSlots() {
  var container = document.getElementById('bkSlots');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">Cargando horarios...</div>';

  // Update nav
  var d = new Date(bookingState.date + 'T12:00:00');
  document.getElementById('bkCurrentDay').textContent = formatDateShort(bookingState.date);

  var prev = new Date(d); prev.setDate(prev.getDate() - 1);
  var next = new Date(d); next.setDate(next.getDate() + 1);
  document.getElementById('bkPrevDayDate').textContent = formatDateShort(dateToStr(prev));
  document.getElementById('bkNextDayDate').textContent = formatDateShort(dateToStr(next));

  // Fetch booked slots
  fetch('/api/reservas/capacity?location=' + encodeURIComponent(bookingState.location) + '&date=' + bookingState.date)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      container.innerHTML = '';
      if (data.success && data.available <= 0) {
        container.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">No hay cupos disponibles para esta fecha</div>';
        return;
      }
      // Generate time slots from 20:00 to 23:00 every 15 min
      var slots = [];
      for (var h = 20; h <= 23; h++) {
        for (var m = 0; m < 60; m += 15) {
          if (h === 23 && m > 0) break;
          slots.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
        }
      }
      slots.forEach(function(time) {
        var btn = document.createElement('button');
        btn.className = 'bk-slot';
        btn.textContent = time;
        btn.addEventListener('click', function() { selectTime(time); });
        container.appendChild(btn);
      });
      // Scroll modal to show slots
      var modalContent = document.querySelector('.booking-modal-content');
      if (modalContent) modalContent.scrollTop = 0;
    })
    .catch(function() {
      // Even on error, show the time slots so the user can still select
      container.innerHTML = '';
      var slots = [];
      for (var h = 20; h <= 23; h++) {
        for (var m = 0; m < 60; m += 15) {
          if (h === 23 && m > 0) break;
          slots.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
        }
      }
      slots.forEach(function(time) {
        var btn = document.createElement('button');
        btn.className = 'bk-slot';
        btn.textContent = time;
        btn.addEventListener('click', function() { selectTime(time); });
        container.appendChild(btn);
      });
      var modalContent = document.querySelector('.booking-modal-content');
      if (modalContent) modalContent.scrollTop = 0;
    });
}

function dateToStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function selectTime(time) {
  bookingState.time = time;
  updatePills();
  showStep(5);
  buildConfirmation();
}

// ===== Step 5: Confirmation =====
function buildConfirmation() {
  var container = document.getElementById('bkConfirmContent');
  if (!container) return;

  // Check if user is logged in
  var isLoggedIn = !!window.__tcbUser;

  var locationLabel = bookingState.location === 'montevideo' ? 'Montevideo' : 'Punta del Este';
  var summary =
    '<div class="bk-confirm-summary">' +
      '<div class="bk-confirm-summary__row"><span class="bk-confirm-summary__label">Local</span><span class="bk-confirm-summary__value">' + locationLabel + '</span></div>' +
      '<div class="bk-confirm-summary__row"><span class="bk-confirm-summary__label">Comensales</span><span class="bk-confirm-summary__value">' + bookingState.guests + '</span></div>' +
      '<div class="bk-confirm-summary__row"><span class="bk-confirm-summary__label">Fecha</span><span class="bk-confirm-summary__value">' + formatDateFull(bookingState.date) + '</span></div>' +
      '<div class="bk-confirm-summary__row"><span class="bk-confirm-summary__label">Hora</span><span class="bk-confirm-summary__value">' + bookingState.time + '</span></div>' +
    '</div>';

  if (isLoggedIn) {
    container.innerHTML = summary +
      '<button class="bk-confirm-btn" id="bkConfirmBtn">CONFIRMAR RESERVA</button>';
    document.getElementById('bkConfirmBtn').addEventListener('click', submitReservation);
  } else {
    container.innerHTML = summary +
      '<p class="bk-login-prompt">Iniciá sesión para confirmar tu reserva</p>' +
      '<button class="bk-login-btn" id="bkLoginBtn">INICIAR SESIÓN</button>';
    document.getElementById('bkLoginBtn').addEventListener('click', function() {
      // Use the existing auth modal
      if (typeof openAuthModal === 'function') {
        openAuthModal('login');
        // Listen for login success to auto-confirm
        window._bookingPendingConfirm = true;
      }
    });
  }
}

function submitReservation() {
  var btn = document.getElementById('bkConfirmBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'PROCESANDO...'; }

  fetch('/api/reserve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: bookingState.location,
      guests: bookingState.guests,
      date: bookingState.date,
      time: bookingState.time
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.success) {
      var locationLabel = bookingState.location === 'montevideo' ? 'Montevideo' : 'Punta del Este';
      document.getElementById('bkSuccessText').innerHTML =
        '<strong>' + locationLabel + '</strong><br>' +
        formatDateFull(bookingState.date) + ' a las ' + bookingState.time + '<br>' +
        bookingState.guests + ' persona' + (bookingState.guests > 1 ? 's' : '') + '<br><br>' +
        'Código: <strong>' + (data.bookingId || '') + '</strong>';
      showStep(6);
      updatePills();
    } else {
      if (typeof showToast === 'function') {
        showToast(data.error || 'Error al reservar', 'error');
      } else {
        alert(data.error || 'Error al reservar');
      }
      if (btn) { btn.disabled = false; btn.textContent = 'CONFIRMAR RESERVA'; }
    }
  })
  .catch(function() {
    if (typeof showToast === 'function') {
      showToast('Error de conexión', 'error');
    } else {
      alert('Error de conexión');
    }
    if (btn) { btn.disabled = false; btn.textContent = 'CONFIRMAR RESERVA'; }
  });
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', function () {

  // Auto-open booking modal if URL has #reservas
  if (window.location.hash === '#reservas') {
    setTimeout(function() { openBookingModal(); }, 100);
  }

  // Close modal
  var closeBtn = document.getElementById('closeBookingBtn');
  var modal = document.getElementById('bookingModal');
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', closeBookingModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeBookingModal();
    });
  }

  // Step 1: Location buttons
  document.querySelectorAll('.bk-location-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      selectLocation(btn.dataset.location);
    });
  });

  // Step 2: Guest quick buttons
  document.querySelectorAll('.bk-guest-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      selectGuests(parseInt(btn.dataset.guests));
    });
  });

  // Step 2: Custom guest +/-
  var guestMinus = document.getElementById('guestMinus');
  var guestPlus = document.getElementById('guestPlus');
  var guestNum = document.getElementById('guestNum');
  if (guestMinus) guestMinus.addEventListener('click', function() {
    var n = parseInt(guestNum.textContent) - 1;
    updateCustomGuests(n);
  });
  if (guestPlus) guestPlus.addEventListener('click', function() {
    var n = parseInt(guestNum.textContent) + 1;
    updateCustomGuests(n);
  });
  // Clicking the number confirms custom guest count
  if (guestNum) guestNum.addEventListener('click', confirmCustomGuests);

  // Step 4: Prev/Next day navigation
  var prevDay = document.getElementById('bkPrevDay');
  var nextDay = document.getElementById('bkNextDay');
  if (prevDay) prevDay.addEventListener('click', function() {
    var d = new Date(bookingState.date + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    var today = new Date(); today.setHours(0,0,0,0);
    if (d >= today && d.getDay() !== 1) {
      bookingState.date = dateToStr(d);
      updatePills();
      buildTimeSlots();
    }
  });
  if (nextDay) nextDay.addEventListener('click', function() {
    var d = new Date(bookingState.date + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    // Skip Monday
    if (d.getDay() === 1) d.setDate(d.getDate() + 1);
    bookingState.date = dateToStr(d);
    updatePills();
    buildTimeSlots();
  });

  // Back buttons
  var backs = [
    { id: 'bkBack2', step: 1 },
    { id: 'bkBack3', step: 2 },
    { id: 'bkBack4', step: 3 },
    { id: 'bkBack5', step: 4 }
  ];
  backs.forEach(function(b) {
    var el = document.getElementById(b.id);
    if (el) el.addEventListener('click', function() { showStep(b.step); updatePills(); });
  });

  // Listen for auth login success to auto-confirm pending reservation
  // Poll for __tcbUser after login modal opens
  setInterval(function() {
    if (window._bookingPendingConfirm && window.__tcbUser) {
      window._bookingPendingConfirm = false;
      setTimeout(function() { buildConfirmation(); }, 300);
    }
  }, 500);

  // ===== Auto-scrolling Gallery =====
  var foodGallery = document.getElementById('foodGallery');
  if (foodGallery) {
    var scrollInterval;
    var startAutoScroll = function () {
      scrollInterval = setInterval(function () {
        var card = foodGallery.querySelector('.loc-gallery__card');
        if (!card) return;
        var cardWidth = card.offsetWidth + 20;
        if (foodGallery.scrollLeft + foodGallery.clientWidth >= foodGallery.scrollWidth - 10) {
          foodGallery.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          foodGallery.scrollBy({ left: cardWidth, behavior: 'smooth' });
        }
      }, 3000);
    };
    startAutoScroll();
    foodGallery.addEventListener('mouseenter', function () { clearInterval(scrollInterval); });
    foodGallery.addEventListener('mouseleave', startAutoScroll);
    foodGallery.addEventListener('touchstart', function () { clearInterval(scrollInterval); }, { passive: true });
    foodGallery.addEventListener('touchend', startAutoScroll, { passive: true });
  }

  // ===== Scroll Reveal Animations =====
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length > 0) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, { root: null, rootMargin: '0px 0px -50px 0px', threshold: 0.1 });
    reveals.forEach(function (reveal) { revealObserver.observe(reveal); });
  }

});
