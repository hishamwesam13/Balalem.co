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
    // GET /api/products - list all products & categories
    if (req.method === 'GET') {
      const products = await query(`
        SELECT 
          id, name, name_en as "nameEn", category, category_name as "categoryName",
          price_per_meter::float as "pricePerMeter", roll_width::float as "rollWidth",
          stock_meters::float as "stockMeters", image, description,
          light_blockage as "lightBlockage", composition, origin,
          colors, features, rating::float as rating, reviews_count as "reviewsCount",
          is_featured as "isFeatured", created_at as "createdAt"
        FROM products 
        ORDER BY created_at ASC;
      `);

      const categories = await query(`
        SELECT id, name, icon, is_default as "isDefault" FROM categories ORDER BY id ASC;
      `);

      return res.status(200).json({
        success: true,
        products: products || [],
        categories: categories || []
      });
    }

    // POST /api/products - add new product
    if (req.method === 'POST') {
      const p = req.body || {};
      if (!p.name || !p.pricePerMeter) {
        return res.status(400).json({ success: false, error: 'Name and pricePerMeter are required' });
      }

      const id = p.id || ('fab-' + Date.now());
      const colorsJson = JSON.stringify(p.colors || []);
      const featuresJson = JSON.stringify(p.features || []);

      await query(`
        INSERT INTO products (
          id, name, name_en, category, category_name, price_per_meter,
          roll_width, stock_meters, image, description, light_blockage,
          composition, origin, colors, features, rating, reviews_count, is_featured
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          name_en = EXCLUDED.name_en,
          category = EXCLUDED.category,
          category_name = EXCLUDED.category_name,
          price_per_meter = EXCLUDED.price_per_meter,
          roll_width = EXCLUDED.roll_width,
          stock_meters = EXCLUDED.stock_meters,
          image = EXCLUDED.image,
          description = EXCLUDED.description,
          light_blockage = EXCLUDED.light_blockage,
          composition = EXCLUDED.composition,
          origin = EXCLUDED.origin,
          colors = EXCLUDED.colors,
          features = EXCLUDED.features,
          is_featured = EXCLUDED.is_featured,
          updated_at = NOW();
      `, [
        id, p.name, p.nameEn || '', p.category || 'crepe', p.categoryName || 'أقمشة ستائر',
        Number(p.pricePerMeter), Number(p.rollWidth || 300), Number(p.stockMeters || 0),
        p.image || 'assets/images/curtain_crepe.jpg', p.description || '',
        p.lightBlockage || '', p.composition || '', p.origin || '',
        colorsJson, featuresJson, Number(p.rating || 5.0),
        Number(p.reviewsCount || 0), p.isFeatured !== false
      ]);

      return res.status(201).json({ success: true, id: id, message: 'Product created/updated successfully' });
    }

    // PUT /api/products - update product or adjust stock
    if (req.method === 'PUT') {
      const p = req.body || {};
      if (!p.id) {
        return res.status(400).json({ success: false, error: 'Product id is required' });
      }

      // Stock meters adjustment
      if (p.deltaStock !== undefined) {
        await query(`
          UPDATE products
          SET stock_meters = GREATEST(0, stock_meters + $1),
              updated_at = NOW()
          WHERE id = $2;
        `, [Number(p.deltaStock), p.id]);
        return res.status(200).json({ success: true, message: 'Stock updated successfully' });
      }

      const colorsJson = JSON.stringify(p.colors || []);
      const featuresJson = JSON.stringify(p.features || []);

      await query(`
        UPDATE products SET
          name = COALESCE($1, name),
          name_en = COALESCE($2, name_en),
          category = COALESCE($3, category),
          category_name = COALESCE($4, category_name),
          price_per_meter = COALESCE($5, price_per_meter),
          roll_width = COALESCE($6, roll_width),
          stock_meters = COALESCE($7, stock_meters),
          image = COALESCE($8, image),
          description = COALESCE($9, description),
          light_blockage = COALESCE($10, light_blockage),
          composition = COALESCE($11, composition),
          origin = COALESCE($12, origin),
          colors = $13,
          features = $14,
          is_featured = COALESCE($15, is_featured),
          updated_at = NOW()
        WHERE id = $16;
      `, [
        p.name || null, p.nameEn || null, p.category || null, p.categoryName || null,
        p.pricePerMeter !== undefined ? Number(p.pricePerMeter) : null,
        p.rollWidth !== undefined ? Number(p.rollWidth) : null,
        p.stockMeters !== undefined ? Number(p.stockMeters) : null,
        p.image || null, p.description || null,
        p.lightBlockage || null, p.composition || null, p.origin || null,
        colorsJson, featuresJson,
        p.isFeatured !== undefined ? p.isFeatured : null,
        p.id
      ]);

      return res.status(200).json({ success: true, message: 'Product updated successfully' });
    }

    // DELETE /api/products?id=...
    if (req.method === 'DELETE') {
      const id = req.query?.id || req.body?.id;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Product id is required' });
      }

      await query('DELETE FROM products WHERE id = $1;', [id]);
      return res.status(200).json({ success: true, message: 'Product deleted successfully' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in /api/products:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
