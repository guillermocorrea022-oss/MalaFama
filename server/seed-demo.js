// =============================================
// MALA FAMA — Demo Data Seed
// Crea usuarios, pedidos y reservas falsos
// para mostrar el admin con datos reales.
// Se ejecuta solo cuando DEMO_DATA_SEED=true
// =============================================

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

// ---- Helpers ----
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---- Productos reales ----
const PRODUCTS = [
  { id: 1,  name: 'La Santa',    price: 190 },
  { id: 2,  name: 'A Lo Bestia', price: 220 },
  { id: 3,  name: 'Tas Loco',    price: 190 },
  { id: 4,  name: 'Renegada',    price: 190 },
  { id: 5,  name: 'Alboroto',    price: 190 },
  { id: 6,  name: 'Guidaí',      price: 190 },
  { id: 7,  name: 'Hué 355',     price: 130 },
  { id: 8,  name: 'Hué 473',     price: 190 },
  { id: 11, name: 'Pack x3 + Vaso', price: 790 },
  { id: 12, name: 'Remera Negra',   price: 950 },
  { id: 13, name: 'Gorra Trucker',  price: 750 },
];

// ---- Clientes demo ----
const CLIENTES = [
  { firstName: 'Valentina', lastName: 'García',    email: 'vale.garcia@gmail.com',     phone: '099123456', street: 'Av. Italia 2340', dept: 'Montevideo' },
  { firstName: 'Matías',    lastName: 'Rodríguez', email: 'mati.rod@hotmail.com',       phone: '098234567', street: 'Bulevar España 1500', dept: 'Montevideo' },
  { firstName: 'Sofía',     lastName: 'Martínez',  email: 'sofi.mtz@gmail.com',         phone: '097345678', street: 'Rambla Rep. México 5080', dept: 'Montevideo' },
  { firstName: 'Agustín',   lastName: 'López',     email: 'aguslop@gmail.com',           phone: '099456789', street: 'Av. 8 de Octubre 3200', dept: 'Montevideo' },
  { firstName: 'Carolina',  lastName: 'Fernández', email: 'caro.fernan@gmail.com',       phone: '098567890', street: 'Gorlero 1200', dept: 'Punta del Este' },
  { firstName: 'Diego',     lastName: 'Suárez',    email: 'diegosua@gmail.com',          phone: '097678901', street: 'Av. Roosevelt 850', dept: 'Punta del Este' },
  { firstName: 'Lucía',     lastName: 'Pereira',   email: 'lu.pereira@outlook.com',      phone: '099789012', street: 'Colonia 1580', dept: 'Montevideo' },
  { firstName: 'Sebastián', lastName: 'González',  email: 'sebas.gonz@gmail.com',        phone: '098890123', street: 'Gaboto 1472', dept: 'Montevideo' },
];

// ---- Statuses de pedidos por edad (más viejos = más avanzados) ----
function statusByAge(daysOld) {
  if (daysOld > 20) return 'entregado';
  if (daysOld > 12) return 'enviado';
  if (daysOld > 6)  return 'preparando';
  if (daysOld > 2)  return 'confirmado';
  return 'nuevo';
}

// ---- Items aleatorios para un pedido ----
function randomItems() {
  const count = randomBetween(1, 3);
  const selected = [];
  const pool = [...PRODUCTS];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const prod = pool.splice(idx, 1)[0];
    const qty = randomBetween(1, 4);
    selected.push({ productId: prod.id, name: prod.name, quantity: qty, unitPrice: prod.price });
  }
  return selected;
}

// ---- Tracking info para enviados ----
function trackingFor(status) {
  if (status !== 'enviado' && status !== 'entregado') return '';
  const codes = ['UES-2024-7841', 'UES-2024-8023', 'UES-2024-9115', 'UES-2024-6732', 'UES-2024-5501'];
  return pick(codes);
}

