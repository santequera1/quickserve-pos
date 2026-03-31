const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
    migrateSchema();
    seedIfEmpty();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'cashier', 'kitchen'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      price INTEGER NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      image TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('delivery', 'pickup', 'dine-in')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'preparing', 'ready', 'shipped', 'delivered', 'cancelled')),
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_address TEXT,
      customer_id INTEGER REFERENCES customers(id),
      table_number INTEGER,
      subtotal INTEGER NOT NULL,
      delivery_fee INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'transfer', 'card')),
      payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid')),
      created_at TEXT NOT NULL DEFAULT (datetime('now', '-5 hours')),
      driver_id INTEGER REFERENCES drivers(id),
      receipt_image TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL,
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      available INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function migrateSchema() {
  // Add receipt_image column if it doesn't exist
  try {
    db.prepare("SELECT receipt_image FROM orders LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE orders ADD COLUMN receipt_image TEXT");
    console.log('✅ Added receipt_image column to orders');
  }
  // Add notes column if it doesn't exist
  try {
    db.prepare("SELECT notes FROM orders LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE orders ADD COLUMN notes TEXT DEFAULT ''");
    console.log('✅ Added notes column to orders');
  }
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  if (count > 0) return;

  console.log('🌱 Seeding database...');

  // Users
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  const insertUser = db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)');
  insertUser.run('admin', hash('admin123'), 'Administrador', 'admin');
  insertUser.run('cajero', hash('cajero123'), 'Cajero', 'cashier');
  insertUser.run('cocina', hash('cocina123'), 'Cocina', 'kitchen');

  // Categories
  const insertCat = db.prepare('INSERT INTO categories (id, name, emoji, color) VALUES (?, ?, ?, ?)');
  const cats = [
    [1, 'Perros Calientes', '🌭', '#F59E0B'],
    [2, 'Hamburguesas', '🍔', '#EF4444'],
    [3, 'Asados Especiales', '🥩', '#B45309'],
    [4, 'Patacones', '🫓', '#D97706'],
    [5, 'Picadas', '🍟', '#DC2626'],
    [6, 'Salchipapas', '🍟', '#EA580C'],
    [7, 'Adiciones', '➕', '#6B7280'],
    [8, 'Bebidas', '🥤', '#3B82F6'],
  ];
  for (const c of cats) insertCat.run(...c);

  // Products
  const insertProd = db.prepare('INSERT INTO products (id, name, category_id, price, available, image, description) VALUES (?, ?, ?, ?, 1, NULL, ?)');
  const prods = [
    [1, 'Perro Súper', 1, 12000, null],
    [2, 'Perro Americano', 1, 16000, null],
    [3, 'Perro Suizo', 1, 18000, null],
    [4, 'Choriperro', 1, 18000, null],
    [5, 'Perro Ranchero', 1, 20000, null],
    [6, 'Chori Ranchero', 1, 28000, null],
    [7, 'Chori Gaviotero', 1, 32000, null],
    [8, 'Hamburguesa Sencilla', 2, 18000, null],
    [9, 'Hamburguesa Doble Carne', 2, 28000, null],
    [10, 'Hamburguesa Ranchera', 2, 28000, null],
    [11, 'Hamburguesa de Pollo', 2, 20000, null],
    [12, 'Hamburguesa Mixta', 2, 29000, null],
    [13, 'Hamburguesa Gaviota', 2, 32000, null],
    [14, 'Rancho Burgue Deluxe', 2, 28000, '⭐ Nuevo'],
    [15, 'Costilla BBQ (300gr)', 3, 27000, null],
    [16, 'Pechuga Asada (300gr)', 3, 26000, null],
    [17, 'Punta de Anca (300gr)', 3, 28000, null],
    [18, 'Punta Gorda (300gr)', 3, 35000, null],
    [19, 'Chorizo Artesanal', 3, 17000, null],
    [20, 'Patacón Sencillo', 4, 17000, null],
    [21, 'Patacón Choributy', 4, 20000, null],
    [22, 'Patacón Especial', 4, 27000, null],
    [23, 'Patacón Ranchero', 4, 32000, null],
    [24, 'Picada Personal', 5, 27000, null],
    [25, 'Picada para Dos', 5, 40000, null],
    [26, 'Picada Gaviotera (3-4)', 5, 58000, null],
    [27, 'Picada Extra-Familiar (5-6)', 5, 80000, null],
    [28, 'Papas Bacon', 6, 12000, null],
    [29, 'Salchipapa Gratinada', 6, 17000, null],
    [30, 'Salchisuiza', 6, 20000, null],
    [31, 'Salchiranchera', 6, 20000, null],
    [32, 'Choributy', 6, 20000, null],
    [33, 'Papa Francesa', 7, 6000, null],
    [34, 'Yuca Frita', 7, 6000, null],
    [35, 'Queso Mozarella', 7, 6000, null],
    [36, 'Tocino', 7, 5000, null],
    [37, 'Ranchera', 7, 8000, null],
    [38, 'Costilla BBQ Adición', 7, 20000, null],
    [39, 'Gratinado adicional', 7, 6000, null],
    [40, 'Coca Cola Personal', 8, 4000, null],
    [41, 'Coca Cola 1.5L', 8, 8000, null],
    [42, 'Kola Román Personal', 8, 4000, null],
    [43, 'Kola Román 1.5L', 8, 7000, null],
    [44, 'Cuatro Personal', 8, 4000, null],
    [45, 'Cuatro 1.5L', 8, 7000, null],
    [46, 'Agua', 8, 3000, null],
  ];
  for (const p of prods) insertProd.run(...p);

  // Customers
  const insertCust = db.prepare('INSERT INTO customers (id, name, phone, address, notes) VALUES (?, ?, ?, ?, ?)');
  insertCust.run(1, 'Ana García', '3001234567', 'Cl 45 #12-34, Cartagena', 'Sin cebolla en todo');
  insertCust.run(2, 'Carlos Rodríguez', '3109876543', 'Cra 8 #32-21', '');
  insertCust.run(3, 'María López', '3205551234', 'Av Consulado #45', 'Alérgica al gluten');
  insertCust.run(4, 'Stiven Antequera', '3026444564', 'Olaya Herrera Sector Progreso Calle Líbano', 'Siempre pide salchiranchera y coca cola personal');

  // Staff (drivers table with role:name format)
  const insertDriver = db.prepare('INSERT INTO drivers (name, phone, available) VALUES (?, ?, 1)');
  insertDriver.run('mesero:Mesero 1', '3001111111');
  insertDriver.run('mesero:Mesero 2', '3002222222');
  insertDriver.run('domiciliario:Domiciliario 1', '3003333333');
  insertDriver.run('domiciliario:Domiciliario 2', '3004444444');
  insertDriver.run('cocinero:Cocinero 1', '3005555555');
  insertDriver.run('cocinero:Cocinero 2', '3006666666');
  insertDriver.run('administrador:Administrador 1', '3007777777');
  insertDriver.run('administrador:Administrador 2', '3008888888');
  insertDriver.run('ayudante:Ayudante 1', '3009999999');
  insertDriver.run('ayudante:Ayudante 2', '3000000000');

  // Settings
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('deliveryFee', '3000');
  insertSetting.run('tableCount', '12');
  insertSetting.run('businessName', 'Comidas Rápidas Las Gaviotas');
  insertSetting.run('businessPhone', '3142211678');
  insertSetting.run('businessAddress', 'Cartagena de Indias');

  // Sample orders
  const insertOrder = db.prepare(`
    INSERT INTO orders (id, type, status, customer_name, customer_phone, customer_address, table_number, subtotal, delivery_fee, total, payment_method, payment_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, name, quantity, price, notes) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const iso = (minAgo) => new Date(now.getTime() - minAgo * 60000).toISOString().replace('T', ' ').slice(0, 19);

  insertOrder.run(1040, 'dine-in', 'delivered', 'Mesa 2', null, null, 2, 74000, 0, 74000, 'card', 'paid', iso(120));
  insertItem.run(1040, 26, 'Picada Gaviotera (3-4)', 1, 58000, '');
  insertItem.run(1040, 41, 'Coca Cola 1.5L', 2, 8000, '');

  insertOrder.run(1041, 'delivery', 'delivered', 'María López', '3205551234', 'Av Consulado #45', null, 25000, 3000, 28000, 'transfer', 'paid', iso(60));
  insertItem.run(1041, 20, 'Patacón Sencillo', 1, 17000, '');
  insertItem.run(1041, 42, 'Kola Román Personal', 2, 4000, '');

  insertOrder.run(1042, 'delivery', 'pending', 'Ana García', '3001234567', 'Cl 45 #12-34', null, 26000, 3000, 29000, 'cash', 'pending', iso(0));
  insertItem.run(1042, 8, 'Hamburguesa Sencilla', 1, 18000, 'Sin cebolla');
  insertItem.run(1042, 40, 'Coca Cola Personal', 2, 4000, '');

  insertOrder.run(1043, 'dine-in', 'preparing', 'Mesa 4', null, null, 4, 68000, 0, 68000, 'transfer', 'paid', iso(5));
  insertItem.run(1043, 9, 'Hamburguesa Doble Carne', 2, 28000, '');
  insertItem.run(1043, 33, 'Papa Francesa', 2, 6000, '');

  insertOrder.run(1044, 'pickup', 'ready', 'Carlos Rodríguez', '3109876543', null, null, 31000, 0, 31000, 'cash', 'paid', iso(15));
  insertItem.run(1044, 15, 'Costilla BBQ (300gr)', 1, 27000, '');
  insertItem.run(1044, 44, 'Cuatro Personal', 1, 4000, '');

  console.log('✅ Database seeded successfully');
}

module.exports = { getDb };
