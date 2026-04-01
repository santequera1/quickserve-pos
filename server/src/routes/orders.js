const { Router } = require('express');
const { getDb } = require('../db');
const path = require('path');
const fs = require('fs');

const router = Router();

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function formatOrder(db, order) {
  const items = db.prepare(
    'SELECT product_id AS productId, name, quantity, price, notes FROM order_items WHERE order_id = ?'
  ).all(order.id);

  return {
    id: order.id,
    type: order.type,
    status: order.status,
    customer: {
      name: order.customer_name,
      phone: order.customer_phone || undefined,
      address: order.customer_address || undefined,
    },
    tableNumber: order.table_number || undefined,
    items,
    subtotal: order.subtotal,
    deliveryFee: order.delivery_fee,
    total: order.total,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    createdAt: order.created_at,
    driverId: order.driver_id || undefined,
    receiptImage: order.receipt_image || undefined,
    notes: order.notes || '',
  };
}

router.get('/', (req, res) => {
  const { status, search } = req.query;
  const db = getDb();
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];

  if (status && status !== 'all') {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (CAST(id AS TEXT) LIKE ? OR customer_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(o => formatOrder(db, o)));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.json(formatOrder(db, order));
});

router.post('/', (req, res) => {
  const { type, status = 'pending', customer, tableNumber, items, subtotal, deliveryFee = 0, total, paymentMethod, paymentStatus = 'pending', receiptImage } = req.body;

  if (!type || !customer || !items || !items.length || !paymentMethod) {
    return res.status(400).json({ error: 'Campos requeridos: type, customer, items, paymentMethod' });
  }

  const db = getDb();

  const result = db.prepare(`
    INSERT INTO orders (type, status, customer_name, customer_phone, customer_address, table_number, subtotal, delivery_fee, total, payment_method, payment_status, receipt_image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    type, status,
    customer.name, customer.phone || null, customer.address || null,
    tableNumber || null,
    subtotal, deliveryFee, total,
    paymentMethod, paymentStatus,
    receiptImage || null
  );

  const orderId = result.lastInsertRowid;
  const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, name, quantity, price, notes) VALUES (?, ?, ?, ?, ?, ?)');
  for (const item of items) {
    insertItem.run(orderId, item.productId, item.name, item.quantity, item.price, item.notes || '');
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const formatted = formatOrder(db, order);

  // Emit to socket.io if available
  if (req.app.io) {
    req.app.io.emit('order:new', formatted);
  }

  res.status(201).json(formatted);
});

router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'ready', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  const formatted = formatOrder(db, updated);

  // Emit to socket.io
  if (req.app.io) {
    req.app.io.emit('order:updated', formatted);
  }

  res.json(formatted);
});

router.patch('/:id/driver', (req, res) => {
  const { driverId } = req.body;
  const db = getDb();
  db.prepare('UPDATE orders SET driver_id = ? WHERE id = ?').run(driverId, req.params.id);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  const formatted = formatOrder(db, order);
  if (req.app.io) req.app.io.emit('order:updated', formatted);
  res.json(formatted);
});

// Update payment status and optionally payment method
router.patch('/:id/payment', (req, res) => {
  const { paymentStatus, paymentMethod } = req.body;
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

  if (paymentMethod) {
    db.prepare('UPDATE orders SET payment_status = ?, payment_method = ? WHERE id = ?').run(paymentStatus, paymentMethod, req.params.id);
  } else {
    db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(paymentStatus, req.params.id);
  }

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  const formatted = formatOrder(db, updated);
  if (req.app.io) req.app.io.emit('order:updated', formatted);
  res.json(formatted);
});

// Update customer info on an order (useful for dine-in orders)
router.patch('/:id/customer', (req, res) => {
  const { name, phone, address } = req.body;
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

  db.prepare('UPDATE orders SET customer_name = ?, customer_phone = ?, customer_address = ? WHERE id = ?')
    .run(name || order.customer_name, phone || order.customer_phone, address || order.customer_address, req.params.id);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  const formatted = formatOrder(db, updated);
  if (req.app.io) req.app.io.emit('order:updated', formatted);
  res.json(formatted);
});

// Upload receipt image (base64)
router.patch('/:id/receipt', (req, res) => {
  const { receiptImage } = req.body;
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

  db.prepare('UPDATE orders SET receipt_image = ? WHERE id = ?').run(receiptImage, req.params.id);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  const formatted = formatOrder(db, updated);
  res.json(formatted);
});

// Update notes
router.patch('/:id/notes', (req, res) => {
  const { notes } = req.body;
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

  db.prepare('UPDATE orders SET notes = ? WHERE id = ?').run(notes || '', req.params.id);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  const formatted = formatOrder(db, updated);
  res.json(formatted);
});

// Delete order
router.delete('/:id', (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

  db.prepare('DELETE FROM order_items WHERE order_id = ?').run(req.params.id);
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);

  if (req.app.io) {
    req.app.io.emit('order:deleted', { id: Number(req.params.id) });
  }

  res.json({ success: true });
});

module.exports = router;
