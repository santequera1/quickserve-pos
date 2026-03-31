const { Router } = require('express');
const { getDb } = require('../db');

const router = Router();

// Helper to build customer with computed fields
function enrichCustomer(db, customer) {
  const stats = db.prepare(`
    SELECT COUNT(*) as totalOrders, COALESCE(SUM(total), 0) as totalSpent, MAX(created_at) as lastOrder
    FROM orders WHERE customer_phone = ?
  `).get(customer.phone);

  const totalOrders = stats.totalOrders || 0;
  let tag = 'new';
  if (totalOrders > 5) tag = 'frequent';
  else if (totalOrders > 0) tag = 'regular';

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    notes: customer.notes,
    totalOrders,
    totalSpent: stats.totalSpent,
    lastOrder: stats.lastOrder || '',
    tag,
  };
}

router.get('/', (req, res) => {
  const { search } = req.query;
  const db = getDb();
  let sql = 'SELECT * FROM customers';
  const params = [];

  if (search) {
    sql += ' WHERE name LIKE ? OR phone LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY name';

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(c => enrichCustomer(db, c)));
});

router.get('/phone/:phone', (req, res) => {
  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(req.params.phone);
  if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(enrichCustomer(db, customer));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(enrichCustomer(db, customer));
});

router.post('/', (req, res) => {
  const { name, phone, address = '', notes = '' } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Campos requeridos: name, phone' });

  const db = getDb();
  const existing = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
  if (existing) return res.status(409).json({ error: 'Ya existe un cliente con ese teléfono', customer: enrichCustomer(db, existing) });

  const result = db.prepare('INSERT INTO customers (name, phone, address, notes) VALUES (?, ?, ?, ?)').run(name, phone, address, notes);
  const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(enrichCustomer(db, created));
});

router.put('/:id', (req, res) => {
  const { name, phone, address, notes } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' });

  db.prepare(`
    UPDATE customers SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      address = COALESCE(?, address),
      notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(name, phone, address, notes, req.params.id);

  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  res.json(enrichCustomer(db, updated));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
