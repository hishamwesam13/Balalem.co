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
    // GET /api/orders
    if (req.method === 'GET') {
      const phone = req.query?.phone;
      let orders;
      if (phone) {
        orders = await query(`
          SELECT 
            id, customer_name as "customerName", customer_phone as "customerPhone",
            city, address, items, total_price::float as "totalPrice",
            fabric_total::float as "fabricTotal", tailoring_total::float as "tailoringTotal",
            delivery_fee::float as "deliveryFee", installation_fee::float as "installationFee",
            discount::float as discount, order_status as "orderStatus",
            tailoring_status as "tailoringStatus", installation_status as "installationStatus",
            scheduled_date as "scheduledDate", scheduled_slot as "scheduledSlot",
            requires_installation as "requiresInstallation", installer_id as "installerId",
            notes, created_at as "createdAt", updated_at as "updatedAt"
          FROM orders
          WHERE customer_phone = $1
          ORDER BY created_at DESC;
        `, [phone]);
      } else {
        orders = await query(`
          SELECT 
            id, customer_name as "customerName", customer_phone as "customerPhone",
            city, address, items, total_price::float as "totalPrice",
            fabric_total::float as "fabricTotal", tailoring_total::float as "tailoringTotal",
            delivery_fee::float as "deliveryFee", installation_fee::float as "installationFee",
            discount::float as discount, order_status as "orderStatus",
            tailoring_status as "tailoringStatus", installation_status as "installationStatus",
            scheduled_date as "scheduledDate", scheduled_slot as "scheduledSlot",
            requires_installation as "requiresInstallation", installer_id as "installerId",
            notes, created_at as "createdAt", updated_at as "updatedAt"
          FROM orders
          ORDER BY created_at DESC;
        `);
      }

      return res.status(200).json({ success: true, orders: orders || [] });
    }

    // POST /api/orders - create new order
    if (req.method === 'POST') {
      const o = req.body || {};
      if (!o.customerName || !o.customerPhone) {
        return res.status(400).json({ success: false, error: 'Customer name and phone are required' });
      }

      const id = o.id || ('ORD-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000));
      const itemsJson = JSON.stringify(o.items || []);

      await query(`
        INSERT INTO orders (
          id, customer_name, customer_phone, city, address, items,
          total_price, fabric_total, tailoring_total, delivery_fee,
          installation_fee, discount, order_status, tailoring_status,
          installation_status, scheduled_date, scheduled_slot,
          requires_installation, installer_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (id) DO UPDATE SET
          order_status = EXCLUDED.order_status,
          tailoring_status = EXCLUDED.tailoring_status,
          installation_status = EXCLUDED.installation_status,
          scheduled_date = EXCLUDED.scheduled_date,
          scheduled_slot = EXCLUDED.scheduled_slot,
          installer_id = EXCLUDED.installer_id,
          notes = EXCLUDED.notes,
          updated_at = NOW();
      `, [
        id, o.customerName, o.customerPhone, o.city || 'نابلس', o.address || '',
        itemsJson, Number(o.totalPrice || 0), Number(o.fabricTotal || 0),
        Number(o.tailoringTotal || 0), Number(o.deliveryFee || 0),
        Number(o.installationFee || 0), Number(o.discount || 0),
        o.orderStatus || 'pending', o.tailoringStatus || 'pending',
        o.installationStatus || 'pending', o.scheduledDate || '',
        o.scheduledSlot || '', Boolean(o.requiresInstallation),
        o.installerId || null, o.notes || ''
      ]);

      // Decrement stock for ordered fabrics
      if (Array.isArray(o.items)) {
        for (const item of o.items) {
          const fabricId = item.fabricId || item.id;
          const meters = Number(item.meters || item.totalMeters || item.quantity || 0);
          if (fabricId && meters > 0) {
            await query(`
              UPDATE products
              SET stock_meters = GREATEST(0, stock_meters - $1),
                  updated_at = NOW()
              WHERE id = $2;
            `, [meters, fabricId]);
          }
        }
      }

      return res.status(201).json({
        success: true,
        orderId: id,
        message: 'Order created successfully and saved in Neon PostgreSQL'
      });
    }

    // PUT /api/orders - update status or schedule
    if (req.method === 'PUT') {
      const o = req.body || {};
      if (!o.id) {
        return res.status(400).json({ success: false, error: 'Order id is required' });
      }

      await query(`
        UPDATE orders SET
          order_status = COALESCE($1, order_status),
          tailoring_status = COALESCE($2, tailoring_status),
          installation_status = COALESCE($3, installation_status),
          scheduled_date = COALESCE($4, scheduled_date),
          scheduled_slot = COALESCE($5, scheduled_slot),
          installer_id = COALESCE($6, installer_id),
          notes = COALESCE($7, notes),
          updated_at = NOW()
        WHERE id = $8;
      `, [
        o.orderStatus || null, o.tailoringStatus || null, o.installationStatus || null,
        o.scheduledDate || null, o.scheduledSlot || null, o.installerId || null,
        o.notes || null, o.id
      ]);

      return res.status(200).json({ success: true, message: 'Order updated successfully' });
    }

    // DELETE /api/orders?id=...
    if (req.method === 'DELETE') {
      const id = req.query?.id || req.body?.id;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Order id is required' });
      }

      await query('DELETE FROM orders WHERE id = $1;', [id]);
      return res.status(200).json({ success: true, message: 'Order deleted successfully' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in /api/orders:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
