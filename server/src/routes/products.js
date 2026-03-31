const { Router } = require('express');
const { getDb } = require('../db');
const { requireRole } = require('../auth');

const router = Router();

router.get('/', (req, res) => {
  const { category, search } = req.query;
  let sql = 'SELECT id, name, category_id AS categoryId, price, available, image, description FROM products WHERE 1=1';
  const params = [];

  if (category) {
    sql += ' AND category_id = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }
  sql += ' ORDER BY category_id, id';

  const rows = getDb().prepare(sql).all(...params);
  // Convert available from 0/1 to boolean
  res.json(rows.map(r => ({ ...r, available: !!r.available })));
});

router.post('/', requireRole('admin', 'cashier'), (req, res) => {
  const { name, categoryId, price, available = true, image = null, description = null } = req.body;
  if (!name || !categoryId || price == null) {
    return res.status(400).json({ error: 'Campos requeridos: name, categoryId, price' });
  }
  const result = getDb().prepare(
    'INSERT INTO products (name, category_id, price, available, image, description) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, categoryId, price, available ? 1 : 0, image, description);

  res.status(201).json({ id: result.lastInsertRowid, name, categoryId, price, available, image, description });
});

router.put('/:id', requireRole('admin', 'cashier'), (req, res) => {
  const { name, categoryId, price, available, image, description } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });

  db.prepare(`
    UPDATE products SET
      name = COALESCE(?, name),
      category_id = COALESCE(?, category_id),
      price = COALESCE(?, price),
      available = COALESCE(?, available),
      image = COALESCE(?, image),
      description = COALESCE(?, description)
    WHERE id = ?
  `).run(name, categoryId, price, available != null ? (available ? 1 : 0) : null, image, description, req.params.id);

  const updated = db.prepare('SELECT id, name, category_id AS categoryId, price, available, image, description FROM products WHERE id = ?').get(req.params.id);
  res.json({ ...updated, available: !!updated.available });
});

router.patch('/:id/availability', requireRole('admin', 'cashier'), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE products SET available = NOT available WHERE id = ?').run(req.params.id);
  const product = db.prepare('SELECT id, name, category_id AS categoryId, price, available, image, description FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json({ ...product, available: !!product.available });
});

module.exports = router;
