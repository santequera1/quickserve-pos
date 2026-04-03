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
  // Add sizes column to products if it doesn't exist
  try {
    db.prepare("SELECT sizes FROM products LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE products ADD COLUMN sizes TEXT");
    console.log('✅ Added sizes column to products');
  }
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  if (count > 0) return;

  console.log('🌱 Seeding database...');

  // Users
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  const insertUser = db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)');
  insertUser.run('diogenes', hash('3145843269'), 'Diógenes López', 'admin');
  insertUser.run('cajero', hash('cajero123'), 'Cajero', 'cashier');
  insertUser.run('cocina', hash('cocina123'), 'Cocina', 'kitchen');

  // Categories
  const insertCat = db.prepare('INSERT INTO categories (id, name, emoji, color) VALUES (?, ?, ?, ?)');
  const cats = [
    [1, 'Pizzas', '🍕', '#B71515'],
    [2, 'Porciones', '🍕', '#F5C518'],
    [3, 'Picadas', '🍟', '#D97706'],
    [4, 'Salchipapas', '🍟', '#EA580C'],
    [5, 'Perros Calientes', '🌭', '#F59E0B'],
    [6, 'Hamburguesas', '🍔', '#EF4444'],
    [7, 'Salsas', '🫙', '#6B7280'],
    [8, 'Bebidas', '🥤', '#3B82F6'],
  ];
  for (const c of cats) insertCat.run(...c);

  // Products - pizzas have sizes JSON, others have single price
  const insertProd = db.prepare('INSERT INTO products (id, name, category_id, price, available, image, description, sizes) VALUES (?, ?, ?, ?, 1, ?, ?, ?)');
  const sz = (p, m, g, xl) => JSON.stringify([
    { name: 'Pequeña (2 pers.)', price: p },
    { name: 'Mediana (4 pers.)', price: m },
    { name: 'Grande (6 pers.)', price: g },
    { name: 'Extra Grande (7 pers.)', price: xl },
  ]);
  const prods = [
    // PIZZAS (cat 1) - con tamaños
    [1, 'Tocineta y Maíz', 1, 27000, '/products/tocineta-y-maiz-pizza.webp', 'Tocineta ahumada, maíz tierno, queso y salsa napolitana', sz(27000,43000,57000,61000)],
    [2, 'Jamón y Queso', 1, 22000, '/products/jamon-y-queso-pizza.webp', 'Jamón, queso y salsa napolitana', sz(22000,38000,50000,54000)],
    [3, 'Pepperoni', 1, 28000, '/products/pepperonni.webp', 'Pepperoni, queso mozarella y salsa napolitana', sz(28000,43000,57000,60000)],
    [4, 'Hawaiana', 1, 24000, '/products/hawaiana-foto.webp', 'Jamón, queso, piña y salsa napolitana', sz(24000,41000,53000,57000)],
    [5, 'Salami', 1, 27000, '/products/salamiii.webp', 'Salami, queso mozarella y salsa napolitana', sz(27000,40000,55000,59000)],
    [6, 'Campesina', 1, 27000, '/products/campesina.webp', 'Jamón, cebolla, pimentón, maíz, aceitunas, champiñones', sz(27000,43000,57000,61000)],
    [7, 'Pollo y Champiñones', 1, 30000, '/products/pollo-y-champinones.webp', 'Pollo, champiñones, cebolla, pimentón', sz(30000,45000,60000,64000)],
    [8, 'Pollo Tocineta y Maíz', 1, 30000, '/products/pollo-tocineta-y-maiz.webp', 'Pollo, tocineta, maíz, queso', sz(30000,45000,60000,64000)],
    [9, 'Chicharrón', 1, 30000, '/products/chicharron.webp', 'Chicharrón salpimentado, cebolla, queso cebollín', sz(30000,45000,57000,62000)],
    [10, 'Chorizo y Vegetales', 1, 27000, '/products/chorizo-y-vegetales.webp', 'Chorizo, cebolla, pimentón, maíz, queso', sz(27000,43000,56000,60000)],
    [11, 'Ranchera', 1, 30000, '/products/ranchera.webp', 'Salchicha ranchera, cebolla caramelizada, maíz', sz(30000,45000,60000,64000)],
    [12, 'Carbonara', 1, 30000, '/products/carbonara.webp', 'Salsa blanca, tocineta, cebolla, parmesano', sz(30000,45000,58000,62000)],
    [13, 'Camarones', 1, 33000, '/products/camarones.webp', 'Salsa blanca, camarones, champiñones al ajillo', sz(33000,48000,62000,67000)],
    [14, 'Pepperoni Meat', 1, 30000, '/products/ppepperoni-meat.webp', 'Pepperoni, trocitos de carne, queso', sz(30000,45000,58000,64000)],
    [15, 'Pepperoni Chicken', 1, 30000, '/products/peperoni-chicken.webp', 'Pepperoni, pollo salteado con cebolla', sz(30000,45000,58000,64000)],
    [16, 'Suprema', 1, 33000, '/products/suprema.webp', 'Camarones, tocineta, jamón, vegetales, salsa blanca', sz(33000,50000,64000,69000)],

    // PORCIONES (cat 2)
    [17, 'Porción Jamón', 2, 6000, null, null, null],
    [18, 'Porción Hawaiana', 2, 6000, null, null, null],
    [19, 'Porción Pepperoni', 2, 7000, null, null, null],
    [20, 'Porción Salami', 2, 7000, null, null, null],
    [21, 'Porción Enchulada', 2, 8000, null, null, null],

    // PICADAS (cat 3) - con tamaños
    [22, 'Picada', 3, 22000, null, 'Papas, pollo/carne/cerdo, cebolla, pimentón, lechuga, aguacate, queso', JSON.stringify([{name:'Personal',price:22000},{name:'Para dos',price:36000},{name:'Familiar',price:75000}])],

    // SALCHIPAPAS (cat 4) - con tamaños
    [23, 'Salchipapa', 4, 15000, null, 'Papas francesas, salchichas, chorizo, lechuga, queso', JSON.stringify([{name:'Personal',price:15000},{name:'Para dos',price:25000},{name:'Familiar',price:50000}])],

    // PERROS CALIENTES (cat 5)
    [24, 'Perro Super', 5, 13000, null, 'Salchicha super zenu, lechuga, papa ripio, cebolla, queso, salsas y maíz', null],
    [25, 'Perro Ranchero', 5, 16000, null, 'Salchicha ranchera, cebolla caramelizada. Incluye papas', null],
    [26, 'Choriperro', 5, 16000, null, 'Chorizo picante, cebolla caramelizada. Incluye papas', null],
    [27, 'Perro Suizo', 5, 18000, null, 'Salchicha suiza, cebolla caramelizada. Incluye papas', null],
    [28, 'Pepito', 5, 34000, null, 'Pan 30cm, carne, pollo, chorizo, cerdo, tocineta, maíz, aguacate', null],

    // HAMBURGUESAS (cat 6)
    [29, 'Sencilla', 6, 17000, null, 'Carne de res, tomate, cebolla, lechuga, mozarella. Incluye papas', null],
    [30, 'Doble Carne', 6, 20000, null, 'Doble carne de res, mozarella y cheddar. Incluye papas', null],
    [31, 'Chuletón', 6, 18000, null, 'Chuleta ahumada, jamón, cebolla caramelizada, aguacate. Incluye papas', null],
    [32, 'Queso y Tocineta', 6, 20000, null, 'Carne, tocineta, cebolla caramelizada, pepinillos, cheddar. Incluye papas', null],
    [33, 'Chule Pollo', 6, 24000, null, 'Chuleta, pollo, jamón, aguacate, mozarella, cheddar. Incluye papas', null],
    [34, 'Chule Carne', 6, 24000, null, 'Chuleta, carne, jamón, aguacate, mozarella, cheddar. Incluye papas', null],
    [35, 'Caraqueña', 6, 20000, null, 'Carne, aguacate, queso amarillo, huevo, jamón. Incluye papas', null],
    [36, 'La Diabla', 6, 26000, null, 'Carne, pollo, chuleta, huevo, tocineta, mozarella, cheddar. Incluye papas', null],

    // SALSAS (cat 7)
    [37, 'Salsa Napolitana', 7, 2000, '/products/salsa.png', null, null],
    [38, 'Salsa BBQ', 7, 2000, '/products/salsa.png', null, null],
    [39, 'Salsa de Ajo', 7, 2000, '/products/salsa.png', null, null],
    [40, 'Salsa Ranch', 7, 2000, '/products/salsa.png', null, null],

    // BEBIDAS (cat 8) - con tamaños
    [41, 'Coca Cola', 8, 3000, null, null, JSON.stringify([{name:'Personal',price:3000},{name:'Litro',price:6000},{name:'2 Litros',price:9000}])],
    [42, 'Pepsi', 8, 3000, null, null, JSON.stringify([{name:'Personal',price:3000},{name:'Litro',price:6000},{name:'2 Litros',price:9000}])],
    [43, 'Postobón Manzana', 8, 3000, null, null, JSON.stringify([{name:'Personal',price:3000},{name:'Litro',price:6000},{name:'2 Litros',price:9000}])],
    [44, 'Postobón Uva', 8, 3000, null, null, JSON.stringify([{name:'Personal',price:3000},{name:'Litro',price:6000},{name:'2 Litros',price:9000}])],
    [45, 'Colombiana', 8, 3000, null, null, JSON.stringify([{name:'Personal',price:3000},{name:'Litro',price:6000},{name:'2 Litros',price:9000}])],
    [46, 'Sprite', 8, 3000, null, null, JSON.stringify([{name:'Personal',price:3000},{name:'Litro',price:6000},{name:'2 Litros',price:9000}])],
    [47, 'Agua', 8, 3000, null, null, null],
  ];
  for (const p of prods) insertProd.run(...p);

  // Customers
  const insertCust = db.prepare('INSERT INTO customers (id, name, phone, address, notes) VALUES (?, ?, ?, ?, ?)');
  insertCust.run(1, 'Laura Martínez', '3001234567', 'Urb. Jardines de Junio Mz 3', 'Le gusta la pizza Hawaiana');
  insertCust.run(2, 'Carlos Rodríguez', '3109876543', 'Barrio El Centro Cra 5 #12-30', '');
  insertCust.run(3, 'María López', '3205551234', 'Sector La Playa Cl 10 #8-45', 'Alérgica al maní');

  // Staff (drivers table with role:name format)
  const insertDriver = db.prepare('INSERT INTO drivers (name, phone, available) VALUES (?, ?, 1)');
  insertDriver.run('domiciliario:Domiciliario 1', '3003333333');
  insertDriver.run('domiciliario:Domiciliario 2', '3004444444');
  insertDriver.run('cocinero:Cocinero 1', '3005555555');
  insertDriver.run('administrador:Administrador', '3145843269');

  // Settings
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('deliveryFee', '5000');
  insertSetting.run('tableCount', '6');
  insertSetting.run('businessName', 'Pizza Pizza Fast Food');
  insertSetting.run('businessPhone', '3145843269');
  insertSetting.run('businessAddress', 'Urbanización Jardines de Junio, Mz 1 Lote 7');

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

  insertOrder.run(1001, 'delivery', 'delivered', 'Laura Martínez', '3001234567', 'Urb. Jardines de Junio Mz 3', null, 43000, 5000, 48000, 'transfer', 'paid', iso(90));
  insertItem.run(1001, 3, 'Pepperoni (Mediana)', 1, 43000, '');

  insertOrder.run(1002, 'dine-in', 'preparing', 'Mesa 2', null, null, 2, 50000, 0, 50000, 'cash', 'pending', iso(10));
  insertItem.run(1002, 16, 'Suprema (Mediana)', 1, 50000, '');

  insertOrder.run(1003, 'pickup', 'ready', 'Carlos Rodríguez', '3109876543', null, null, 17000, 0, 17000, 'cash', 'paid', iso(20));
  insertItem.run(1003, 29, 'Sencilla', 1, 17000, '');

  console.log('✅ Database seeded successfully');
}

module.exports = { getDb };
