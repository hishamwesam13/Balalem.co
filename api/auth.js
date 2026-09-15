import { query } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const action = req.query?.action || req.body?.action;

    // GET /api/auth?phone=0599... - get customer profile
    if (req.method === 'GET') {
      const phone = req.query?.phone;
      if (!phone) {
        return res.status(400).json({ success: false, error: 'Phone number is required' });
      }

      const rows = await query(`
        SELECT id, name, phone, email, city, loyalty_points as "loyaltyPoints", saved_measurements as "savedMeasurements", created_at as "createdAt"
        FROM customers
        WHERE phone = $1
        LIMIT 1;
      `, [phone]);

      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }

      return res.status(200).json({ success: true, customer: rows[0] });
    }

    // POST /api/auth?action=register
    if (req.method === 'POST' && action === 'register') {
      const { name, phone, email, password, city } = req.body || {};
      if (!name || !phone) {
        return res.status(400).json({ success: false, error: 'Name and phone are required' });
      }

      const id = 'cust-' + Date.now();
      const loyaltyPoints = 50; // Welcome reward bonus

      const result = await query(`
        INSERT INTO customers (id, name, phone, email, password_hash, city, loyalty_points)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (phone) DO UPDATE SET
          name = EXCLUDED.name,
          city = COALESCE(EXCLUDED.city, customers.city)
        RETURNING id, name, phone, email, city, loyalty_points as "loyaltyPoints";
      `, [id, name, phone, email || '', password || '', city || 'نابلس', loyaltyPoints]);

      return res.status(201).json({
        success: true,
        customer: result[0],
        message: 'Account created successfully in Neon PostgreSQL'
      });
    }

    // POST /api/auth?action=points - update loyalty points
    if (req.method === 'POST' && action === 'points') {
      const { phone, deltaPoints } = req.body || {};
      if (!phone || deltaPoints === undefined) {
        return res.status(400).json({ success: false, error: 'Phone and deltaPoints are required' });
      }

      const result = await query(`
        UPDATE customers
        SET loyalty_points = GREATEST(0, loyalty_points + $1)
        WHERE phone = $2
        RETURNING id, name, phone, loyalty_points as "loyaltyPoints";
      `, [Number(deltaPoints), phone]);

      return res.status(200).json({
        success: true,
        customer: result[0] || null,
        message: 'Points updated'
      });
    }

    return res.status(400).json({ success: false, error: 'Unsupported action' });
  } catch (error) {
    console.error('Error in /api/auth:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
