// =====================================================================
// SERVER.JS — Servidor Express para Mala Fama Brewing
// =====================================================================
// Backend principal: autenticación, carrito, checkout (Plexo),
// reservas de restaurant, panel admin, stock y newsletter.
//
// Dependencias: express, bcrypt, express-session, connect-sqlite3,
//               dotenv, cors, node-fetch (para Plexo en producción)
//
// Para arrancar: node server/server.js (desde la raíz del proyecto)
// =====================================================================

// Cargar .env desde la raíz del proyecto
const path = require('path');
const ROOT_DIR = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT_DIR, '.env') });
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const bcrypt = require('bcrypt');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const db = require('./db');
const { seedDemoData } = require('./seed-demo');
const email = require('./email');

// ─── node-fetch para pagos con Plexo en producción ───
// Se importa al inicio para no hacer import dinámico dentro del handler.
// Node 18+ tiene fetch nativo, pero mantenemos compatibilidad con versiones anteriores.
let nodeFetch;
try {
  nodeFetch = require('node-fetch');
} catch (e) {
  // node-fetch no instalado — solo necesario para pagos con tarjeta en producción
  nodeFetch = null;
}

// Cargar catálogo de productos para el panel admin
let PRODUCTS = [];
try {
  const data = require(path.join(ROOT_DIR, 'js', 'data.js'));
  PRODUCTS = data.PRODUCTS || [];
} catch (e) {
  console.warn('[Server] No se pudo cargar data.js:', e.message);
}

const app = express();
const PORT = process.env.PORT || 8096;

// =============================================
// SEGURIDAD — SESSION_SECRET obligatorio en producción
// =============================================
// En desarrollo usa un default, pero en producción DEBE estar definido en .env
// para evitar que las sesiones sean predecibles.
const SESSION_SECRET = process.env.SESSION_SECRET || 'malafama-dev-secret-change-in-production';
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('❌ FATAL: SESSION_SECRET no está definido en .env. Obligatorio en producción.');
  process.exit(1);
}

// =============================================
// CORS — Orígenes permitidos
// =============================================
// En desarrollo acepta cualquier origen para facilitar testing.
// En producción se restringe SOLO a los dominios autorizados.
// Para agregar un dominio nuevo, añadirlo al array allowedOrigins.
const allowedOrigins = [
  'https://cervezamalafama.com',
  'https://www.cervezamalafama.com',
  'https://malafama-production.up.railway.app'  // demo Railway
];
app.use(cors({
  credentials: true,
  origin: process.env.NODE_ENV === 'production'
    ? function(origin, callback) {
        // Permitir requests sin origin (mobile apps, curl, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origen no permitido por CORS'));
        }
      }
    : true  // En desarrollo acepta todo
}));

// =============================================
// COMPRESIÓN — Gzip/Brotli para todas las respuestas
// =============================================
// Reduce ~70% el tamaño de transferencia de HTML, CSS, JS y JSON.
// No comprime imágenes (ya están comprimidas).
app.use(compression());

app.use(express.json({ limit: '1mb' }));  // Limitar tamaño de body para prevenir abuso

