// =========================================
// MALA FAMA BREWING — Database Module (SQLite)
// =========================================

const Database = require('better-sqlite3');
const path = require('path');

// La base de datos vive en la raíz del proyecto (no en server/)
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ===== Schema =====
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    shipping_street TEXT DEFAULT '',
    shipping_apt TEXT DEFAULT '',
    shipping_dept TEXT DEFAULT '',
    shipping_zone TEXT DEFAULT '',
    is_admin INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    status TEXT NOT NULL DEFAULT 'nuevo',
    customer_email TEXT,
    customer_first_name TEXT,
    customer_last_name TEXT,
    customer_phone TEXT,
    shipping_street TEXT,
    shipping_apt TEXT,
    shipping_dept TEXT,
    shipping_zone TEXT,
    shipping_method TEXT DEFAULT '',
    shipping_cost REAL DEFAULT 0,
    tracking_info TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    items_json TEXT NOT NULL,
    total_uyu REAL NOT NULL,
    provider TEXT,
    plexo_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    guests INTEGER NOT NULL,
    location TEXT DEFAULT 'montevideo',
    status TEXT DEFAULT 'confirmed',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS product_stock (
    product_id INTEGER PRIMARY KEY,
    stock INTEGER NOT NULL DEFAULT 50,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS venue_capacity (
    location TEXT PRIMARY KEY,
    capacity INTEGER NOT NULL DEFAULT 200
  );

  CREATE TABLE IF NOT EXISTS capacity_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location TEXT NOT NULL,
    date TEXT NOT NULL,
    adjustment INTEGER NOT NULL DEFAULT 0,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(location, date)
  );
`);

// Seed default venue capacities
db.prepare('INSERT OR IGNORE INTO venue_capacity (location, capacity) VALUES (?, ?)').run('montevideo', 200);
db.prepare('INSERT OR IGNORE INTO venue_capacity (location, capacity) VALUES (?, ?)').run('punta del este', 150);

// ===== Migrations (safe to run multiple times) =====
const migrations = [
  'ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0',
  'ALTER TABLE orders ADD COLUMN shipping_method TEXT DEFAULT ""',
  'ALTER TABLE orders ADD COLUMN shipping_cost REAL DEFAULT 0',
  'ALTER TABLE orders ADD COLUMN tracking_info TEXT DEFAULT ""',
  'ALTER TABLE orders ADD COLUMN notes TEXT DEFAULT ""',
  'ALTER TABLE product_stock ADD COLUMN price_uyu REAL DEFAULT 0',
  'ALTER TABLE bookings ADD COLUMN location TEXT DEFAULT "montevideo"',
  'ALTER TABLE bookings ADD COLUMN status TEXT DEFAULT "confirmed"'
];

migrations.forEach(sql => {
  try {
    db.exec(sql);
  } catch (e) {
    // Ignorar errores de "column already exists" (esperados en migraciones)
    // Pero loguear cualquier otro error inesperado
    if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) {
      console.warn('[DB] Error inesperado en migración:', e.message, '— SQL:', sql.substring(0, 80));
    }
  }
});

// Seed product stock for all real Mala Fama product IDs
const stmtSeedActive = db.prepare('INSERT OR IGNORE INTO product_stock (product_id, stock, active) VALUES (?, 50, 1)');
const stmtSeedArchive = db.prepare('INSERT OR IGNORE INTO product_stock (product_id, stock, active) VALUES (?, 0, 0)');
const seedStockAll = db.transaction(() => {
  // Active products (IDs 1-14)
  for (let i = 1; i <= 14; i++) stmtSeedActive.run(i);
  // Archive/Sin Stock products (IDs 100-146)
  for (let i = 100; i <= 146; i++) stmtSeedArchive.run(i);
});
seedStockAll();

// ===== User Helpers =====

const stmtCreateUser = db.prepare(`
  INSERT INTO users (email, password_hash, first_name, last_name)
  VALUES (@email, @passwordHash, @firstName, @lastName)
