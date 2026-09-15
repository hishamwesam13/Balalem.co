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
    // 1. Create categories table
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        icon VARCHAR(32),
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Create products table
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        category VARCHAR(64) NOT NULL,
        category_name VARCHAR(128),
        price_per_meter NUMERIC(10,2) NOT NULL,
        roll_width NUMERIC(10,2) DEFAULT 300,
        stock_meters NUMERIC(10,2) DEFAULT 0,
        image TEXT,
        description TEXT,
        light_blockage VARCHAR(128),
        composition VARCHAR(255),
        origin VARCHAR(128),
        colors JSONB DEFAULT '[]'::jsonb,
        features JSONB DEFAULT '[]'::jsonb,
        rating NUMERIC(3,2) DEFAULT 5.0,
        reviews_count INT DEFAULT 0,
        is_featured BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 3. Create orders table
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(64) NOT NULL,
        city VARCHAR(128) NOT NULL,
        address TEXT,
        items JSONB NOT NULL,
        total_price NUMERIC(10,2) NOT NULL,
        fabric_total NUMERIC(10,2) DEFAULT 0,
        tailoring_total NUMERIC(10,2) DEFAULT 0,
        delivery_fee NUMERIC(10,2) DEFAULT 0,
        installation_fee NUMERIC(10,2) DEFAULT 0,
        discount NUMERIC(10,2) DEFAULT 0,
        order_status VARCHAR(64) DEFAULT 'pending',
        tailoring_status VARCHAR(64) DEFAULT 'pending',
        installation_status VARCHAR(64) DEFAULT 'pending',
        scheduled_date VARCHAR(32),
        scheduled_slot VARCHAR(64),
        requires_installation BOOLEAN DEFAULT false,
        installer_id VARCHAR(64),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 4. Create customers table
    await query(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(64) UNIQUE NOT NULL,
        email VARCHAR(255),
        password_hash TEXT,
        city VARCHAR(128),
        loyalty_points INT DEFAULT 50,
        saved_measurements JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 5. Seed categories if empty
    const catCheck = await query('SELECT COUNT(*)::int as count FROM categories;');
    if (catCheck[0]?.count === 0) {
      const categories = [
        ['all', 'كافة أقمشة الستائر', '🪟', true],
        ['crepe', 'كريب ستائر مسدل', '✨', true],
        ['linen', 'كتان طبيعي راقي', '🌾', true],
        ['tulle', 'تول وشيفون فوال', '🪡', true],
        ['velvet', 'مخمل وبلاك آوت', '👑', true],
        ['brocade', 'بروكار وجاكار كلاسيك', '🏛️', true],
        ['tarsoon', 'ستائر الترسون (بالمتر المربع)', '📐', true]
      ];
      for (const [id, name, icon, isDef] of categories) {
        await query(
          'INSERT INTO categories (id, name, icon, is_default) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING;',
          [id, name, icon, isDef]
        );
      }
    }

    // 6. Seed products if empty
    const prodCheck = await query('SELECT COUNT(*)::int as count FROM products;');
    if (prodCheck[0]?.count === 0) {
      const initialProducts = [
        {
          id: 'fab-1',
          name: 'كريب ستائر رويال مسدل',
          name_en: 'Royal Draped Crepe Curtain',
          category: 'crepe',
          category_name: 'أقمشة كريب',
          price_per_meter: 65,
          roll_width: 300,
          stock_meters: 450,
          image: 'assets/images/curtain_crepe.jpg',
          description: 'قماش كريب ستائر فاخر بتموجات انسيابية ثقيلة وملمس رملي ناعم، مقاوم للانكماش والتجعد، مثالي للصالات وغرف الجلوس الراقية.',
          light_blockage: '65% (حجب معتدل للضوء)',
          composition: '100% بوليستر كريب معالج',
          origin: 'تركيا (إسطنبول)',
          colors: JSON.stringify([
            { name: 'بيج رملي', hex: '#d2b48c' },
            { name: 'أوف وايت', hex: '#fdfbf7' },
            { name: 'رمادي لؤلؤي', hex: '#c5c6c7' },
            { name: 'عسلي دافئ', hex: '#c69d67' }
          ]),
          features: JSON.stringify(['انسيابية عالية وسقوط طبيعي', 'غسيل منزلي سهل', 'مقاوم للشمس والبهتان']),
          rating: 4.9,
          reviews_count: 38,
          is_featured: true
        },
        {
          id: 'fab-2',
          name: 'كتان هولندي طبيعي ناعم',
          name_en: 'Dutch Natural Soft Linen',
          category: 'linen',
          category_name: 'أقمشة كتان',
          price_per_meter: 85,
          roll_width: 280,
          stock_meters: 320,
          image: 'assets/images/curtain_linen_sage.jpg',
          description: 'كتان منسوج نخب أول بنفحة طبيعية مريحة، يمرر الهواء والضوء بنعومة فائقة، متوفر بلون أخضر مريمي (سيج) مريح للأعصاب.',
          light_blockage: '40% (تصفية ضوء ناعمة)',
          composition: '80% ألياف كتان طبيعي، 20% قطن عضوي',
          origin: 'بلجيكا / هولندا',
          colors: JSON.stringify([
            { name: 'أخضر مريمي (سيج)', hex: '#879f84' },
            { name: 'كتاني طبيعي خام', hex: '#d9cdb8' },
            { name: 'أبيض عاجي', hex: '#f7f6f2' },
            { name: 'رمادي ترابي', hex: '#9e978e' }
          ]),
          features: JSON.stringify(['ملمس عضوي طبيعي', 'صديق للبيئة ومضاد للحساسية', 'يمنح المكان رحابة ودفئاً']),
          rating: 4.8,
          reviews_count: 52,
          is_featured: true
        },
        {
          id: 'fab-3',
          name: 'تول ستائر فوال إيطالي مطرّز',
          name_en: 'Italian Sheer Voile Tulle',
          category: 'tulle',
          category_name: 'أقمشة تول وشيفون',
          price_per_meter: 48,
          roll_width: 320,
          stock_meters: 600,
          image: 'assets/images/curtain_tulle.jpg',
          description: 'تول ستائر شفاف فائق النعومة، يمنح النوافذ هالة ضوئية ساحرة مع خصوصية أنيقة نهاراً، خفيف الوزن وذو مظهر أرستقراطي ناصع.',
          light_blockage: '15% (شفاف يمرر أشعة الشمس المفلترة)',
          composition: '100% ميكروفيبر فوال حريري',
          origin: 'إيطاليا',
          colors: JSON.stringify([
            { name: 'أبيض ثلجي', hex: '#ffffff' },
            { name: 'عاجي سكري', hex: '#fff8ea' },
            { name: 'شامبين شاحب', hex: '#f3e5ab' }
          ]),
          features: JSON.stringify(['شفافية راقية ورومانسية', 'لا يتطلب كوي متكرر', 'عرض كبير 320 سم مناسب للأسقف المرتفعة']),
          rating: 5.0,
          reviews_count: 64,
          is_featured: true
        },
        {
          id: 'fab-4',
          name: 'مخمل ستائر بلاك آوت عازل ملكي',
          name_en: 'Royal Velvet Blackout Curtain',
          category: 'velvet',
          category_name: 'أقمشة مخمل وبلاك آوت',
          price_per_meter: 110,
          roll_width: 300,
          stock_meters: 210,
          image: 'assets/images/curtain_velvet_navy.jpg',
          description: 'مخمل إمبراطوري فخم مدعم بطبقة عزل حراري وصوتي 3 طبقات، حجب كامل للضوء 100%، مثالي لغرف النوم الفاخرة والسينما المنزلية.',
          light_blockage: '100% (تعتيم وبلاك آوت تام)',
          composition: 'مخمل كوري كثيف + طبقة عازلة حرارية ثلاثية',
          origin: 'كوريا الجنوبية',
          colors: JSON.stringify([
            { name: 'كحلي ملكي', hex: '#1e3a8a' },
            { name: 'رمادي فحمي', hex: '#374151' },
            { name: 'زيتي عميق', hex: '#1c3d2e' },
            { name: 'نبيذي بورغندي', hex: '#581c26' }
          ]),
          features: JSON.stringify(['عزل صوتي وحراري فائق', 'حجب 100% لأشعة الشمس', 'وزن ثقيل وسقوط مستقيم']),
          rating: 4.9,
          reviews_count: 41,
          is_featured: true
        },
        {
          id: 'fab-5',
          name: 'جاكار بروكار كلاسيكي دمشقي',
          name_en: 'Classic Damask Jacquard Brocade',
          category: 'brocade',
          category_name: 'أقمشة بروكار وجاكار',
          price_per_meter: 95,
          roll_width: 290,
          stock_meters: 180,
          image: 'assets/images/curtain_brocade_gold.jpg',
          description: 'قماش جاكار أصيل منقوش بزخارف دمشقية أندلسية محفورة بخيوط ذهبية ناعمة، يضفي هيبة وفخامة قصور على صالونات الضيوف.',
          light_blockage: '75% (حجب ضوء ممتاز)',
          composition: '65% بوليستر، 35% حرير صناعي منسوج',
          origin: 'سوريا / تركيا',
          colors: JSON.stringify([
            { name: 'ذهبي كلاسيكي', hex: '#d4af37' },
            { name: 'برونزي معتق', hex: '#8c6d3b' },
            { name: 'أزرق ملكي مع ذهبي', hex: '#1d3557' }
          ]),
          features: JSON.stringify(['نقوش بارزة فخمة مقاومة للاهتراء', 'مظهر ملكي للصالونات الكلاسيكية', 'متانة تدوم لسنوات طويلة']),
          rating: 4.9,
          reviews_count: 29,
          is_featured: true
        },
        {
          id: 'fab-6',
          name: 'ستائر الترسون والزيبرا التركية (بالمتر المربع)',
          name_en: 'Turkish Zebra & Roller Tarsoon Curtains',
          category: 'tarsoon',
          category_name: 'ستائر ترسون وزيبرا',
          price_per_meter: 130,
          roll_width: 260,
          stock_meters: 500,
          image: 'assets/images/curtain_zebra_beige.jpg',
          description: 'نظام ستائر الترسون والزيبرا العصرية بشرائح مزدوجة تتيح التحكم الدقيق بنسبة الإضاءة والخصوصية بسهولة تامة.',
          light_blockage: 'شرائح مزدوجة (تعتيم وتمرير ضوء قابل للتعديل)',
          composition: '100% بوليستر معالج مقاوم للغبار والرطوبة',
          origin: 'تركيا',
          colors: JSON.stringify([
            { name: 'بيج رملي دافئ', hex: '#cbb69d' },
            { name: 'أبيض ناصع', hex: '#f8f9fa' },
            { name: 'رمادي عصري', hex: '#6c757d' },
            { name: 'رمادي غامق فحم', hex: '#343a40' }
          ]),
          features: JSON.stringify(['حساب التكلفة بالمتر المربع (عرض × ارتفاع)', 'ميكانيزم ألمنيوم تركي نخب أول هادئ وسلس', 'مقاوم للرطوبة والغبار وسهل التنظيف بقطعة قماش']),
          rating: 4.9,
          reviews_count: 47,
          is_featured: true
        }
      ];

      for (const p of initialProducts) {
        await query(`
          INSERT INTO products (
            id, name, name_en, category, category_name, price_per_meter,
            roll_width, stock_meters, image, description, light_blockage,
            composition, origin, colors, features, rating, reviews_count, is_featured
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT (id) DO NOTHING;
        `, [
          p.id, p.name, p.name_en, p.category, p.category_name, p.price_per_meter,
          p.roll_width, p.stock_meters, p.image, p.description, p.light_blockage,
          p.composition, p.origin, p.colors, p.features, p.rating, p.reviews_count, p.is_featured
        ]);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Neon PostgreSQL database initialized and seeded successfully.',
      tables: ['categories', 'products', 'orders', 'customers']
    });
  } catch (error) {
    console.error('Error initializing Neon database:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