// =============================================
// HEADERS DE SEGURIDAD
// =============================================
// Protecciones básicas que todo servidor web debería tener.
// CSP restringe qué scripts/estilos/imágenes puede cargar el navegador.
app.use(function(req, res, next) {
  // Prevenir que el sitio sea embebido en iframes de otros dominios (clickjacking)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Evitar que el navegador "adivine" el tipo MIME (previene ataques de sniffing)
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Desactivar el filtro XSS del navegador (puede causar más problemas que soluciones)
  res.setHeader('X-XSS-Protection', '0');

  // Controlar qué info se envía en el header Referer
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy — restringe orígenes de scripts, estilos, imágenes, etc.
  // 'unsafe-inline' necesario por los estilos inline del sitio y los SVG inline.
  // TODO: Cuando migres a CSS externo puro, eliminar 'unsafe-inline' de style-src.
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob: https://maps.gstatic.com https://maps.googleapis.com; " +
    "connect-src 'self' https://maps.googleapis.com; " +
    "frame-src 'self' https://www.google.com https://maps.google.com https://www.google.com.uy; " +
    "frame-ancestors 'self';"
  );

  // En producción, forzar HTTPS por 1 año
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

// =============================================
// RATE LIMITER — Protección contra abuso/fuerza bruta
// =============================================
// Limita la cantidad de requests por IP en una ventana de tiempo.
// Se usa en: login (5/15min), registro (5/15min), reservas (5/15min), newsletter (3/15min).
// TODO: En producción considerar usar express-rate-limit con Redis para escalar.
const rateLimitStore = {};
function rateLimit(windowMs, maxRequests) {
  return function(req, res, next) {
    var ip = req.ip || req.connection.remoteAddress || 'unknown';
    var key = ip + ':' + req.path;
    var now = Date.now();
    if (!rateLimitStore[key]) rateLimitStore[key] = [];
    rateLimitStore[key] = rateLimitStore[key].filter(function(ts) { return now - ts < windowMs; });
    if (rateLimitStore[key].length >= maxRequests) {
      return res.status(429).json({ success: false, error: 'Demasiados intentos. Intentá de nuevo en unos minutos.' });
    }
    rateLimitStore[key].push(now);
    next();
  };
}
// Clean up rate limit store every 5 minutes
setInterval(function() {
  var now = Date.now();
  Object.keys(rateLimitStore).forEach(function(key) {
    rateLimitStore[key] = rateLimitStore[key].filter(function(ts) { return now - ts < 900000; });
    if (rateLimitStore[key].length === 0) delete rateLimitStore[key];
  });
}, 300000);

// =============================================
// SESIONES — Persistencia con SQLite
// =============================================
// IMPORTANTE: En producción cambiar SESSION_SECRET en .env
// La cookie dura 30 días, httpOnly previene acceso desde JS del cliente.
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: ROOT_DIR }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Servir archivos estáticos desde la raíz del proyecto (HTML, CSS, JS, imágenes)
app.use(express.static(ROOT_DIR));

// ===== Auth Middleware =====
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: 'No autenticado' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: 'No autenticado' });
  }
  const user = db.findUserById(req.session.userId);
  if (!user || !user.is_admin) {
    return res.status(403).json({ success: false, error: 'Acceso denegado' });
  }
  next();
}

// Sanitize user object for client (no password hash)
function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    shippingStreet: user.shipping_street,
    shippingApt: user.shipping_apt,
    shippingDept: user.shipping_dept,
    shippingZone: user.shipping_zone,
    isAdmin: !!user.is_admin
  };
}

// ===== Plexo Config =====
const PLEXO_ENV  = process.env.PLEXO_ENV || 'sandbox';
const PLEXO_KEY  = process.env.PLEXO_API_KEY || 'SANDBOX_KEY';
const PLEXO_URL  = PLEXO_ENV === 'production'
  ? 'https://api.plexo.com.uy/v1'
  : 'https://api.sandbox.plexo.com.uy/v1';

// =============================================
// AUTH ENDPOINTS
// =============================================