`);
const stmtFindByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const stmtFindById = db.prepare('SELECT * FROM users WHERE id = ?');
const stmtUpdateProfile = db.prepare(`
  UPDATE users SET first_name=@firstName, last_name=@lastName, phone=@phone,
    shipping_street=@shippingStreet, shipping_apt=@shippingApt,
    shipping_dept=@shippingDept, shipping_zone=@shippingZone
  WHERE id = @id
`);

function createUser({ email, passwordHash, firstName, lastName }) {
  const result = stmtCreateUser.run({ email, passwordHash, firstName, lastName: lastName || '' });
  return stmtFindById.get(result.lastInsertRowid);
}
function findUserByEmail(email) { return stmtFindByEmail.get(email); }
function findUserById(id) { return stmtFindById.get(id); }
function updateUserProfile(id, fields) {
  return stmtUpdateProfile.run({
    id, firstName: fields.firstName || '', lastName: fields.lastName || '',
    phone: fields.phone || '', shippingStreet: fields.shippingStreet || '',
    shippingApt: fields.shippingApt || '', shippingDept: fields.shippingDept || '',
    shippingZone: fields.shippingZone || ''
  });
}

// Admin helpers
function setUserAdmin(userId, isAdmin) {
  db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(isAdmin ? 1 : 0, userId);
}
function updateUserPassword(userId, passwordHash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
}
function getAllUsers() {
  return db.prepare(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_admin, u.created_at,
      COUNT(o.id) as order_count,
      COALESCE(SUM(o.total_uyu), 0) as total_spent
    FROM users u LEFT JOIN orders o ON u.id = o.user_id
    GROUP BY u.id ORDER BY u.created_at DESC
  `).all();
}

// ===== Cart Helpers =====

const stmtGetCart = db.prepare('SELECT product_id, quantity FROM cart_items WHERE user_id = ?');
const stmtUpsertCart = db.prepare(`
  INSERT INTO cart_items (user_id, product_id, quantity) VALUES (@userId, @productId, @quantity)
  ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = @quantity
`);
const stmtRemoveCartItem = db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?');
const stmtClearCart = db.prepare('DELETE FROM cart_items WHERE user_id = ?');

function getUserCart(userId) { return stmtGetCart.all(userId); }
function setCartItem(userId, productId, quantity) {
  if (quantity <= 0) return stmtRemoveCartItem.run(userId, productId);
  return stmtUpsertCart.run({ userId, productId, quantity });
}
function removeCartItem(userId, productId) { return stmtRemoveCartItem.run(userId, productId); }
function clearCart(userId) { return stmtClearCart.run(userId); }
function mergeCart(userId, clientItems) {
  const serverItems = getUserCart(userId);
  const serverMap = {};
  serverItems.forEach(item => { serverMap[item.product_id] = item.quantity; });
  clientItems.forEach(item => {
    const mergedQty = Math.max(serverMap[item.productId] || 0, item.quantity);
    setCartItem(userId, item.productId, mergedQty);
    delete serverMap[item.productId];
  });
  return getUserCart(userId);
}

// ===== Order Helpers =====

const stmtSaveOrder = db.prepare(`
  INSERT INTO orders (order_id, user_id, status, customer_email, customer_first_name, customer_last_name,
    customer_phone, shipping_street, shipping_apt, shipping_dept, shipping_zone,
    shipping_method, shipping_cost, items_json, total_uyu, provider, plexo_id)
  VALUES (@orderId, @userId, @status, @customerEmail, @customerFirstName, @customerLastName,
    @customerPhone, @shippingStreet, @shippingApt, @shippingDept, @shippingZone,
    @shippingMethod, @shippingCost, @itemsJson, @totalUyu, @provider, @plexoId)
`);