// =============================================
// MAIN SEED FUNCTION
// =============================================
async function seedDemoData() {
  // Verificar si ya hay datos demo (evitar duplicar)
  const existing = db.db.prepare('SELECT COUNT(*) as c FROM orders').get();
  if (existing.c >= 10) {
    console.log('[demo-seed] Ya hay datos demo, no se vuelve a seedear.');
    return;
  }

  console.log('[demo-seed] Iniciando seed de datos demo...');

  const passwordHash = await bcrypt.hash('demo1234', 10);

  // ---- 1. Crear usuarios demo ----
  const userIds = [];
  for (const c of CLIENTES) {
    try {
      const user = db.createUser({
        email: c.email,
        passwordHash,
        firstName: c.firstName,
        lastName: c.lastName,
      });
      userIds.push({ id: user.id, ...c });
    } catch (e) {
      // Ya existe, buscarlo
      const found = db.findUserByEmail(c.email);
      if (found) userIds.push({ id: found.id, ...c });
    }
  }
  console.log(`[demo-seed] ✓ ${userIds.length} usuarios creados`);

  // ---- 2. Crear pedidos (últimos 30 días) ----
  const orderConfigs = [
    { daysOld: 0,  client: 0 },
    { daysOld: 1,  client: 1 },
    { daysOld: 1,  client: 2 },
    { daysOld: 2,  client: 3 },
    { daysOld: 3,  client: 4 },
    { daysOld: 4,  client: 5 },
    { daysOld: 5,  client: 6 },
    { daysOld: 7,  client: 7 },
    { daysOld: 8,  client: 0 },
    { daysOld: 10, client: 1 },
    { daysOld: 12, client: 2 },
    { daysOld: 14, client: 3 },
    { daysOld: 17, client: 4 },
    { daysOld: 20, client: 5 },
    { daysOld: 23, client: 6 },
    { daysOld: 25, client: 7 },
    { daysOld: 27, client: 0 },
    { daysOld: 29, client: 1 },
  ];

  let ordersCreated = 0;
  for (const cfg of orderConfigs) {
    const client = userIds[cfg.client] || userIds[0];
    const items = randomItems();
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const shippingMethod = pick(['envio', 'retiro']);
    const shippingCost = shippingMethod === 'envio' ? pick([0, 150, 200, 250]) : 0;
    const total = subtotal + shippingCost;
    const status = statusByAge(cfg.daysOld);
    const tracking = trackingFor(status);
    const orderId = 'MF-' + Date.now().toString(36).toUpperCase() + '-' + uuidv4().slice(0,4).toUpperCase();

    const stmt = db.db.prepare(`
      INSERT INTO orders
        (order_id, user_id, status, customer_email, customer_first_name, customer_last_name,
         customer_phone, shipping_street, shipping_dept,
         shipping_method, shipping_cost, tracking_info, items_json, total_uyu, provider, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'plexo',?)
    `);

    stmt.run(
      orderId,
      client.id,
      status,
      client.email,
      client.firstName,
      client.lastName,
      client.phone,
      client.street,
      client.dept,
      shippingMethod,
      shippingCost,
      tracking,
      JSON.stringify(items),
      total,
      daysAgo(cfg.daysOld)
    );
    ordersCreated++;
  }
  console.log(`[demo-seed] ✓ ${ordersCreated} pedidos creados`);

  // ---- 3. Crear reservas (próximos 14 días + últimos 10 días) ----
  const LOCATIONS = ['montevideo', 'punta del este'];
  const TIMES = ['20:00', '20:15', '20:30', '20:45', '21:00', '21:15', '21:30', '22:00'];
  const NAMES_RESERVA = [
    'Valentina García', 'Matías Rodríguez', 'Sofía Martínez', 'Agustín López',
    'Carolina Fernández', 'Diego Suárez', 'Lucía Pereira', 'Sebastián González',
    'Jimena Torres', 'Nicolás Cabrera', 'Florencia Silva', 'Rodrigo Acosta',
  ];
  const EMAILS_RESERVA = [
    'vale.garcia@gmail.com', 'mati.rod@hotmail.com', 'sofi.mtz@gmail.com',
    'aguslop@gmail.com', 'caro.fernan@gmail.com', 'diegosua@gmail.com',
    'lu.pereira@outlook.com', 'sebas.gonz@gmail.com', 'jime.torres@gmail.com',
    'nico.cab@gmail.com', 'flor.silva@gmail.com', 'rodri.acosta@gmail.com',
  ];

  // Fechas: 10 días atrás hasta 14 días adelante (salvo lunes)
  const bookingDays = [];
  for (let i = -10; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (d.getDay() === 1) continue; // lunes cerrado
    bookingDays.push(d.toISOString().slice(0, 10));
  }

  // ~2-3 reservas por día, alternando locales
  let bookingsCreated = 0;
  const stmtBooking = db.db.prepare(`
    INSERT INTO bookings (booking_id, user_id, name, email, date, time, guests, location, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `);

  for (const date of bookingDays) {
    const perDay = randomBetween(1, 3);
    for (let k = 0; k < perDay; k++) {
      const idx = randomBetween(0, NAMES_RESERVA.length - 1);
      const dDate = new Date(date + 'T12:00:00');
      const isPast = dDate < new Date();
      const status = isPast ? pick(['completed', 'confirmed']) : 'confirmed';
      const bookingId = 'BK-' + Date.now().toString(36).toUpperCase() + k + '-' + uuidv4().slice(0,4).toUpperCase();

      try {
        stmtBooking.run(
          bookingId,
          null,
          NAMES_RESERVA[idx],
          EMAILS_RESERVA[idx],
          date,
          pick(TIMES),
          randomBetween(2, 6),
          pick(LOCATIONS),
          status,
          daysAgo(Math.abs(parseInt(date.slice(8,10)) - new Date().getDate()))
        );
        bookingsCreated++;
      } catch (e) {
        // booking_id collision rara, skip
      }
    }
  }
  console.log(`[demo-seed] ✓ ${bookingsCreated} reservas creadas`);

  // ---- 4. Traffic hits (para gráfico de tráfico) ----
  const SOURCES = ['instagram', 'google', 'directo', 'directo', 'instagram', 'instagram', 'whatsapp'];
  const stmtHit = db.db.prepare("INSERT INTO traffic_hits (source, created_at) VALUES (?,?)");
  let hitsCreated = 0;
  for (let day = 29; day >= 0; day--) {
    const hitsPerDay = randomBetween(18, 65);
    for (let h = 0; h < hitsPerDay; h++) {
      stmtHit.run(pick(SOURCES), daysAgo(day));
      hitsCreated++;
    }
  }
  console.log(`[demo-seed] ✓ ${hitsCreated} traffic hits creados`);

  console.log('[demo-seed] ✅ Seed completo — datos demo listos.');
}

module.exports = { seedDemoData };