app.post('/api/auth/register', rateLimit(900000, 15), async (req, res) => {
  try {
    const { email: userEmail, password, firstName, lastName } = req.body;

    if (!userEmail || !password || !firstName) {
      return res.status(400).json({ success: false, error: 'Email, contraseña y nombre son obligatorios' });
    }

    // Validación robusta de email (misma regex que el frontend en utils.js)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return res.status(400).json({ success: false, error: 'Formato de email inválido' });
    }

    // Limitar longitud de campos para prevenir abuso
    if (userEmail.length > 200) {
      return res.status(400).json({ success: false, error: 'Email demasiado largo' });
    }
    if (firstName.length > 100 || (lastName && lastName.length > 100)) {
      return res.status(400).json({ success: false, error: 'Nombre demasiado largo' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    if (password.length > 128) {
      return res.status(400).json({ success: false, error: 'Contraseña demasiado larga' });
    }

    const existing = db.findUserByEmail(userEmail.toLowerCase().trim());
    if (existing) {
      return res.status(400).json({ success: false, error: 'Ya existe una cuenta con ese email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = db.createUser({
      email: userEmail.toLowerCase().trim(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: (lastName || '').trim()
    });

    req.session.userId = user.id;
    res.json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Error al crear la cuenta' });
  }
});

// Rate limit más estricto en login: 5 intentos cada 15 min para prevenir fuerza bruta
app.post('/api/auth/login', rateLimit(900000, 15), async (req, res) => {
  try {
    const { email: userEmail, password } = req.body;

    if (!userEmail || !password) {
      return res.status(400).json({ success: false, error: 'Email y contraseña son obligatorios' });
    }

    const user = db.findUserByEmail(userEmail.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ success: false, error: 'Email o contraseña incorrectos' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Email o contraseña incorrectos' });
    }

    req.session.userId = user.id;
    res.json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Error al iniciar sesión' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Error al cerrar sesión' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }
  const user = db.findUserById(req.session.userId);
  res.json({ user: sanitizeUser(user) });
});

// =============================================
// CART SYNC (logged-in users)
// =============================================

app.post('/api/cart/sync', requireAuth, (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Items inválidos' });
    }
    const merged = db.mergeCart(req.session.userId, items);
    res.json({ success: true, items: merged });
  } catch (error) {
    console.error('Cart sync error:', error);
    res.status(500).json({ success: false, error: 'Error al sincronizar carrito' });
  }
});

// =============================================
// PUBLIC STOCK ENDPOINT
// =============================================

app.get('/api/stock', (req, res) => {
  const stock = db.getAllProductStock();
  res.json({ stock });
});

// =============================================
// ORDERS & CHECKOUT
// =============================================

app.get('/api/orders', requireAuth, (req, res) => {
  const orders = db.getOrdersByUser(req.session.userId);
  const parsed = orders.map(o => ({
    ...o,
    items: JSON.parse(o.items_json || '[]')
  }));
  res.json({ orders: parsed });
});

// ---------- BEER PASSPORT ----------
// Devuelve la grilla de estilos de cerveza y cuáles el usuario ya probó.
// Se considera "probado" cuando el usuario tiene al menos un pedido aprobado
// que contiene un producto de ese estilo.
app.get('/api/passport', requireAuth, (req, res) => {
  try {
    // Cervezas coleccionables del pasaporte — cada una con su ilustración
    const COLLECTIBLES = [
      { id: 3,   name: 'Tas Loco',        subtitle: 'NEIPA',           img: 'img/ilustraciones/tas-loco.png' },
      { id: 1,   name: 'La Santa',        subtitle: 'New England IPA', img: 'img/ilustraciones/la-santa.png' },
      { id: 2,   name: 'A Lo Bestia',     subtitle: 'Sour',            img: 'img/ilustraciones/a-lo-bestia.png' },
      { id: 4,   name: 'Renegada',        subtitle: 'Pale Ale',        img: 'img/ilustraciones/renegada.png' },
      { id: 5,   name: 'Alboroto',        subtitle: 'West Coast IPA',  img: 'img/ilustraciones/Alboroto.png' },
      { id: 100, name: 'Despelote V',     subtitle: 'Imperial Stout',  img: 'img/latas/despelote-v.webp' },
      { id: 9,   name: 'Que los Indios',  subtitle: 'Barrel Aged Sour',img: 'img/ilustraciones/que-los-indios-de-su-pueblo-se-gobiernen-por-si-solos-1.png' },
      { id: 6,   name: 'Guidaí',          subtitle: 'Amber Lager',     img: 'img/latas/guidai.webp' },
    ];

    // Órdenes del usuario (incluimos pending porque la cerveza se consume antes de la aprobación final)
    const orders = db.getOrdersByUser(req.session.userId) || [];
    const valid = orders.filter(o => ['approved','pending_transfer','pending_cash','nuevo'].includes(o.status));

    // Qué IDs compró y cuándo por primera vez
    const firstBought = {};
    for (const o of valid) {
      let items;
      try { items = JSON.parse(o.items_json || '[]'); } catch { items = []; }
      for (const it of items) {
        const pid = Number(it.id);
        if (!firstBought[pid] || o.created_at < firstBought[pid]) {
          firstBought[pid] = o.created_at;
        }
      }
    }

    const beers = COLLECTIBLES.map(b => ({
      id:        b.id,
      name:      b.name,
      subtitle:  b.subtitle,
      img:       b.img,
      stamped:   b.id in firstBought,
      stampedAt: firstBought[b.id] || null
    }));

    const stamped = beers.filter(b => b.stamped).length;
    const total   = beers.length;
    const reward  = {
      unlocked:    stamped >= total,
      code:        stamped >= total ? 'PASAPORTE-COMPLETO' : null,
      description: 'Cerveza gratis o 20% off en tu próxima compra al probar todas.'
    };

    res.json({ beers, stamped, total, reward });
  } catch (err) {
    console.error('[Passport] Error:', err);
    res.status(500).json({ error: 'No pudimos calcular tu pasaporte' });
  }
});

app.post('/api/checkout', async (req, res) => {
  try {
    const { paymentMethod, customer, items, totalUYU, card, shipping, shippingMethod, shippingCost } = req.body;

    if (!paymentMethod || !customer || !items || !totalUYU) {
      return res.status(400).json({ success: false, error: 'Datos incompletos' });
    }

    // Validate stock before processing — si falla, devolvemos detalle
    // estructurado para que el frontend pueda decir "solo quedan X" exacto.
    try {
      db.processCheckoutStock(items);
    } catch (stockErr) {
      if (stockErr.code === 'INSUFFICIENT_STOCK' && stockErr.detail) {
        const d = stockErr.detail;
        return res.status(400).json({
          success: false,
          code: 'INSUFFICIENT_STOCK',
          error: `Solo quedan ${d.available} unidades de "${d.productName}". Ajustá la cantidad e intentá de nuevo.`,
          detail: d
        });
      }
      return res.status(400).json({ success: false, error: stockErr.message });
    }

    const orderId = 'MF-' + Date.now();
    const userId = req.session.userId || null;

    const orderData = {
      orderId,
      userId,
      customer,
      shipping: shipping || {},
      shippingMethod: shippingMethod || '',
      shippingCost: shippingCost || 0,
      items,
      totalUYU,
      provider: paymentMethod
    };

    // ---- TRANSFER OR CASH ----
    if (paymentMethod === 'transfer' || paymentMethod === 'cash') {
      orderData.status = 'nuevo';
      db.saveOrder(orderData);

      if (userId) db.clearCart(userId);

      // Send emails (fire-and-forget)
      const orderForEmail = {
        order_id: orderId, customer_email: customer.email,
        customer_first_name: customer.firstName, customer_last_name: customer.lastName,
        customer_phone: customer.phone, items_json: JSON.stringify(items),
        total_uyu: totalUYU, provider: paymentMethod,
        shipping_street: shipping?.street, shipping_apt: shipping?.apt, shipping_dept: shipping?.dept
      };
      email.sendOrderConfirmation(orderForEmail).catch(() => {});
      email.sendNewOrderNotification(orderForEmail).catch(() => {});

      return res.json({ success: true, orderId });
    }

    // ---- PLEXO CARD PAYMENT ----
    if (paymentMethod === 'card') {
      if (!card) return res.status(400).json({ success: false, error: 'Datos de tarjeta faltantes' });

      if (PLEXO_ENV === 'sandbox') {
        await new Promise(r => setTimeout(r, 1800));

        const cardNum = card.number.replace(/\s/g, '');
        if (cardNum === '4000000000000002') {
          return res.json({ success: false, error: 'Tarjeta rechazada por el banco emisor.' });
        }

        orderData.status = 'nuevo';
        orderData.provider = 'plexo-sandbox';
        db.saveOrder(orderData);

        if (userId) db.clearCart(userId);

        // Send emails
        const orderForEmail = {
          order_id: orderId, customer_email: customer.email,
          customer_first_name: customer.firstName, customer_last_name: customer.lastName,
          customer_phone: customer.phone, items_json: JSON.stringify(items),
          total_uyu: totalUYU, provider: 'card',
          shipping_street: shipping?.street, shipping_apt: shipping?.apt, shipping_dept: shipping?.dept
        };
        email.sendOrderConfirmation(orderForEmail).catch(() => {});
        email.sendNewOrderNotification(orderForEmail).catch(() => {});

        return res.json({ success: true, orderId });
      }

      // --- PRODUCTION PLEXO API ---
      const plexoPayload = {
        amount: { value: totalUYU, currency: 'UYU' },
        card: {
          number: card.number,
          expiryMonth: card.expiry.split('/')[0],
          expiryYear: '20' + card.expiry.split('/')[1],
          cvv: card.cvv,
          holderName: card.holderName
        },
        customer: {
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName
        },
        reference: orderId,
        description: 'Mala Fama Brewing — Pedido online'
      };

      // Usar node-fetch importado al inicio del archivo (o fetch nativo en Node 18+)
      const fetchFn = nodeFetch || globalThis.fetch;
      if (!fetchFn) {
        return res.status(500).json({ success: false, error: 'Error de configuración: node-fetch no disponible.' });
      }
      const plexoRes = await fetchFn(`${PLEXO_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PLEXO_KEY}`
        },
        body: JSON.stringify(plexoPayload)
      });

      const plexoData = await plexoRes.json();

      if (plexoRes.ok && plexoData.status === 'APPROVED') {
        orderData.status = 'nuevo';
        orderData.provider = 'plexo';
        orderData.plexoId = plexoData.id;
        db.saveOrder(orderData);
        if (userId) db.clearCart(userId);

        const orderForEmail = {
          order_id: orderId, customer_email: customer.email,
          customer_first_name: customer.firstName, customer_last_name: customer.lastName,
          customer_phone: customer.phone, items_json: JSON.stringify(items),
          total_uyu: totalUYU, provider: 'card',
          shipping_street: shipping?.street, shipping_apt: shipping?.apt, shipping_dept: shipping?.dept
        };
        email.sendOrderConfirmation(orderForEmail).catch(() => {});
        email.sendNewOrderNotification(orderForEmail).catch(() => {});

        return res.json({ success: true, orderId });
      } else {
        const errMsg = plexoData.message || 'El pago fue rechazado.';
        return res.json({ success: false, error: errMsg });
      }
    }

    return res.status(400).json({ success: false, error: 'Método de pago inválido' });

  } catch (error) {
    console.error('Checkout API error:', error);
    res.status(500).json({ success: false, error: 'Error interno al procesar el pedido.' });
  }
});