function saveOrder(data) {
  return stmtSaveOrder.run({
    orderId: data.orderId,
    userId: data.userId || null,
    status: data.status || 'nuevo',
    customerEmail: data.customer?.email || '',
    customerFirstName: data.customer?.firstName || '',
    customerLastName: data.customer?.lastName || '',
    customerPhone: data.customer?.phone || '',
    shippingStreet: data.shipping?.street || '',
    shippingApt: data.shipping?.apt || '',
    shippingDept: data.shipping?.dept || '',
    shippingZone: data.shipping?.zone || '',
    shippingMethod: data.shippingMethod || '',
    shippingCost: data.shippingCost || 0,
    itemsJson: JSON.stringify(data.items),
    totalUyu: data.totalUYU,
    provider: data.provider || '',
    plexoId: data.plexoId || ''
  });
}

function getOrdersByUser(userId) {
  return db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

// Admin order helpers
function getAllOrders(filters = {}) {
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (filters.status) { sql += ' AND status = ?'; params.push(filters.status); }
  if (filters.from) { sql += ' AND created_at >= ?'; params.push(filters.from); }
  if (filters.to) { sql += ' AND created_at <= ?'; params.push(filters.to + ' 23:59:59'); }
  sql += ' ORDER BY created_at DESC';
  if (filters.limit) { sql += ' LIMIT ?'; params.push(filters.limit); }
  return db.prepare(sql).all(...params);
}

function getOrderById(orderId) {
  return db.prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId);
}

function updateOrderStatus(orderId, status, trackingInfo) {
  const sql = trackingInfo
    ? 'UPDATE orders SET status = ?, tracking_info = ? WHERE order_id = ?'
    : 'UPDATE orders SET status = ? WHERE order_id = ?';
  const params = trackingInfo ? [status, trackingInfo, orderId] : [status, orderId];
  db.prepare(sql).run(...params);
  return getOrderById(orderId);
}

function getOrderStats() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const statsSql = `SELECT COUNT(*) as count, COALESCE(SUM(total_uyu),0) as total FROM orders WHERE created_at >= ?`;
  const todayStats = db.prepare(statsSql).get(today);
  const weekStats = db.prepare(statsSql).get(weekAgo);
  const monthStats = db.prepare(statsSql).get(monthAgo);

  return { today: todayStats, week: weekStats, month: monthStats };
}

function getDailyRevenue(days = 7) {
  const sql = `
    SELECT date(created_at) as date, COALESCE(SUM(total_uyu),0) as revenue, COUNT(*) as orders
    FROM orders WHERE created_at >= date('now', ?)
    GROUP BY date(created_at) ORDER BY date ASC
  `;
  return db.prepare(sql).all('-' + days + ' days');
}

// ===== Stock Helpers =====

function getAllProductStock() {
  return db.prepare('SELECT * FROM product_stock').all();
}
function getProductStock(productId) {
  return db.prepare('SELECT * FROM product_stock WHERE product_id = ?').get(productId);
}
function updateProductStock(productId, stock) {
  db.prepare("UPDATE product_stock SET stock = ?, updated_at = datetime('now') WHERE product_id = ?").run(stock, productId);
}
function toggleProductActive(productId, active) {
  db.prepare("UPDATE product_stock SET active = ?, updated_at = datetime('now') WHERE product_id = ?").run(active ? 1 : 0, productId);
}
function updateProductPrice(productId, priceUYU) {
  db.prepare("UPDATE product_stock SET price_uyu = ?, updated_at = datetime('now') WHERE product_id = ?").run(priceUYU, productId);
}
function getLowStockProducts(threshold = 10) {
  return db.prepare('SELECT * FROM product_stock WHERE stock < ? AND active = 1').all(threshold);
}

// Transactional stock decrement for checkout
const processCheckoutStock = db.transaction((items) => {
  for (const item of items) {
    const stock = db.prepare('SELECT stock FROM product_stock WHERE product_id = ?').get(item.id || item.productId);
    if (!stock || stock.stock < (item.quantity || 1)) {
      throw new Error(`Stock insuficiente para producto ${item.id || item.productId}`);
    }
    db.prepare("UPDATE product_stock SET stock = stock - ?, updated_at = datetime('now') WHERE product_id = ?")
      .run(item.quantity || 1, item.id || item.productId);
  }
});

