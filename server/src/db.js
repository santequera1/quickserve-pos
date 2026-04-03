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
    [1, 'Pizzas Pequeñas', '🍕', '#B71515'],
    [2, 'Pizzas Medianas', '🍕', '#D4620A'],
    [3, 'Pizzas Grandes', '🍕', '#3B1A08'],
    [4, 'Pizzas Extra Grande', '🍕', '#8B0000'],
    [5, 'Porciones', '🍕', '#F5C518'],
    [6, 'Picadas', '🍟', '#D97706'],
    [7, 'Salchipapas', '🍟', '#EA580C'],
    [8, 'Perros Calientes', '🌭', '#F59E0B'],
    [9, 'Hamburguesas', '🍔', '#EF4444'],
    [10, 'Salsas', '🫙', '#6B7280'],
  ];
  for (const c of cats) insertCat.run(...c);

  // Products
  const insertProd = db.prepare('INSERT INTO products (id, name, category_id, price, available, image, description) VALUES (?, ?, ?, ?, 1, ?, ?)');
  const prods = [
    // PIZZAS PEQUEÑAS (cat 1) - 8 porciones, 2 personas
    [1, 'Tocineta y Maíz', 1, 27000, '/products/tocineta-y-maiz-pizza.webp', 'Tocineta ahumada, maíz tierno, queso y salsa napolitana'],
    [2, 'Jamón y Queso', 1, 22000, '/products/jamon-y-queso-pizza.webp', 'Jamón, queso y salsa napolitana'],
    [3, 'Pepperoni', 1, 28000, '/products/pepperonni.webp', 'Pepperoni, queso mozarella y salsa napolitana'],
    [4, 'Hawaiana', 1, 24000, '/products/hawaiana-foto.webp', 'Jamón, queso, piña y salsa napolitana'],
    [5, 'Salami', 1, 27000, '/products/salamiii.webp', 'Salami, queso mozarella y salsa napolitana'],
    [6, 'Campesina', 1, 27000, '/products/campesina.webp', 'Jamón, cebolla, pimentón, maíz, aceitunas, champiñones'],
    [7, 'Pollo y Champiñones', 1, 30000, '/products/pollo-y-champiñones.webp', 'Pollo, champiñones, cebolla, pimentón'],
    [8, 'Pollo Tocineta y Maíz', 1, 30000, '/products/pollo-tocineta-y-maiz.webp', 'Pollo, tocineta, maíz, queso'],
    [9, 'Chicharrón', 1, 30000, '/products/chicharron.webp', 'Chicharrón salpimentado, cebolla, queso cebollín'],
    [10, 'Chorizo y Vegetales', 1, 27000, '/products/chorizo-y-vegetales.webp', 'Chorizo, cebolla, pimentón, maíz, queso'],
    [11, 'Ranchera', 1, 30000, '/products/ranchera.webp', 'Salchicha ranchera, cebolla caramelizada, maíz'],
    [12, 'Carbonara', 1, 30000, '/products/carbonara.webp', 'Salsa blanca, tocineta, cebolla, parmesano'],
    [13, 'Camarones', 1, 33000, '/products/camarones.webp', 'Salsa blanca, camarones, champiñones al ajillo'],
    [14, 'Pepperoni Meat', 1, 30000, '/products/ppepperoni-meat.webp', 'Pepperoni, trocitos de carne, queso'],
    [15, 'Pepperoni Chicken', 1, 30000, '/products/peperoni-chicken.webp', 'Pepperoni, pollo salteado con cebolla'],
    [16, 'Suprema', 1, 33000, '/products/suprema.webp', 'Camarones, tocineta, jamón, vegetales, salsa blanca'],

    // PIZZAS MEDIANAS (cat 2) - 10 porciones, 4 personas
    [17, 'Tocineta y Maíz', 2, 43000, '/products/tocineta-y-maiz-pizza.webp', null],
    [18, 'Jamón y Queso', 2, 38000, '/products/jamon-y-queso-pizza.webp', null],
    [19, 'Pepperoni', 2, 43000, '/products/pepperonni.webp', null],
    [20, 'Hawaiana', 2, 41000, '/products/hawaiana-foto.webp', null],
    [21, 'Salami', 2, 40000, '/products/salamiii.webp', null],
    [22, 'Campesina', 2, 43000, '/products/campesina.webp', null],
    [23, 'Pollo y Champiñones', 2, 45000, '/products/pollo-y-champiñones.webp', null],
    [24, 'Pollo Tocineta y Maíz', 2, 45000, '/products/pollo-tocineta-y-maiz.webp', null],
    [25, 'Chicharrón', 2, 45000, '/products/chicharron.webp', null],
    [26, 'Chorizo y Vegetales', 2, 43000, '/products/chorizo-y-vegetales.webp', null],
    [27, 'Ranchera', 2, 45000, '/products/ranchera.webp', null],
    [28, 'Carbonara', 2, 45000, '/products/carbonara.webp', null],
    [29, 'Camarones', 2, 48000, '/products/camarones.webp', null],
    [30, 'Pepperoni Meat', 2, 45000, '/products/ppepperoni-meat.webp', null],
    [31, 'Pepperoni Chicken', 2, 45000, '/products/peperoni-chicken.webp', null],
    [32, 'Suprema', 2, 50000, '/products/suprema.webp', null],

    // PIZZAS GRANDES (cat 3) - 14 porciones, 6 personas
    [33, 'Tocineta y Maíz', 3, 57000, '/products/tocineta-y-maiz-pizza.webp', null],
    [34, 'Jamón y Queso', 3, 50000, '/products/jamon-y-queso-pizza.webp', null],
    [35, 'Pepperoni', 3, 57000, '/products/pepperonni.webp', null],
    [36, 'Hawaiana', 3, 53000, '/products/hawaiana-foto.webp', null],
    [37, 'Salami', 3, 55000, '/products/salamiii.webp', null],
    [38, 'Campesina', 3, 57000, '/products/campesina.webp', null],
    [39, 'Pollo y Champiñones', 3, 60000, '/products/pollo-y-champiñones.webp', null],
    [40, 'Pollo Tocineta y Maíz', 3, 60000, '/products/pollo-tocineta-y-maiz.webp', null],
    [41, 'Chicharrón', 3, 57000, '/products/chicharron.webp', null],
    [42, 'Chorizo y Vegetales', 3, 56000, '/products/chorizo-y-vegetales.webp', null],
    [43, 'Ranchera', 3, 60000, '/products/ranchera.webp', null],
    [44, 'Carbonara', 3, 58000, '/products/carbonara.webp', null],
    [45, 'Camarones', 3, 62000, '/products/camarones.webp', null],
    [46, 'Pepperoni Meat', 3, 58000, '/products/ppepperoni-meat.webp', null],
    [47, 'Pepperoni Chicken', 3, 58000, '/products/peperoni-chicken.webp', null],
    [48, 'Suprema', 3, 64000, '/products/suprema.webp', null],

    // PIZZAS EXTRA GRANDE (cat 4) - 14 porciones, 7 personas
    [49, 'Tocineta y Maíz', 4, 61000, '/products/tocineta-y-maiz-pizza.webp', null],
    [50, 'Jamón y Queso', 4, 54000, '/products/jamon-y-queso-pizza.webp', null],
    [51, 'Pepperoni', 4, 60000, '/products/pepperonni.webp', null],
    [52, 'Hawaiana', 4, 57000, '/products/hawaiana-foto.webp', null],
    [53, 'Salami', 4, 59000, '/products/salamiii.webp', null],
    [54, 'Campesina', 4, 61000, '/products/campesina.webp', null],
    [55, 'Pollo y Champiñones', 4, 64000, '/products/pollo-y-champiñones.webp', null],
    [56, 'Pollo Tocineta y Maíz', 4, 64000, '/products/pollo-tocineta-y-maiz.webp', null],
    [57, 'Chicharrón', 4, 62000, '/products/chicharron.webp', null],
    [58, 'Chorizo y Vegetales', 4, 60000, '/products/chorizo-y-vegetales.webp', null],
    [59, 'Ranchera', 4, 64000, '/products/ranchera.webp', null],
    [60, 'Carbonara', 4, 62000, '/products/carbonara.webp', null],
    [61, 'Camarones', 4, 67000, '/products/camarones.webp', null],
    [62, 'Pepperoni Meat', 4, 64000, '/products/ppepperoni-meat.webp', null],
    [63, 'Pepperoni Chicken', 4, 64000, '/products/peperoni-chicken.webp', null],
    [64, 'Suprema', 4, 69000, '/products/suprema.webp', null],

    // PORCIONES (cat 5)
    [65, 'Porción Jamón', 5, 6000, null, null],
    [66, 'Porción Hawaiana', 5, 6000, null, null],
    [67, 'Porción Pepperoni', 5, 7000, null, null],
    [68, 'Porción Salami', 5, 7000, null, null],
    [69, 'Porción Enchulada', 5, 8000, null, null],

    // PICADAS (cat 6)
    [70, 'Picada Personal', 6, 22000, null, 'Papas, pollo/carne/cerdo, cebolla, pimentón, lechuga, aguacate, queso'],
    [71, 'Picada para Dos', 6, 36000, null, null],
    [72, 'Picada Familiar', 6, 75000, null, null],

    // SALCHIPAPAS (cat 7)
    [73, 'Salchipapa Personal', 7, 15000, null, 'Papas francesas, salchichas, chorizo, lechuga, queso'],
    [74, 'Salchipapa para Dos', 7, 25000, null, null],
    [75, 'Salchipapa Familiar', 7, 50000, null, null],

    // PERROS CALIENTES (cat 8)
    [76, 'Perro Super', 8, 13000, null, 'Salchicha super zenu, lechuga, papa ripio, cebolla, queso, salsas y maíz'],
    [77, 'Perro Ranchero', 8, 16000, null, 'Salchicha ranchera, cebolla caramelizada. Incluye papas'],
    [78, 'Choriperro', 8, 16000, null, 'Chorizo picante, cebolla caramelizada. Incluye papas'],
    [79, 'Perro Suizo', 8, 18000, null, 'Salchicha suiza, cebolla caramelizada. Incluye papas'],
    [80, 'Pepito', 8, 34000, null, 'Pan 30cm, carne, pollo, chorizo, cerdo, tocineta, maíz, aguacate'],

    // HAMBURGUESAS (cat 9)
    [81, 'Sencilla', 9, 17000, null, 'Carne de res, tomate, cebolla, lechuga, mozarella. Incluye papas'],
    [82, 'Doble Carne', 9, 20000, null, 'Doble carne de res, mozarella y cheddar. Incluye papas'],
    [83, 'Chuletón', 9, 18000, null, 'Chuleta ahumada, jamón, cebolla caramelizada, aguacate. Incluye papas'],
    [84, 'Queso y Tocineta', 9, 20000, null, 'Carne, tocineta, cebolla caramelizada, pepinillos, cheddar. Incluye papas'],
    [85, 'Chule Pollo', 9, 24000, null, 'Chuleta, pollo, jamón, aguacate, mozarella, cheddar. Incluye papas'],
    [86, 'Chule Carne', 9, 24000, null, 'Chuleta, carne, jamón, aguacate, mozarella, cheddar. Incluye papas'],
    [87, 'Caraqueña', 9, 20000, null, 'Carne, aguacate, queso amarillo, huevo, jamón. Incluye papas'],
    [88, 'La Diabla', 9, 26000, null, 'Carne, pollo, chuleta, huevo, tocineta, mozarella, cheddar. Incluye papas'],

    // SALSAS (cat 10)
    [89, 'Salsa Napolitana', 10, 2000, '/products/salsa.png', null],
    [90, 'Salsa BBQ', 10, 2000, '/products/salsa.png', null],
    [91, 'Salsa de Ajo', 10, 2000, '/products/salsa.png', null],
    [92, 'Salsa Ranch', 10, 2000, '/products/salsa.png', null],
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
  insertItem.run(1001, 19, 'Pepperoni', 1, 43000, 'Mediana');

  insertOrder.run(1002, 'dine-in', 'preparing', 'Mesa 2', null, null, 2, 50000, 0, 50000, 'cash', 'pending', iso(10));
  insertItem.run(1002, 32, 'Suprema', 1, 50000, 'Mediana');

  insertOrder.run(1003, 'pickup', 'ready', 'Carlos Rodríguez', '3109876543', null, null, 17000, 0, 17000, 'cash', 'paid', iso(20));
  insertItem.run(1003, 81, 'Sencilla', 1, 17000, '');

  console.log('✅ Database seeded successfully');
}

module.exports = { getDb };