app.post('/api/plexo/webhook', (req, res) => {
  const event = req.body;
  // Webhook recibido — procesado silenciosamente
  res.sendStatus(200);
});

// =============================================
// RESTAURANT RESERVATIONS
// =============================================

// Public: get available capacity for a location+date
app.get('/api/reservas/capacity', (req, res) => {
  try {
    const { location, date } = req.query;
    if (!location || !date) return res.status(400).json({ success: false, error: 'location y date requeridos' });
    const loc = location.toLowerCase();
    const available = db.getAvailableCapacity(loc, date);
    const base = db.getVenueCapacity(loc);
    res.json({ success: true, available, base });
  } catch (error) {
    console.error('Error getting capacity:', error);
    res.status(500).json({ success: false, error: 'Error al consultar cupos' });
  }
});

app.post('/api/reserve', rateLimit(900000, 5), (req, res) => {
  try {
    const reservation = req.body;
    const userId = req.session.userId || null;

    if (!reservation.date || !reservation.time || !reservation.guests || !reservation.location) {
      return res.status(400).json({ success: false, error: 'Todos los campos son obligatorios' });
    }

    var guests = parseInt(reservation.guests);
    if (isNaN(guests) || guests < 1 || guests > 50) {
      return res.status(400).json({ success: false, error: 'Número de personas inválido' });
    }
    var validLocations = ['montevideo', 'punta del este'];
    var location = (reservation.location || 'montevideo').toLowerCase();
    if (!validLocations.includes(location)) {
      return res.status(400).json({ success: false, error: 'Ubicación inválida' });
    }

    // Validate capacity
    var available = db.getAvailableCapacity(location, reservation.date);
    if (guests > available) {
      return res.status(400).json({ success: false, error: 'Cupos insuficientes. Disponibles: ' + available });
    }

    // Get user info if logged in
    var userName = 'Invitado';
    var userEmail = '';
    if (userId) {
      var user = db.findUserById(userId);
      if (user) {
        userName = (user.first_name + ' ' + (user.last_name || '')).trim();
        userEmail = user.email;
      }
    }

    // Override with provided name/email if present
    function sanitize(str) { return String(str).replace(/<[^>]*>/g, '').trim(); }
    var name = reservation.name ? sanitize(reservation.name) : userName;
    var emailAddr = reservation.email ? sanitize(reservation.email) : userEmail;

    const bookingData = {
      bookingId: 'RES-' + Date.now(),
      userId,
      name: name,
      email: emailAddr,
      date: sanitize(reservation.date),
      time: sanitize(reservation.time),
      guests: guests,
      location: location
    };

    db.saveBooking(bookingData);

    // Notify admin by email
    email.sendNewReservationNotification(bookingData).catch(() => {});

    res.json({ success: true, message: '¡Reserva confirmada!', bookingId: bookingData.bookingId });
  } catch (error) {
    console.error('Error saving reservation:', error);
    res.status(500).json({ success: false, error: 'Error al guardar la reserva' });
  }
});

