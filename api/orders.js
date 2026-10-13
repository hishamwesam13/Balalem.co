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
      let rows;
      if (phone) {
        rows = await query(`
          SELECT 
            id, customer_name as "customerName", customer_phone as "customerPhone",
            city, address, items, total_price::float as "totalPrice",
            fabric_total::float as "fabricTotal", tailoring_total::float as "tailoringTotal",
            delivery_fee::float as "deliveryFee", installation_fee::float as "installationFee",
            discount::float as discount, order_status as "orderStatus",
            tailoring_status as "tailoringStatus", installation_status as "installationStatus",
            scheduled_date as "scheduledDate", scheduled_slot as "scheduledSlot",
            requires_installation as "requiresInstallation", installer_id as "installerId",
            notes, details, source, created_at as "createdAt", updated_at as "updatedAt"
          FROM orders
          WHERE customer_phone = $1
          ORDER BY created_at DESC;
        `, [phone]);
      } else {
        rows = await query(`
          SELECT 
            id, customer_name as "customerName", customer_phone as "customerPhone",
            city, address, items, total_price::float as "totalPrice",
            fabric_total::float as "fabricTotal", tailoring_total::float as "tailoringTotal",
            delivery_fee::float as "deliveryFee", installation_fee::float as "installationFee",
            discount::float as discount, order_status as "orderStatus",
            tailoring_status as "tailoringStatus", installation_status as "installationStatus",
            scheduled_date as "scheduledDate", scheduled_slot as "scheduledSlot",
            requires_installation as "requiresInstallation", installer_id as "installerId",
            notes, details, source, created_at as "createdAt", updated_at as "updatedAt"
          FROM orders
          ORDER BY created_at DESC;
        `);
      }

      const orders = (rows || []).map(row => {
        let d = {};
        if (row.details) {
          d = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;
        }

        const customerName = row.customerName || d.customer?.name || d.customerName || 'زبون المعرض';
        const customerPhone = row.customerPhone || d.customer?.phone || d.customerPhone || '';
        const city = row.city || d.customer?.city || d.city || 'نابلس';
        const address = row.address || d.customer?.address || d.address || '';

        const customer = d.customer || {
          name: customerName,
          phone: customerPhone,
          city: city,
          address: address
        };

        const grandTotal = Number(d.grandTotal || row.totalPrice || 0);
        const subtotal = Number(d.subtotal || row.fabricTotal || (grandTotal - (row.deliveryFee || 0) - (row.installationFee || 0)));

        return {
          ...d,
          id: row.id,
          customerName,
          customerPhone,
          customer,
          city,
          address,
          items: (Array.isArray(d.items) && d.items.length > 0) ? d.items : (Array.isArray(row.items) ? row.items : []),
          totalPrice: grandTotal,
          grandTotal: grandTotal,
          subtotal: subtotal,
          fabricTotal: subtotal,
          deliveryFee: Number(row.deliveryFee || d.shippingFee || 0),
          shippingFee: Number(row.deliveryFee || d.shippingFee || 0),
          installationFee: Number(row.installationFee || d.installationFee || 0),
          discount: Number(row.discount || d.discount || 0),
          orderStatus: row.orderStatus || d.orderStatus || 'pending',
          tailoringStatus: row.tailoringStatus || d.tailoringStatus || 'pending',
          installationStatus: row.installationStatus || d.installationStatus || 'pending',
          scheduledDate: row.scheduledDate || d.scheduledDate || '',
          scheduledDay: d.scheduledDay || row.scheduledSlot || '',
          requiresInstallation: (row.requiresInstallation !== undefined && row.requiresInstallation !== null)
            ? Boolean(row.requiresInstallation)
            : Boolean(d.requiresInstallation),
          installationDate: d.installationDate || row.scheduledDate || '',
          installationDay: d.installationDay || d.scheduledDay || '',
          installerId: row.installerId || d.installerId || null,
          installerName: d.installerName || null,
          deliveryType: d.deliveryType || (row.requiresInstallation ? 'delivery' : 'pickup'),
          deliveryRegion: d.deliveryRegion || row.city || 'نابلس',
          pickupBranch: d.pickupBranch || 'نابلس - باب الساحة',
          source: row.source || d.source || 'showroom',
          notebookImage: d.notebookImage || null,
          workshopPrepDate: d.workshopPrepDate || null,
          workshopPrepDay: d.workshopPrepDay || null,
          isPrepared: d.isPrepared !== undefined ? d.isPrepared : false,
          manualPreparedOverride: d.manualPreparedOverride !== undefined ? d.manualPreparedOverride : undefined,
          totalMeters: Number(d.totalMeters || 0),
          notes: row.notes || d.notes || d.customer?.notes || '',
          createdAt: row.createdAt || d.createdAt || new Date().toISOString(),
          updatedAt: row.updatedAt || d.updatedAt || new Date().toISOString()
        };
      });

      return res.status(200).json({ success: true, orders });
    }

    // POST /api/orders - create or sync order
    if (req.method === 'POST') {
      const o = req.body || {};
      // Prevent stale browser localStorage loops from resurrecting old sample data
      if (o.id === 'ORD-SHOWROOM-101' || o.source === 'paper_schedule_ai') {
        return res.status(200).json({ success: true, message: 'Sample order skipped to maintain zero baseline' });
      }

      const customerName = o.customer?.name || o.customerName || 'زبون المعرض';
      const customerPhone = o.customer?.phone || o.customerPhone || '';

      if (!customerName || !customerPhone) {
        return res.status(400).json({ success: false, error: 'Customer name and phone are required' });
      }

      const id = o.id || ('ORD-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000));
      const itemsJson = JSON.stringify(o.items || []);
      const detailsJson = JSON.stringify(o);

      await query(`
        INSERT INTO orders (
          id, customer_name, customer_phone, city, address, items,
          total_price, fabric_total, tailoring_total, delivery_fee,
          installation_fee, discount, order_status, tailoring_status,
          installation_status, scheduled_date, scheduled_slot,
          requires_installation, installer_id, notes, details, source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        ON CONFLICT (id) DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          customer_phone = EXCLUDED.customer_phone,
          city = EXCLUDED.city,
          address = EXCLUDED.address,
          items = EXCLUDED.items,
          total_price = EXCLUDED.total_price,
          fabric_total = EXCLUDED.fabric_total,
          delivery_fee = EXCLUDED.delivery_fee,
          installation_fee = EXCLUDED.installation_fee,
          order_status = EXCLUDED.order_status,
          tailoring_status = EXCLUDED.tailoring_status,
          installation_status = EXCLUDED.installation_status,
          scheduled_date = EXCLUDED.scheduled_date,
          scheduled_slot = EXCLUDED.scheduled_slot,
          requires_installation = EXCLUDED.requires_installation,
          installer_id = EXCLUDED.installer_id,
          notes = EXCLUDED.notes,
          details = EXCLUDED.details,
          source = EXCLUDED.source,
          updated_at = NOW();
      `, [
        id,
        customerName,
        customerPhone,
        o.customer?.city || o.city || 'نابلس',
        o.customer?.address || o.address || '',
        itemsJson,
        Number(o.grandTotal || o.totalPrice || 0),
        Number(o.subtotal || o.fabricTotal || 0),
        Number(o.tailoringTotal || 0),
        Number(o.shippingFee || o.deliveryFee || 0),
        Number(o.installationFee || 0),
        Number(o.discount || 0),
        o.orderStatus || 'pending',
        o.tailoringStatus || 'pending',
        o.installationStatus || 'pending',
        o.scheduledDate || o.installationDate || '',
        o.scheduledDay || o.scheduledSlot || '',
        Boolean(o.requiresInstallation),
        o.installerId || null,
        o.notes || o.customer?.notes || '',
        detailsJson,
        o.source || 'showroom'
      ]);

      // Decrement stock for ordered fabrics if requested
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
            `, [meters, fabricId]).catch(() => {});
          }
        }
      }

      return res.status(201).json({
        success: true,
        orderId: id,
        message: 'Order created successfully and saved in Neon PostgreSQL'
      });
    }

    // PUT /api/orders - update status, schedule or details
    if (req.method === 'PUT') {
      const o = req.body || {};
      if (!o.id) {
        return res.status(400).json({ success: false, error: 'Order id is required' });
      }

      // Fetch existing row to merge details JSON
      const existing = await query('SELECT details FROM orders WHERE id = $1', [o.id]);
      let currentDetails = {};
      if (existing && existing[0]?.details) {
        currentDetails = typeof existing[0].details === 'string'
          ? JSON.parse(existing[0].details)
          : existing[0].details;
      }
      const updatedDetails = { ...currentDetails, ...o };

      await query(`
        UPDATE orders SET
          order_status = COALESCE($1, order_status),
          tailoring_status = COALESCE($2, tailoring_status),
          installation_status = COALESCE($3, installation_status),
          scheduled_date = COALESCE($4, scheduled_date),
          scheduled_slot = COALESCE($5, scheduled_slot),
          installer_id = COALESCE($6, installer_id),
          notes = COALESCE($7, notes),
          details = $8,
          updated_at = NOW()
        WHERE id = $9;
      `, [
        o.orderStatus || null,
        o.tailoringStatus || null,
        o.installationStatus || null,
        o.scheduledDate || null,
        o.scheduledDay || o.scheduledSlot || null,
        o.installerId || null,
        o.notes || null,
        JSON.stringify(updatedDetails),
        o.id
      ]);

      return res.status(200).json({ success: true, message: 'Order updated successfully in Neon DB' });
    }

    // DELETE /api/orders?id=... OR /api/orders?all=true
    if (req.method === 'DELETE') {
      const isAll = req.query?.all === 'true' || req.body?.all === true;
      if (isAll) {
        await query('DELETE FROM orders;');
        return res.status(200).json({ success: true, message: 'All orders deleted successfully from Neon DB' });
      }

      const id = req.query?.id || req.body?.id;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Order id is required' });
      }

      await query('DELETE FROM orders WHERE id = $1;', [id]);
      return res.status(200).json({ success: true, message: 'Order deleted successfully from Neon DB' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in /api/orders:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