// ===== Booking Helpers =====

function saveBooking(data) {
  return db.prepare(`
    INSERT INTO bookings (booking_id, user_id, name, email, date, time, guests, location)
    VALUES (@bookingId, @userId, @name, @email, @date, @time, @guests, @location)
  `).run({
    bookingId: data.bookingId || 'RES-' + Date.now(),
    userId: data.userId || null,
    name: data.name, email: data.email, date: data.date,
    time: data.time, guests: data.guests, location: data.location || 'montevideo'
  });
}

function getAllBookings(filters = {}) {
  let sql = 'SELECT * FROM bookings WHERE 1=1';
  const params = [];
  if (filters.location) { sql += ' AND location = ?'; params.push(filters.location); }
  if (filters.status) { sql += ' AND status = ?'; params.push(filters.status); }
  if (filters.date) { sql += ' AND date = ?'; params.push(filters.date); }
  sql += ' ORDER BY date DESC, time ASC';
  return db.prepare(sql).all(...params);
}

function updateBookingStatus(bookingId, status) {
  db.prepare('UPDATE bookings SET status = ? WHERE booking_id = ?').run(status, bookingId);
  return db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(bookingId);
}

// ===== Capacity Helpers =====

function getVenueCapacity(location) {
  const row = db.prepare('SELECT capacity FROM venue_capacity WHERE location = ?').get(location);
  return row ? row.capacity : 200;
}

function setVenueCapacity(location, capacity) {
  db.prepare('INSERT OR REPLACE INTO venue_capacity (location, capacity) VALUES (?, ?)').run(location, capacity);
}

function getCapacityAdjustment(location, date) {
  const row = db.prepare('SELECT adjustment, note FROM capacity_adjustments WHERE location = ? AND date = ?').get(location, date);
  return row ? row.adjustment : 0;
}

function setCapacityAdjustment(location, date, adjustment, note) {
  db.prepare('INSERT OR REPLACE INTO capacity_adjustments (location, date, adjustment, note) VALUES (?, ?, ?, ?)').run(location, date, adjustment, note || '');
}

function getBookedGuests(location, date) {
  const row = db.prepare("SELECT COALESCE(SUM(guests), 0) as total FROM bookings WHERE location = ? AND date = ? AND status = 'confirmed'").get(location, date);
  return row ? row.total : 0;
}

function getAvailableCapacity(location, date) {
  const base = getVenueCapacity(location);
  const booked = getBookedGuests(location, date);
  const adjustment = getCapacityAdjustment(location, date);
  return Math.max(0, base - booked - adjustment);
}

function getBookedSlots(location, date) {
  return db.prepare("SELECT time, SUM(guests) as total_guests FROM bookings WHERE location = ? AND date = ? AND status = 'confirmed' GROUP BY time ORDER BY time").all(location, date);
}

function getBookingsByDate(location, date) {
  return db.prepare("SELECT * FROM bookings WHERE location = ? AND date = ? ORDER BY time ASC, created_at ASC").all(location, date);
}

function getBookingById(bookingId) {
  return db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(bookingId);
}

// ===== Exports =====
module.exports = {
  db,
  // Users
  createUser, findUserByEmail, findUserById, updateUserProfile, setUserAdmin, updateUserPassword, getAllUsers,
  // Cart
  getUserCart, setCartItem, removeCartItem, clearCart, mergeCart,
  // Orders
  saveOrder, getOrdersByUser, getAllOrders, getOrderById, updateOrderStatus, getOrderStats, getDailyRevenue,
  // Stock
  getAllProductStock, getProductStock, updateProductStock, toggleProductActive, updateProductPrice, getLowStockProducts, processCheckoutStock,
  // Bookings
  saveBooking, getAllBookings, updateBookingStatus, getBookingById, getBookingsByDate,
  // Capacity
  getVenueCapacity, setVenueCapacity, getCapacityAdjustment, setCapacityAdjustment,
  getBookedGuests, getAvailableCapacity, getBookedSlots
};