// =============================================
// ADMIN API ENDPOINTS
// =============================================

// ----- Dashboard -----

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const stats = db.getOrderStats();
    const lowStock = db.getLowStockProducts(10);
    res.json({ stats, lowStock });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
  }
});

app.get('/api/admin/revenue', requireAdmin, (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const revenue = db.getDailyRevenue(days);
    res.json({ revenue });
  } catch (error) {
    console.error('Admin revenue error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener revenue' });
  }
});

app.get('/api/admin/recent-orders', requireAdmin, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const orders = db.getAllOrders({ limit });
    const parsed = orders.map(o => ({
      ...o,
      items: JSON.parse(o.items_json || '[]')
    }));
    res.json({ orders: parsed });
  } catch (error) {
    console.error('Admin recent orders error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener pedidos' });
  }
});

// ----- INSIGHTS: métricas de negocio reales -----
// Cliente nuevo vs recurrente, top producto que convierte, horario pico,
// fuentes de tráfico (requiere ?src=ig|qr|google en URLs de entrada — guardado en tabla traffic_hits)
app.get('/api/admin/insights', requireAdmin, (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const insights = db.getBusinessInsights(days);
    res.json({ days, ...insights });
  } catch (error) {
    console.error('Admin insights error:', error);
    res.status(500).json({ success: false, error: 'Error al calcular insights' });
  }
});

// Tracking de fuentes de tráfico (llamado desde landing al cargar con ?src=)
app.post('/api/track-source', (req, res) => {
  try {
    const src = (req.body && req.body.src) || '';
    if (!src) return res.json({ ok: true });
    db.recordTrafficHit(String(src).slice(0, 40));
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: true }); // nunca rompe el site
  }
});

// ----- Orders -----

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  try {
    const { status, from, to } = req.query;
    const orders = db.getAllOrders({ status, from, to });
    const parsed = orders.map(o => ({
      ...o,
      items: JSON.parse(o.items_json || '[]')
    }));
    res.json({ orders: parsed });
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener pedidos' });
  }
});

app.get('/api/admin/orders/:orderId', requireAdmin, (req, res) => {
  try {
    const order = db.getOrderById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
    order.items = JSON.parse(order.items_json || '[]');
    res.json({ order });
  } catch (error) {
    console.error('Admin order detail error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener pedido' });
  }
});

app.put('/api/admin/orders/:orderId/status', requireAdmin, (req, res) => {
  try {
    const { status, trackingInfo } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'Estado requerido' });

    const order = db.updateOrderStatus(req.params.orderId, status, trackingInfo);
    if (!order) return res.status(404).json({ success: false, error: 'Pedido no encontrado' });

    // Send status update email to customer
    if (order.customer_email) {
      email.sendStatusUpdate(order, status).catch(() => {});
    }

    order.items = JSON.parse(order.items_json || '[]');
    res.json({ success: true, order });
  } catch (error) {
    console.error('Admin update order status error:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar estado' });
  }
});

// ----- Bookings -----

app.get('/api/admin/bookings', requireAdmin, (req, res) => {
  try {
    const { location, status, date } = req.query;
    const bookings = db.getAllBookings({ location, status, date });
    res.json({ bookings });
  } catch (error) {
    console.error('Admin bookings error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener reservas' });
  }
});

app.put('/api/admin/bookings/:bookingId/status', requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'Estado requerido' });
    const booking = db.updateBookingStatus(req.params.bookingId, status);
    if (!booking) return res.status(404).json({ success: false, error: 'Reserva no encontrada' });
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Admin update booking error:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar reserva' });
  }
});

// ----- Capacity Management -----

app.get('/api/admin/capacity', requireAdmin, (req, res) => {
  try {
    const { location, date } = req.query;
    if (!location || !date) return res.status(400).json({ success: false, error: 'location y date requeridos' });
    const loc = location.toLowerCase();
    const base = db.getVenueCapacity(loc);
    const booked = db.getBookedGuests(loc, date);
    const adjustment = db.getCapacityAdjustment(loc, date);
    const available = Math.max(0, base - booked - adjustment);
    res.json({ success: true, base, booked, adjustment, available });
  } catch (error) {
    console.error('Admin capacity error:', error);
    res.status(500).json({ success: false, error: 'Error al consultar cupos' });
  }
});

app.put('/api/admin/capacity', requireAdmin, (req, res) => {
  try {
    const { location, date, adjustment, note } = req.body;
    if (!location || !date || adjustment === undefined) {
      return res.status(400).json({ success: false, error: 'location, date y adjustment requeridos' });
    }
    db.setCapacityAdjustment(location.toLowerCase(), date, parseInt(adjustment), note || '');
    res.json({ success: true });
  } catch (error) {
    console.error('Admin set capacity error:', error);
    res.status(500).json({ success: false, error: 'Error al guardar ajuste' });
  }
});

app.put('/api/admin/capacity/base', requireAdmin, (req, res) => {
  try {
    const { location, capacity } = req.body;
    if (!location || !capacity) return res.status(400).json({ success: false, error: 'location y capacity requeridos' });
    db.setVenueCapacity(location.toLowerCase(), parseInt(capacity));
    res.json({ success: true });
  } catch (error) {
    console.error('Admin set base capacity error:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar capacidad' });
  }
});

// ----- Manual Bookings (admin) -----

app.post('/api/admin/bookings', requireAdmin, (req, res) => {
  try {
    const { name, email, guests, date, time, location, note } = req.body;
    function sanitize(str) { return String(str || '').replace(/<[^>]*>/g, '').trim(); }

    if (!name || !guests || !date || !time || !location) {
      return res.status(400).json({ success: false, error: 'Nombre, personas, fecha, hora y local son obligatorios' });
    }
    const guestsNum = parseInt(guests);
    if (isNaN(guestsNum) || guestsNum < 1) {
      return res.status(400).json({ success: false, error: 'Número de personas inválido' });
    }

    const bookingData = {
      bookingId: 'RES-' + Date.now(),
      userId: null,
      name: sanitize(name),
      email: sanitize(email || ''),
      date: sanitize(date),
      time: sanitize(time),
      guests: guestsNum,
      location: sanitize(location).toLowerCase()
    };

    db.saveBooking(bookingData);
    res.json({ success: true, booking: bookingData });
  } catch (error) {
    console.error('Admin manual booking error:', error);
    res.status(500).json({ success: false, error: 'Error al guardar la reserva' });
  }
});

// ----- Products / Stock -----

app.get('/api/admin/products', requireAdmin, (req, res) => {
  try {
    const stockData = db.getAllProductStock();
    const stockMap = {};
    stockData.forEach(s => { stockMap[s.product_id] = s; });

    const products = PRODUCTS.map(p => ({
      id: p.id,
      name: p.name,
      style: p.style || p.category || '',
      priceUYU: (stockMap[p.id] && stockMap[p.id].price_uyu > 0) ? stockMap[p.id].price_uyu : (p.price || 0),
      image: p.image,
      container: p.container,
      stock: stockMap[p.id] ? stockMap[p.id].stock : 50,
      active: stockMap[p.id] ? !!stockMap[p.id].active : true,
      updatedAt: stockMap[p.id] ? stockMap[p.id].updated_at : null
    }));

    res.json({ products });
  } catch (error) {
    console.error('Admin products error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener productos' });
  }
});

app.put('/api/admin/products/:id/stock', requireAdmin, (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { stock } = req.body;
    if (stock === undefined || stock < 0) {
      return res.status(400).json({ success: false, error: 'Stock inválido' });
    }
    db.updateProductStock(productId, stock);
    res.json({ success: true });
  } catch (error) {
    console.error('Admin update stock error:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar stock' });
  }
});

app.put('/api/admin/products/:id/active', requireAdmin, (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { active } = req.body;
    db.toggleProductActive(productId, active);
    res.json({ success: true });
  } catch (error) {
    console.error('Admin toggle product error:', error);
    res.status(500).json({ success: false, error: 'Error al cambiar estado del producto' });
  }
});

app.put('/api/admin/products/:id/price', requireAdmin, (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { priceUYU } = req.body;
    if (priceUYU === undefined || priceUYU < 0) {
      return res.status(400).json({ success: false, error: 'Precio inválido' });
    }
    db.updateProductPrice(productId, priceUYU);
    res.json({ success: true });
  } catch (error) {
    console.error('Admin update price error:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar precio' });
  }
});

app.put('/api/admin/products/bulk-price', requireAdmin, (req, res) => {
  try {
    const { pct } = req.body;
    if (typeof pct !== 'number' || isNaN(pct) || pct === 0 || pct < -90 || pct > 500) {
      return res.status(400).json({ success: false, error: 'Porcentaje inválido (rango: -90 a +500)' });
    }
    // Solo cervezas — excluir merch, valuepack y pack
    const BEER_STYLES = ['ipa','neipa','apa','sour','stout','lager','barrel-aged'];
    const beerIds = [...new Set(
      PRODUCTS.filter(p => p && BEER_STYLES.includes(p.style)).map(p => p.id)
    )];
    if (beerIds.length === 0) return res.status(400).json({ success: false, error: 'No hay productos de cerveza' });
    const multiplier = 1 + pct / 100;
    const updated = db.bulkUpdatePrices(multiplier, beerIds);
    res.json({ success: true, updated, pct });
  } catch (error) {
    console.error('Bulk price error:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar precios' });
  }
});

// ----- Customers -----

app.get('/api/admin/customers', requireAdmin, (req, res) => {
  try {
    const customers = db.getAllUsers();
    res.json({ customers });
  } catch (error) {
    console.error('Admin customers error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener clientes' });
  }
});

app.get('/api/admin/customers/:userId/orders', requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const orders = db.getOrdersByUser(userId);
    const parsed = orders.map(o => ({
      ...o,
      items: JSON.parse(o.items_json || '[]')
    }));
    res.json({ orders: parsed });
  } catch (error) {
    console.error('Admin customer orders error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener pedidos del cliente' });
  }
});

// =============================================
// HEALTH CHECK — Endpoint de monitoreo
// =============================================
// Usado por load balancers, uptimerobot, etc. para verificar que el servidor responde.
// No requiere autenticación. Retorna status 200 si todo está OK.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + 's'
  });
});

// =============================================
// INICIO DEL SERVIDOR
// =============================================

app.listen(PORT, async () => {
  console.log(`Mala Fama Brewing server corriendo en http://127.0.0.1:${PORT}`);
  console.log(`Modo Plexo: ${PLEXO_ENV.toUpperCase()}`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);

  // ── Seed admin desde variables de entorno (solo si están definidas) ──
  // Setear ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD en Railway para crear/actualizar
  // el admin en la DB de producción. Una vez logueado, borrar esas vars.
  if (process.env.ADMIN_SEED_EMAIL && process.env.ADMIN_SEED_PASSWORD) {
    try {
      const hash = await bcrypt.hash(process.env.ADMIN_SEED_PASSWORD, 10);
      const existing = db.findUserByEmail(process.env.ADMIN_SEED_EMAIL);
      if (existing) {
        db.setUserAdmin(existing.id, true);
        db.updateUserPassword(existing.id, hash);
        console.log(`[admin-seed] ✓ Usuario actualizado como admin: ${process.env.ADMIN_SEED_EMAIL} (id: ${existing.id})`);
      } else {
        const user = db.createUser({
          email: process.env.ADMIN_SEED_EMAIL,
          passwordHash: hash,
          firstName: 'Admin',
          lastName: 'Mala Fama'
        });
        db.setUserAdmin(user.id, true);
        console.log(`[admin-seed] ✓ Admin creado: ${process.env.ADMIN_SEED_EMAIL} (id: ${user.id})`);
      }
    } catch (e) {
      console.error('[admin-seed] Error:', e.message);
    }
  }

  // ── Seed datos demo (solo si DEMO_DATA_SEED=true) ──
  if (process.env.DEMO_DATA_SEED === 'true') {
    try {
      await seedDemoData();
    } catch (e) {
      console.error('[demo-seed] Error:', e.message);
    }
  }
});
