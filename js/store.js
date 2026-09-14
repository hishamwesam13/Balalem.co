/**
 * NASEEJ LUXURY CURTAIN FABRICS - STORE & DATA PERSISTENCE
 * Manages products (fabrics), customer accounts, orders, and stats.
 */

const STORAGE_KEYS = {
  PRODUCTS: 'naseej_fabrics_products',
  ORDERS: 'naseej_fabrics_orders',
  CURRENT_USER: 'naseej_current_user',
  CUSTOMERS: 'naseej_customers',
  CART: 'naseej_cart',
  CATEGORIES: 'naseej_categories'
};

// Initial Store Categories & Filter Bubbles (الفقاعات)
const INITIAL_CATEGORIES = [
  { id: 'all', name: 'كافة أقمشة الستائر', icon: '🪟', isDefault: true },
  { id: 'crepe', name: 'كريب ستائر مسدل', icon: '✨', isDefault: true },
  { id: 'linen', name: 'كتان طبيعي راقي', icon: '🌾', isDefault: true },
  { id: 'tulle', name: 'تول وشيفون فوال', icon: '🪡', isDefault: true },
  { id: 'velvet', name: 'مخمل وبلاك آوت', icon: '👑', isDefault: true },
  { id: 'brocade', name: 'بروكار وجاكار كلاسيك', icon: '🏛️', isDefault: true },
  { id: 'tarsoon', name: 'ستائر الترسون (بالمتر المربع)', icon: '📐', isDefault: true }
];

// Initial Seed Data: Premium Curtain & Drapery Fabrics
const INITIAL_PRODUCTS = [
  {
    id: 'fab-1',
    name: 'كريب ستائر رويال مسدل',
    nameEn: 'Royal Draped Crepe Curtain',
    category: 'crepe',
    categoryName: 'أقمشة كريب',
    pricePerMeter: 65,
    rollWidth: 300,
    stockMeters: 450,
    image: 'assets/images/curtain_crepe.jpg',
    description: 'قماش كريب ستائر فاخر بتموجات انسيابية ثقيلة وملمس رملي ناعم، مقاوم للانكماش والتجعد، مثالي للصالات وغرف الجلوس الراقية.',
    lightBlockage: '65% (حجب معتدل للضوء)',
    composition: '100% بوليستر كريب معالج',
    origin: 'تركيا (إسطنبول)',
    colors: [
      { name: 'بيج رملي', hex: '#d2b48c' },
      { name: 'أوف وايت', hex: '#fdfbf7' },
      { name: 'رمادي لؤلؤي', hex: '#c5c6c7' },
      { name: 'عسلي دافئ', hex: '#c69d67' }
    ],
    features: ['انسيابية عالية وسقوط طبيعي', 'غسيل منزلي سهل', 'مقاوم للشمس والبهتان'],
    rating: 4.9,
    reviewsCount: 38,
    isFeatured: true
  },
  {
    id: 'fab-2',
    name: 'كتان هولندي طبيعي ناعم',
    nameEn: 'Dutch Natural Soft Linen',
    category: 'linen',
    categoryName: 'أقمشة كتان',
    pricePerMeter: 85,
    rollWidth: 280,
    stockMeters: 320,
    image: 'assets/images/curtain_linen_sage.jpg',
    description: 'كتان منسوج نخب أول بنفحة طبيعية مريحة، يمرر الهواء والضوء بنعومة فائقة، متوفر بلون أخضر مريمي (سيج) مريح للأعصاب.',
    lightBlockage: '40% (تصفية ضوء ناعمة)',
    composition: '80% ألياف كتان طبيعي، 20% قطن عضوي',
    origin: 'بلجيكا / هولندا',
    colors: [
      { name: 'أخضر مريمي (سيج)', hex: '#879f84' },
      { name: 'كتاني طبيعي خام', hex: '#d9cdb8' },
      { name: 'أبيض عاجي', hex: '#f7f6f2' },
      { name: 'رمادي ترابي', hex: '#9e978e' }
    ],
    features: ['ملمس عضوي طبيعي', 'صديق للبيئة ومضاد للحساسية', 'يمنح المكان رحابة ودفئاً'],
    rating: 4.8,
    reviewsCount: 52,
    isFeatured: true
  },
  {
    id: 'fab-3',
    name: 'تول ستائر فوال إيطالي مطرّز',
    nameEn: 'Italian Sheer Voile Tulle',
    category: 'tulle',
    categoryName: 'أقمشة تول وشيفون',
    pricePerMeter: 48,
    rollWidth: 320,
    stockMeters: 600,
    image: 'assets/images/curtain_tulle.jpg',
    description: 'تول ستائر شفاف فائق النعومة، يمنح النوافذ هالة ضوئية ساحرة مع خصوصية أنيقة نهاراً، خفيف الوزن وذو مظهر أرستقراطي ناصع.',
    lightBlockage: '15% (شفاف يمرر أشعة الشمس المفلترة)',
    composition: '100% ميكروفيبر فوال حريري',
    origin: 'إيطاليا',
    colors: [
      { name: 'أبيض ثلجي', hex: '#ffffff' },
      { name: 'عاجي سكري', hex: '#fff8ea' },
      { name: 'شامبين شاحب', hex: '#f3e5ab' }
    ],
    features: ['شفافية راقية ورومانسية', 'لا يتطلب كوي متكرر', 'عرض كبير 320 سم مناسب للأسقف المرتفعة'],
    rating: 5.0,
    reviewsCount: 64,
    isFeatured: true
  },
  {
    id: 'fab-4',
    name: 'مخمل ملكي بلاك آوت عازل',
    nameEn: 'Royal Blackout Velvet Drapery',
    category: 'velvet',
    categoryName: 'أقمشة مخمل وبلاك آوت',
    pricePerMeter: 98,
    rollWidth: 280,
    stockMeters: 280,
    image: 'assets/images/curtain_velvet.jpg',
    description: 'مخمل كثيف ثقيل ذو وبر فاخر مع بطانة عازلة للضوء والصوت والحرارة بنسبة 100%، يمنح الغرفة هيبة وقواماً ملكياً لا مثيل له.',
    lightBlockage: '100% (بلاك آوت تام عازل للصوت والحرارة)',
    composition: 'مخمل بوليستر بريميوم معالج بتقنية النانو',
    origin: 'ألمانيا',
    colors: [
      { name: 'نبيذي ملكي (بورغندي)', hex: '#58111a' },
      { name: 'أزرق كحلي داكن', hex: '#111d38' },
      { name: 'زمردي عميق', hex: '#0f382a' },
      { name: 'رمادي فحمي', hex: '#2b2b2b' }
    ],
    features: ['عزل تام لأشعة الشمس والحرارة', 'تقليل صدى الصوت والضوضاء', 'لمعة مخملية مخملية فارهة'],
    rating: 4.9,
    reviewsCount: 45,
    isFeatured: true
  },
  {
    id: 'fab-5',
    name: 'بروكار وجاكار دمشقي كلاسيكي',
    nameEn: 'Classic Damask Brocade Drapery',
    category: 'brocade',
    categoryName: 'أقمشة بروكار وجاكار',
    pricePerMeter: 120,
    rollWidth: 280,
    stockMeters: 190,
    image: 'assets/images/curtain_brocade.jpg',
    description: 'نسيج جاكار أصيل مدموج بخيوط ميتاليك مذهبة بنقوش الزخرفة الأندلسية الكلاسيكية، مخصص للقصور والمجالس الفخمة والستائر ذات الدرابيه.',
    lightBlockage: '85% (حجب عالي مع خلفية ثقيلة)',
    composition: '65% حرير صناعي، 35% خيوط جاكار معدنية',
    origin: 'سوريا (دمشق)',
    colors: [
      { name: 'كحلي مذهب', hex: '#192841' },
      { name: 'بيج ذهبي ملوكي', hex: '#c8a257' },
      { name: 'فضي زبرجدي', hex: '#a8b0b2' }
    ],
    features: ['تطريز بروكار بارز ثلاثي الأبعاد', 'سماكة وثبات عالي للدرابيه', 'قيمة جمالية تراثية فريدة'],
    rating: 4.9,
    reviewsCount: 29,
    isFeatured: false
  },
  {
    id: 'fab-6',
    name: 'كتان خام ريفي بألياف طبيعية',
    nameEn: 'Rustic Woven Raw Linen',
    category: 'linen',
    categoryName: 'أقمشة كتان',
    pricePerMeter: 75,
    rollWidth: 300,
    stockMeters: 380,
    image: 'assets/images/curtain_linen_natural.jpg',
    description: 'قماش كتان ريفي ذو خيوط بارزة ونسيج محبوك يدوي المظهر، مناسب لستائر الفلل المودرن وديكورات البوهو شيك والطبيعية.',
    lightBlockage: '50% (ضوء دافئ ومصفى)',
    composition: '100% كتان نقي',
    origin: 'فرنسا',
    colors: [
      { name: 'بيج كتاني طبيعي', hex: '#cbb69d' },
      { name: 'رمادي صخري', hex: '#7d7a74' },
      { name: 'أبيض طباشيري', hex: '#f4f2ec' }
    ],
    features: ['نسيج طبيعي بنقوش خيوط واضحة', 'تنفس حر للأقمشة', 'مقاوم للبكتيريا والعث'],
    rating: 4.7,
    reviewsCount: 21,
    isFeatured: false
  },
  {
    id: 'fab-7',
    name: 'ستائر ترسون زيبرا مودرن عازلة',
    nameEn: 'Modern Zebra Tarsoon Blinds',
    category: 'tarsoon',
    categoryName: 'ستائر الترسون',
    pricingUnit: 'sqm',
    pricePerMeter: 85,
    rollWidth: 260,
    stockMeters: 350,
    image: 'assets/images/curtain_silk_emerald.jpg',
    description: 'ستائر ترسون وزيبرا عصرية بمواصفات تركية فاخرة، نظام شرائح مزدوج للتحكم الدقيق بمرور الضوء والخصوصية. حساب التكلفة يتم بالمتر المربع (الطول × العرض).',
    lightBlockage: '85% (عازل وتحكم كامل بالضوء)',
    composition: 'ألياف ترسون معالجة مقاومة للغبار والرطوبة',
    origin: 'تركيا / إسطنبول',
    colors: [
      { name: 'رمادي حجري معتم', hex: '#64748b' },
      { name: 'بيج عاجي كلاسيك', hex: '#e2d9cc' },
      { name: 'أبيض لؤلؤي نقاء', hex: '#f8fafc' },
      { name: 'بني شوكولا فخم', hex: '#451a03' }
    ],
    features: ['حساب السعر بالمتر المربع (طول × عرض)', 'ماكينة سحب وسلاسل ألمنيوم متينة', 'سهولة فائقة في التنظيف والمسح'],
    rating: 5.0,
    reviewsCount: 42,
    isFeatured: true
  },
  {
    id: 'fab-8',
    name: 'ستائر ترسون رول سكرين بلاك آوت',
    nameEn: 'Blackout Roller Screen Tarsoon',
    category: 'tarsoon',
    categoryName: 'ستائر الترسون',
    pricingUnit: 'sqm',
    pricePerMeter: 95,
    rollWidth: 280,
    stockMeters: 280,
    image: 'assets/images/curtain_brocade.jpg',
    description: 'ستائر ترسون رول عازلة للحرارة وأشعة الشمس بنسبة 100%، مثالية لغرف النوم والمكاتب والواجهات الكبيرة. الحساب بالمتر المربع (طول × عرض).',
    lightBlockage: '100% (بلاك آوت عازل تماماً)',
    composition: 'ترسون عازل ثلاثي الطبقات مع طبقة حرارية',
    origin: 'تركيا',
    colors: [
      { name: 'رصاصي داكن', hex: '#334155' },
      { name: 'كريمي هادئ', hex: '#f1ede4' },
      { name: 'كحلي ليلي', hex: '#0f172a' }
    ],
    features: ['عزل تام 100% للضوء والحرارة', 'حساب بالمتر المربع جاهز للتركيب', 'محرك سحب أو يدوي عالي التحمل'],
    rating: 4.9,
    reviewsCount: 29,
    isFeatured: false
  }
];

// Initial Seed Orders for Realistic Admin Demonstration & Weekly Production Schedule
const INITIAL_ORDERS = [
  {
    id: 'ORD-100',
    date: '2026-09-12T09:15:00.000Z',
    customer: {
      name: 'سامي عبد الله',
      phone: '0599554433',
      email: 'sami.a@gmail.com',
      city: 'نابلس',
      address: 'شارع المعاجين'
    },
    deliveryType: 'pickup',
    deliveryRegion: '',
    pickupBranch: 'نابلس - باب الساحة',
    shippingFee: 0,
    requiresInstallation: true,
    installationFee: 80,
    installationDay: 'السبت',
    installationDate: '2026-09-12',
    installerId: 'osama',
    installerName: 'أسامة',
    installationStatus: 'pending_install',
    source: 'showroom',
    items: [
      {
        productId: 'fab-1',
        productName: 'كريب ستائر رويال مسدل',
        color: 'بيج رملي',
        meters: 15,
        pricePerMeter: 65,
        total: 975,
        notes: 'صالة المعيشة'
      }
    ],
    totalMeters: 15,
    subtotal: 975,
    discount: 0,
    grandTotal: 1055,
    paymentMethod: 'الدفع عند الاستلام',
    paymentStatus: 'عند الاستلام في الفرع',
    orderStatus: 'in_tailoring',
    statusText: 'جاري قص وتجهيز القماش في الورشة',
    scheduledDay: 'السبت',
    scheduledDate: '2026-09-12'
  },
  {
    id: 'ORD-101',
    date: '2026-09-12T11:30:00.000Z',
    customer: {
      name: 'طارق الزغير',
      phone: '0599842231',
      email: 'tariq@balalem-curtains.com',
      city: 'الخليل',
      address: 'شارع عين سارة، مجمع النور'
    },
    deliveryType: 'delivery',
    deliveryRegion: 'الضفة الغربية',
    pickupBranch: '',
    shippingFee: 0,
    requiresInstallation: true,
    installationFee: 100,
    installationDay: 'الأحد',
    installationDate: '2026-09-13',
    installerId: 'ezz',
    installerName: 'عز',
    installationStatus: 'pending_install',
    source: 'online',
    items: [
      {
        productId: 'fab-1',
        productName: 'كريب ستائر رويال مسدل',
        color: 'بيج رملي',
        meters: 14,
        pricePerMeter: 65,
        total: 910,
        notes: 'نافذة الصالة (عرض 3.5 م × ارتفاع 2.8 م - كسرات ويفي)'
      },
      {
        productId: 'fab-3',
        productName: 'تول ستائر فوال إيطالي مطرّز',
        color: 'أبيض ثلجي',
        meters: 14,
        pricePerMeter: 48,
        total: 672,
        notes: 'ستارة خلفية ناعمة لنفس النافذة'
      }
    ],
    totalMeters: 28,
    subtotal: 1582,
    discount: 0,
    grandTotal: 1682,
    paymentMethod: 'الدفع عند الاستلام',
    paymentStatus: 'عند الاستلام',
    orderStatus: 'in_tailoring', // pending, in_tailoring, ready, shipped, delivered
    statusText: 'جاري قص وتجهيز القماش في الورشة',
    scheduledDay: 'الأحد',
    scheduledDate: '2026-09-13'
  },
  {
    id: 'ORD-102',
    date: '2026-09-12T14:45:00.000Z',
    customer: {
      name: 'هدى النابلسي',
      phone: '0598765432',
      email: 'huda.n@example.com',
      city: 'نابلس',
      address: 'حي رفيديا، قرب دوار النجاح'
    },
    deliveryType: 'pickup',
    deliveryRegion: '',
    pickupBranch: 'نابلس - باب الساحة',
    shippingFee: 0,
    requiresInstallation: false,
    installationFee: 0,
    installationDay: '',
    installationDate: '',
    installerId: '',
    installerName: '',
    installationStatus: 'not_required',
    source: 'online',
    items: [
      {
        productId: 'fab-4',
        productName: 'مخمل ملكي بلاك آوت عازل',
        color: 'نبيذي ملكي (بورغندي)',
        meters: 18,
        pricePerMeter: 98,
        total: 1764,
        notes: 'غرفة النوم الماستر - عازل 100%'
      }
    ],
    totalMeters: 18,
    subtotal: 1764,
    discount: 0,
    grandTotal: 1764,
    paymentMethod: 'الدفع عند الاستلام',
    paymentStatus: 'عند الاستلام في الفرع',
    orderStatus: 'in_tailoring',
    statusText: 'جاري قص وتجهيز القماش في الورشة',
    scheduledDay: 'الأحد',
    scheduledDate: '2026-09-13'
  },
  {
    id: 'ORD-103',
    date: '2026-09-12T16:15:00.000Z',
    customer: {
      name: 'محمود الصالحي',
      phone: '0595123456',
      email: 'salehi.m@gmail.com',
      city: 'نابلس',
      address: 'شارع بيت وزن، قرب سوبرماركت برافو'
    },
    deliveryType: 'pickup',
    deliveryRegion: '',
    pickupBranch: 'نابلس - بيت وزن بجانب طلعة برافو',
    shippingFee: 0,
    items: [
      {
        productId: 'fab-2',
        productName: 'كتان هولندي ثقيل للستائر',
        color: 'رمادي حجري دافئ',
        meters: 12,
        pricePerMeter: 75,
        total: 900,
        notes: 'شباك غرفة الضيوف'
      }
    ],
    totalMeters: 12,
    subtotal: 900,
    discount: 0,
    grandTotal: 900,
    paymentMethod: 'الدفع عند الاستلام',
    paymentStatus: 'عند الاستلام في الفرع',
    orderStatus: 'pending',
    statusText: 'قيد المراجعة وتأكيد المقاسات',
    scheduledDay: 'الأحد',
    scheduledDate: '2026-09-13'
  },
  {
    id: 'ORD-104',
    date: '2026-09-13T09:00:00.000Z',
    customer: {
      name: 'ميسون الدجاني',
      phone: '0528990112',
      email: 'mayson.d@yahoo.com',
      city: 'القدس',
      address: 'الشيخ جراح، قرب القنصلية'
    },
    deliveryType: 'delivery',
    deliveryRegion: 'القدس',
    pickupBranch: '',
    shippingFee: 35,
    items: [
      {
        productId: 'fab-6',
        productName: 'كتان خام ريفي بألياف طبيعية',
        color: 'بيج كتاني طبيعي',
        meters: 16,
        pricePerMeter: 75,
        total: 1200,
        notes: 'تفصيل صالون ريفي'
      }
    ],
    totalMeters: 16,
    subtotal: 1200,
    discount: 0,
    grandTotal: 1235,
    paymentMethod: 'الدفع عند الاستلام',
    paymentStatus: 'عند الاستلام',
    orderStatus: 'in_tailoring',
    statusText: 'جاري قص وتجهيز القماش في الورشة',
    scheduledDay: 'الإثنين',
    scheduledDate: '2026-09-14'
  },
  {
    id: 'ORD-105',
    date: '2026-09-13T11:30:00.000Z',
    customer: {
      name: 'خالد عبد الرحيم',
      phone: '0597334455',
      email: 'khaled.ar@gmail.com',
      city: 'رام الله والبيرة',
      address: 'شارع الإرسال، مقابل برج فلسطين'
    },
    deliveryType: 'delivery',
    deliveryRegion: 'الضفة الغربية',
    pickupBranch: '',
    shippingFee: 0,
    requiresInstallation: true,
    installationFee: 90,
    installationDay: 'الإثنين',
    installationDate: '2026-09-14',
    installerId: 'tech3',
    installerName: 'فني تركيب 3',
    installationStatus: 'pending_install',
    source: 'showroom',
    items: [
      {
        productId: 'fab-1',
        productName: 'كريب ستائر رويال مسدل',
        color: 'أوف وايت ناعم',
        meters: 20,
        pricePerMeter: 65,
        total: 1300,
        notes: 'واجهة صالة جلوس عريضة'
      }
    ],
    totalMeters: 20,
    subtotal: 1300,
    discount: 0,
    grandTotal: 1390,
    paymentMethod: 'الدفع عند الاستلام',
    paymentStatus: 'عند الاستلام',
    orderStatus: 'pending',
    statusText: 'قيد المراجعة وتأكيد المقاسات',
    scheduledDay: 'الإثنين',
    scheduledDate: '2026-09-14'
  },
  {
    id: 'ORD-106',
    date: '2026-09-13T15:00:00.000Z',
    customer: {
      name: 'أحمد الخطيب',
      phone: '0547665544',
      email: 'alkhateeb48@outlook.com',
      city: 'الناصرة',
      address: 'الحي الشرقي، قرب كنيسة البشارة'
    },
    deliveryType: 'delivery',
    deliveryRegion: 'الداخل الفلسطيني (مناطق 48)',
    pickupBranch: '',
    shippingFee: 80,
    items: [
      {
        productId: 'fab-7',
        productName: 'ستائر ترسون زيبرا مودرن عازلة',
        color: 'أبيض عاجي أنيق',
        meters: 10,
        unitLabel: 'م²',
        pricePerMeter: 85,
        total: 850,
        notes: 'نظام زيبرا لغرفتي نوم'
      }
    ],
    totalMeters: 10,
    subtotal: 850,
    discount: 0,
    grandTotal: 930,
    paymentMethod: 'الدفع عند الاستلام',
    paymentStatus: 'عند الاستلام',
    orderStatus: 'in_tailoring',
    statusText: 'جاري قص وتجهيز القماش في الورشة',
    scheduledDay: 'الإثنين',
    scheduledDate: '2026-09-14'
  },
  {
    id: 'ORD-107',
    date: '2026-09-14T09:40:00.000Z',
    customer: {
      name: 'رنا الجعبري',
      phone: '0592887766',
      email: 'rana.jabari@hotmail.com',
      city: 'الخليل',
      address: 'منطقة الحاووز الثاني'
    },
    deliveryType: 'delivery',
    deliveryRegion: 'الضفة الغربية',
    pickupBranch: '',
    shippingFee: 20,
    items: [
      {
        productId: 'fab-8',
        productName: 'ستائر ترسون رول سكرين بلاك آوت',
        color: 'رصاصي داكن',
        meters: 15,
        unitLabel: 'م²',
        pricePerMeter: 95,
        total: 1425,
        notes: 'مجلس ضيوف فخم'
      }
    ],
    totalMeters: 15,
    subtotal: 1425,
    discount: 0,
    grandTotal: 1445,
    paymentMethod: 'الدفع عند الاستلام',
    paymentStatus: 'عند الاستلام',
    orderStatus: 'pending',
    statusText: 'قيد المراجعة وتأكيد المقاسات',
    scheduledDay: 'الثلاثاء',
    scheduledDate: '2026-09-15'
  },
  {
    id: 'ORD-108',
    date: '2026-09-15T11:10:00.000Z',
    customer: {
      name: 'عمر القواسمي',
      phone: '0599114422',
      email: 'omar.q@example.com',
      city: 'بيت لحم',
      address: 'شارع المهد، قرب فندق البرادايس'
    },
    deliveryType: 'delivery',
    deliveryRegion: 'الضفة الغربية',
    pickupBranch: '',
    shippingFee: 20,
    items: [
      {
        productId: 'fab-4',
        productName: 'مخمل ملكي بلاك آوت عازل',
        color: 'رمادي غرافيت فخم',
        meters: 14,
        pricePerMeter: 98,
        total: 1372,
        notes: 'ستائر بلاك آوت لغرفة معيشة'
      }
    ],
    totalMeters: 14,
    subtotal: 1372,
    discount: 0,
    grandTotal: 1392,
    paymentMethod: 'الدفع عند الاستلام',
    paymentStatus: 'عند الاستلام',
    orderStatus: 'pending',
    statusText: 'قيد المراجعة وتأكيد المقاسات',
    scheduledDay: 'الخميس',
    scheduledDate: '2026-09-17'
  },
  {
    id: 'ORD-109',
    date: '2026-09-15T13:20:00.000Z',
    customer: {
      name: 'فادي طوقان',
      phone: '0598223311',
      email: 'fadi.touqan@gmail.com',
      city: 'نابلس',
      address: 'شارع المريج'
    },
    deliveryType: 'pickup',
    deliveryRegion: '',
    pickupBranch: 'نابلس - باب الساحة',
    shippingFee: 0,
    items: [
      {
        productId: 'fab-1',
        productName: 'كريب ستائر رويال مسدل',
        color: 'أزرق بترولي أنيق',
        meters: 12,
        pricePerMeter: 65,
        total: 780,
        notes: 'صالون مودرن'
      }
    ],
    totalMeters: 12,
    subtotal: 780,
    discount: 0,
    grandTotal: 780,
    paymentMethod: 'الدفع عند الاستلام',
    paymentStatus: 'عند الاستلام في الفرع',
    orderStatus: 'pending',
    statusText: 'قيد المراجعة وتأكيد المقاسات',
    scheduledDay: 'الخميس',
    scheduledDate: '2026-09-17'
  }
];

class NaseejStore {
  constructor() {
    this.init();
  }

  init() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      } else {
        const products = JSON.parse(data);
        let changed = false;
        products.forEach(p => {
          if (p.category === 'silk') {
            p.category = 'tarsoon';
            p.categoryName = 'ستائر الترسون';
            if (p.name && p.name.includes('حرير')) {
              p.name = 'ستائر ترسون زيبرا مودرن عازلة';
            }
            changed = true;
          }
        });
        if (!products.some(p => p.category === 'tarsoon')) {
          const tarsoonItems = INITIAL_PRODUCTS.filter(p => p.category === 'tarsoon');
          products.push(...tarsoonItems);
          changed = true;
        }
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        }
      }
    } catch (e) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    }
    // Update existing orders to Palestinian cities if first initialized or missing scheduledDate
    const existingOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!existingOrders || existingOrders.includes('الرياض') || !existingOrders.includes('ORD-100') || !existingOrders.includes('tech3') || existingOrders.includes('"shippingFee":20,"requiresInstallation":true') || !existingOrders.includes('scheduledDate')) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || localStorage.getItem(STORAGE_KEYS.CUSTOMERS).includes('الرياض')) {
      const defaultCustomers = [
        { name: 'طارق الزغير', phone: '0599842231', email: 'tariq@balalem-curtains.com', city: 'الخليل', registeredAt: '2026-08-15' },
        { name: 'هدى النابلسي', phone: '0598765432', email: 'huda.n@example.com', city: 'نابلس', registeredAt: '2026-08-28' },
        { name: 'باسم عبدالحق', phone: '0569112233', email: 'bassem.a@example.com', city: 'رام الله والبيرة', registeredAt: '2026-09-01' }
      ];
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(defaultCustomers));
    }
  }

  // --- Products Management ---
  getProducts() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : INITIAL_PRODUCTS;
    } catch (e) {
      console.error('Error fetching products:', e);
      return INITIAL_PRODUCTS;
    }
  }

  getProductById(id) {
    const products = this.getProducts();
    return products.find(p => p.id === id) || null;
  }

  addProduct(productData) {
    const products = this.getProducts();
    const newProduct = {
      id: 'fab-' + Date.now(),
      name: productData.name.trim(),
      nameEn: productData.nameEn ? productData.nameEn.trim() : '',
      category: productData.category || 'crepe',
      categoryName: productData.categoryName || 'أقمشة كريب',
      pricePerMeter: Number(productData.pricePerMeter) || 50,
      rollWidth: Number(productData.rollWidth) || 280,
      stockMeters: Number(productData.stockMeters) || 100,
      image: productData.image || 'assets/images/curtain_crepe.jpg',
      description: productData.description || '',
      lightBlockage: productData.lightBlockage || 'حجب معتدل للضوء',
      composition: productData.composition || '100% بوليستر معالج',
      origin: productData.origin || 'تركيا',
      colors: productData.colors && productData.colors.length > 0 ? productData.colors : [
        { name: 'افتراضي', hex: '#b58b4c' }
      ],
      features: productData.features || ['جودة تصنيع فاخرة', 'مقاوم للبهتان والتجعد'],
      rating: 5.0,
      reviewsCount: 1,
      isFeatured: Boolean(productData.isFeatured)
    };

    products.unshift(newProduct);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent('naseej:products_updated', { detail: newProduct }));
    return newProduct;
  }

  updateProduct(id, updatedFields) {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;

    products[index] = {
      ...products[index],
      ...updatedFields,
      pricePerMeter: Number(updatedFields.pricePerMeter) || products[index].pricePerMeter,
      stockMeters: Number(updatedFields.stockMeters) !== undefined ? Number(updatedFields.stockMeters) : products[index].stockMeters,
      rollWidth: Number(updatedFields.rollWidth) || products[index].rollWidth
    };

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent('naseej:products_updated', { detail: products[index] }));
    return products[index];
  }

  deleteProduct(id) {
    let products = this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('naseej:products_updated'));
    return true;
  }

  // --- Orders Management ---
  getOrders() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error fetching orders:', e);
      return [];
    }
  }

  createOrder(orderData) {
    const orders = this.getOrders();
    const orderId = orderData.id || ('ORD-' + Math.floor(1000 + Math.random() * 9000));
    
    let scheduledDate = orderData.scheduledDate;
    let scheduledDay = orderData.scheduledDay;
    if (!scheduledDate) {
      if (orderData.date) {
        scheduledDate = orderData.date.substring(0, 10);
      } else {
        scheduledDate = this.formatDateISO(new Date());
      }
    }
    if (!scheduledDay) {
      const d = new Date(scheduledDate);
      scheduledDay = this.getDayNameFromDate(d) || this.getNextAvailableWorkDay();
    }

    const requiresInstallation = Boolean(orderData.requiresInstallation);
    // When installation is requested, delivery fee is 0 (free delivery because technician transports curtains)
    const shippingFee = requiresInstallation ? 0 : (Number(orderData.shippingFee) || 0);
    const installationFee = requiresInstallation ? (Number(orderData.installationFee) || 0) : 0;
    const installationDate = orderData.installationDate || (requiresInstallation ? scheduledDate : '');
    const installationDay = orderData.installationDay || (requiresInstallation ? scheduledDay : '');
    const installerId = orderData.installerId || (requiresInstallation ? this.getNextAvailableInstaller() : '');
    const installerName = installerId ? this.getInstallerName(installerId) : '';
    const source = orderData.source || 'online';

    const subtotal = Number(orderData.subtotal) || 0;
    const discount = Number(orderData.discount) || 0;
    const grandTotal = Number(orderData.grandTotal) || (subtotal + shippingFee + installationFee - discount);

    const newOrder = {
      id: orderId,
      date: orderData.date || new Date().toISOString(),
      customer: orderData.customer,
      deliveryType: orderData.deliveryType || 'delivery',
      deliveryRegion: orderData.deliveryRegion || '',
      pickupBranch: orderData.pickupBranch || '',
      requiresInstallation: requiresInstallation,
      installationFee: installationFee,
      installationDay: installationDay,
      installationDate: installationDate,
      installerId: installerId,
      installerName: installerName,
      installationStatus: requiresInstallation ? 'pending_install' : 'not_required',
      source: source, // 'online' or 'showroom'
      items: orderData.items || [],
      totalMeters: Number(orderData.totalMeters) || 0,
      subtotal: subtotal,
      shippingFee: shippingFee,
      discount: discount,
      grandTotal: grandTotal,
      loyaltyPoints: orderData.loyaltyPoints !== undefined ? orderData.loyaltyPoints : Math.floor((grandTotal / 100) * 50),
      paymentMethod: orderData.paymentMethod || 'الدفع عند الاستلام',
      paymentStatus: orderData.paymentMethod === 'الدفع عند الاستلام' 
        ? (orderData.deliveryType === 'pickup' ? 'عند الاستلام في الفرع' : 'عند الاستلام')
        : 'مدفوع إلكترونياً',
      orderStatus: orderData.orderStatus || 'pending', // pending, in_tailoring, ready, shipped, delivered
      statusText: orderData.statusText || 'قيد المراجعة وتأكيد المقاسات',
      scheduledDay: scheduledDay,
      scheduledDate: scheduledDate
    };

    // Deduct stock meters for ordered items if product exists
    const products = this.getProducts();
    (orderData.items || []).forEach(item => {
      if (!item.productId) return;
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        prod.stockMeters = Math.max(0, prod.stockMeters - item.meters);
      }
    });
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

    orders.unshift(newOrder);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

    // Save/update customer registry
    if (orderData.customer && orderData.customer.phone) {
      this.registerCustomer(orderData.customer);
    }

    window.dispatchEvent(new CustomEvent('naseej:orders_updated', { detail: newOrder }));
    return newOrder;
  }

  updateOrderStatus(orderId, newStatus) {
    const orders = this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    const statusMap = {
      pending: 'قيد المراجعة وتأكيد المقاسات',
      in_tailoring: 'جاري قص وتجهيز القماش',
      ready: 'تم التجهيز وبانتظار مندوب الشحن / الاستلام',
      shipped: 'قيد الشحن مع شركة التوصيل',
      delivered: 'تم التوصيل للعميل بنجاح',
      cancelled: 'تم إلغاء الطلب'
    };

    order.orderStatus = newStatus;
    order.statusText = statusMap[newStatus] || newStatus;

    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('naseej:orders_updated', { detail: order }));
    return order;
  }

  // --- Work Days, Months, & Calendar Engine ---
  getMonthsList() {
    return [
      { num: 1, name: 'كانون الثاني / 1' },
      { num: 2, name: 'شباط / 2' },
      { num: 3, name: 'آذار / 3' },
      { num: 4, name: 'نيسان / 4' },
      { num: 5, name: 'أيار / 5' },
      { num: 6, name: 'حزيران / 6' },
      { num: 7, name: 'تموز / 7' },
      { num: 8, name: 'آب (أغسطس) / 8' },
      { num: 9, name: 'أيلول (سبتمبر) / 9' },
      { num: 10, name: 'تشرين الأول (أكتوبر) / 10' },
      { num: 11, name: 'تشرين الثاني (نوفمبر) / 11' },
      { num: 12, name: 'كانون الأول (ديسمبر) / 12' }
    ];
  }

  getMonthName(monthNum) {
    const list = this.getMonthsList();
    const found = list.find(m => m.num === monthNum);
    return found ? found.name : `شهر ${monthNum}`;
  }

  getWorkDays() {
    return ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  }

  getDayNameFromDate(dateObj) {
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return dayNames[dateObj.getDay()];
  }

  formatDateISO(d) {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Find the starting Saturday for the workweek containing a date
  getSaturdayOfWeek(dateObj) {
    const d = new Date(dateObj);
    d.setHours(0, 0, 0, 0);
    const dayOfWeek = d.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
    // Days since last Saturday:
    // Sat (6) -> 0
    // Sun (0) -> 1
    // Mon (1) -> 2
    // Tue (2) -> 3
    // Wed (3) -> 4
    // Thu (4) -> 5
    // Fri (5) -> 6
    const diff = (dayOfWeek + 1) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  }

  // Generate 6 working days (Saturday to Thursday) for a given week
  getWeekDates(saturdayDate) {
    const week = [];
    const base = new Date(saturdayDate);
    base.setHours(0, 0, 0, 0);
    const todayStr = this.formatDateISO(new Date());
    const workDaysNames = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

    for (let i = 0; i < 6; i++) {
      const current = new Date(base);
      current.setDate(base.getDate() + i);
      const isoStr = this.formatDateISO(current);
      const monthNum = current.getMonth() + 1;
      const dayNum = current.getDate();

      week.push({
        dateStr: isoStr,
        dateObj: current,
        dayName: workDaysNames[i],
        dayNum: dayNum,
        monthNum: monthNum,
        monthName: this.getMonthName(monthNum),
        isToday: isoStr === todayStr,
        formattedDisplay: `${workDaysNames[i]} (${dayNum}/${String(monthNum).padStart(2, '0')})`
      });
    }
    return week;
  }

  // Get all weeks in a month
  getMonthWeeks(year, monthNum) {
    const weeks = [];
    const firstDay = new Date(year, monthNum - 1, 1);
    const lastDay = new Date(year, monthNum, 0);

    let currentSat = this.getSaturdayOfWeek(firstDay);

    while (currentSat <= lastDay || (weeks.length === 0)) {
      const weekDates = this.getWeekDates(currentSat);
      const start = weekDates[0];
      const end = weekDates[5];
      weeks.push({
        saturdayDate: new Date(currentSat),
        saturdayISO: this.formatDateISO(currentSat),
        weekDates: weekDates,
        label: `أسبوع: ${start.dayNum} ${start.monthName.split('/')[0].trim()} ➔ ${end.dayNum} ${end.monthName.split('/')[0].trim()}`
      });

      currentSat.setDate(currentSat.getDate() + 7);
      if (currentSat > lastDay && currentSat.getMonth() + 1 !== monthNum) {
        break;
      }
    }
    return weeks;
  }

  // Full monthly calendar grid data
  getMonthlyScheduleData(year, monthNum) {
    const orders = this.getOrders();
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const days = [];
    const todayStr = this.formatDateISO(new Date());

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, monthNum - 1, day);
      const isoStr = this.formatDateISO(d);
      const dayOfWeek = d.getDay();
      const isFriday = dayOfWeek === 5;
      const dayName = this.getDayNameFromDate(d);

      const tailoringOrders = orders.filter(o => 
        o.orderStatus !== 'cancelled' && 
        o.orderStatus !== 'delivered' && 
        (o.scheduledDate === isoStr || (!o.scheduledDate && o.scheduledDay === dayName && d.getMonth() + 1 === monthNum))
      );

      const installOrders = orders.filter(o =>
        o.requiresInstallation &&
        o.orderStatus !== 'cancelled' &&
        o.installationStatus !== 'completed' &&
        (o.installationDate === isoStr || (!o.installationDate && o.installationDay === dayName && d.getMonth() + 1 === monthNum))
      );

      let totalMeters = 0;
      tailoringOrders.forEach(o => totalMeters += (o.totalMeters || 0));
      totalMeters = Math.round(totalMeters * 10) / 10;

      let status = 'free';
      let statusLabel = 'شاغر ومتاح';
      if (isFriday) {
        status = 'off';
        statusLabel = 'عطلة الجمعة الرسمية';
      } else if (totalMeters >= 40 || tailoringOrders.length >= 3) {
        status = 'full';
        statusLabel = 'ممتلئ 🔥';
      } else if (tailoringOrders.length > 0) {
        status = 'moderate';
        statusLabel = 'متوازن ⚡';
      }

      days.push({
        dayNum: day,
        dateStr: isoStr,
        dayOfWeek: dayOfWeek,
        dayName: dayName,
        isFriday: isFriday,
        isToday: isoStr === todayStr,
        tailoringOrders: tailoringOrders,
        installOrders: installOrders,
        totalMeters: totalMeters,
        status: status,
        statusLabel: statusLabel
      });
    }

    return {
      year: year,
      monthNum: monthNum,
      monthName: this.getMonthName(monthNum),
      days: days
    };
  }

  getInstallers() {
    return [
      { id: 'osama', name: 'أسامة (فني أول - 70%)', phone: '0599001122', sharePercent: 70, isPrimary: true },
      { id: 'ezz', name: 'عز', phone: '0599223344', sharePercent: 15 },
      { id: 'tech3', name: 'فني تركيب 3 (معتمد)', phone: '0599556677', sharePercent: 15 }
    ];
  }

  getInstallerName(id) {
    const installer = this.getInstallers().find(i => i.id === id);
    if (installer) return id === 'osama' ? 'أسامة' : installer.name;
    return id || 'فني معتمد';
  }

  getNextAvailableInstaller() {
    const orders = this.getOrders().filter(o => o.requiresInstallation && o.orderStatus !== 'cancelled' && o.installationStatus !== 'completed');
    if (orders.length === 0) return 'osama';

    let osamaCount = 0;
    let ezzCount = 0;
    let tech3Count = 0;

    orders.forEach(o => {
      if (o.installerId === 'osama') osamaCount++;
      else if (o.installerId === 'ezz') ezzCount++;
      else if (o.installerId === 'tech3') tech3Count++;
    });

    const totalOrders = osamaCount + ezzCount + tech3Count;
    // 70% threshold for Osama
    if (totalOrders === 0 || (osamaCount / totalOrders) < 0.70) {
      return 'osama';
    }

    // Osama is at or above 70%, assign remaining 30% between Ezz and Tech3
    return ezzCount <= tech3Count ? 'ezz' : 'tech3';
  }

  getNextAvailableWorkDay() {
    const days = this.getWorkDays();
    const orders = this.getOrders().filter(o => o.orderStatus !== 'cancelled' && o.orderStatus !== 'delivered');
    
    const dayMeters = {};
    days.forEach(d => dayMeters[d] = 0);
    orders.forEach(o => {
      const day = o.scheduledDay || 'السبت';
      if (dayMeters[day] !== undefined) {
        dayMeters[day] += (o.totalMeters || 0);
      }
    });

    let minDay = days[0];
    let minMeters = Infinity;
    days.forEach(d => {
      if (dayMeters[d] < minMeters) {
        minMeters = dayMeters[d];
        minDay = d;
      }
    });
    return minDay;
  }

  assignOrderDay(orderId, dateOrDayName, dayName) {
    const orders = this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    // Check if dateOrDayName is ISO date (YYYY-MM-DD)
    if (dateOrDayName && dateOrDayName.includes('-')) {
      order.scheduledDate = dateOrDayName;
      if (dayName) {
        order.scheduledDay = dayName;
      } else {
        const d = new Date(dateOrDayName);
        order.scheduledDay = this.getDayNameFromDate(d);
      }
    } else {
      order.scheduledDay = dateOrDayName;
    }

    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('naseej:orders_updated', { detail: order }));
    return order;
  }

  autoBalanceWeeklySchedule(weekDates) {
    if (!weekDates || weekDates.length === 0) {
      const sat = this.getSaturdayOfWeek(new Date());
      weekDates = this.getWeekDates(sat);
    }
    const orders = this.getOrders();
    const activeOrders = orders.filter(o => o.orderStatus !== 'cancelled' && o.orderStatus !== 'delivered');

    if (activeOrders.length === 0) return false;

    // Sort by largest meter size first to perform balanced bin packing
    activeOrders.sort((a, b) => (b.totalMeters || 0) - (a.totalMeters || 0));

    // Track total meters and count per day in this week
    const dayTotals = weekDates.map(w => ({ 
      dateStr: w.dateStr, 
      dayName: w.dayName, 
      meters: 0, 
      count: 0 
    }));

    activeOrders.forEach(order => {
      dayTotals.sort((a, b) => a.meters - b.meters || a.count - b.count);
      const targetDay = dayTotals[0];
      
      order.scheduledDate = targetDay.dateStr;
      order.scheduledDay = targetDay.dayName;
      targetDay.meters += (order.totalMeters || 0);
      targetDay.count += 1;
    });

    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('naseej:orders_updated', { detail: { action: 'balanced' } }));
    return true;
  }

  getWeeklyScheduleData(weekDates) {
    if (!weekDates || weekDates.length === 0) {
      const sat = this.getSaturdayOfWeek(new Date());
      weekDates = this.getWeekDates(sat);
    }
    const orders = this.getOrders();
    const schedule = {};

    weekDates.forEach(d => {
      schedule[d.dateStr] = {
        dateStr: d.dateStr,
        day: d.dayName,
        dayNum: d.dayNum,
        monthNum: d.monthNum,
        monthName: d.monthName,
        isToday: d.isToday,
        formattedDisplay: d.formattedDisplay,
        orders: [],
        totalMeters: 0,
        totalOrders: 0,
        status: 'free',
        statusLabel: '',
        statusClass: ''
      };
    });

    orders.forEach(order => {
      if (order.orderStatus === 'cancelled' || order.orderStatus === 'delivered') return;
      
      let matchedDateStr = null;
      if (order.scheduledDate && schedule[order.scheduledDate]) {
        matchedDateStr = order.scheduledDate;
      } else if (order.scheduledDay) {
        const match = weekDates.find(w => w.dayName === order.scheduledDay);
        if (match) matchedDateStr = match.dateStr;
      }

      if (matchedDateStr && schedule[matchedDateStr]) {
        schedule[matchedDateStr].orders.push(order);
        schedule[matchedDateStr].totalMeters += (order.totalMeters || 0);
        schedule[matchedDateStr].totalOrders += 1;
      }
    });

    weekDates.forEach(d => {
      const item = schedule[d.dateStr];
      // Sort orders chronologically from oldest to newest (من الأقدم إلى الأحدث - من وصى قبل يظهر أولاً)
      item.orders.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date || 0).getTime();
        const timeB = new Date(b.createdAt || b.date || 0).getTime();
        return timeA - timeB;
      });

      item.totalMeters = Math.round(item.totalMeters * 10) / 10;
      if (item.totalOrders === 0) {
        item.status = 'free';
        item.statusLabel = 'شاغر / متاح للعمل';
        item.statusClass = 'day-free';
      } else if (item.totalMeters >= 40 || item.totalOrders >= 3) {
        item.status = 'full';
        item.statusLabel = 'ممتلئ (ملان) 🔥';
        item.statusClass = 'day-full';
      } else {
        item.status = 'moderate';
        item.statusLabel = 'متوازن ومناسب ⚡';
        item.statusClass = 'day-moderate';
      }
    });

    return schedule;
  }

  // --- Field Installation Management & Schedule ---
  assignOrderInstallation(orderId, updates) {
    const orders = this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    if (updates.date !== undefined || updates.installationDate !== undefined) {
      order.installationDate = updates.date || updates.installationDate;
      if (order.installationDate) {
        const d = new Date(order.installationDate);
        order.installationDay = this.getDayNameFromDate(d);
      }
    }
    if (updates.day !== undefined) order.installationDay = updates.day;
    if (updates.installationDay !== undefined) order.installationDay = updates.installationDay;
    if (updates.installerId !== undefined) {
      order.installerId = updates.installerId;
      order.installerName = this.getInstallerName(updates.installerId);
    }
    if (updates.status !== undefined) {
      order.installationStatus = updates.status;
    }
    if (updates.installationStatus !== undefined) {
      order.installationStatus = updates.installationStatus;
    }
    if (updates.installationFee !== undefined) {
      order.installationFee = Number(updates.installationFee) || 0;
      order.grandTotal = (order.subtotal || 0) + (order.shippingFee || 0) + order.installationFee - (order.discount || 0);
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('naseej:orders_updated', { detail: order }));
    return order;
  }

  autoBalanceInstallationSchedule(weekDates) {
    if (!weekDates || weekDates.length === 0) {
      const sat = this.getSaturdayOfWeek(new Date());
      weekDates = this.getWeekDates(sat);
    }
    const orders = this.getOrders();

    const installOrders = orders.filter(o => o.requiresInstallation && o.orderStatus !== 'cancelled' && o.installationStatus !== 'completed');
    if (installOrders.length === 0) return 0;

    const totalCount = installOrders.length;
    // Calculate 70% for Osama, remaining 30% divided between Ezz and Tech3
    let osamaTarget = Math.max(1, Math.round(totalCount * 0.70));
    if (totalCount >= 2 && osamaTarget >= totalCount) osamaTarget = totalCount - 1;

    const remainingCount = totalCount - osamaTarget;
    const ezzTarget = Math.ceil(remainingCount / 2);
    const tech3Target = remainingCount - ezzTarget;

    // Build the weighted installer pool
    const osamaPool = Array(osamaTarget).fill('osama');
    const othersPool = [];
    for (let i = 0; i < ezzTarget; i++) othersPool.push('ezz');
    for (let i = 0; i < tech3Target; i++) othersPool.push('tech3');

    // Interleave so Osama has appointments across the days evenly
    const sequence = [];
    let cycle = 0;
    while (osamaPool.length > 0 || othersPool.length > 0) {
      if (cycle % 3 !== 2 && osamaPool.length > 0) {
        sequence.push(osamaPool.shift());
      } else if (othersPool.length > 0) {
        sequence.push(othersPool.shift());
      } else if (osamaPool.length > 0) {
        sequence.push(osamaPool.shift());
      }
      cycle++;
    }

    // Assign target days across week (Sat to Thu) and installers
    let dayIdx = 0;
    installOrders.forEach((order, idx) => {
      const targetDay = weekDates[dayIdx % weekDates.length];
      const instId = sequence[idx] || 'osama';
      const instName = this.getInstallerName(instId);

      order.installationDate = targetDay.dateStr;
      order.installationDay = targetDay.dayName;
      order.installerId = instId;
      order.installerName = instName;
      dayIdx++;
    });

    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('naseej:orders_updated', { detail: { action: 'installation_balanced' } }));
    return installOrders.length;
  }

  getWeeklyInstallationData(weekDates, installerFilter = 'all') {
    if (!weekDates || weekDates.length === 0) {
      const sat = this.getSaturdayOfWeek(new Date());
      weekDates = this.getWeekDates(sat);
    }
    const orders = this.getOrders();
    const schedule = {};

    weekDates.forEach(d => {
      schedule[d.dateStr] = {
        dateStr: d.dateStr,
        day: d.dayName,
        dayNum: d.dayNum,
        monthNum: d.monthNum,
        monthName: d.monthName,
        isToday: d.isToday,
        formattedDisplay: d.formattedDisplay,
        orders: [],
        totalMeters: 0,
        totalOrders: 0
      };
    });

    orders.forEach(order => {
      if (!order.requiresInstallation) return;
      if (order.orderStatus === 'cancelled' || order.installationStatus === 'completed') return;
      if (installerFilter !== 'all' && order.installerId !== installerFilter) return;

      let matchedDateStr = null;
      if (order.installationDate && schedule[order.installationDate]) {
        matchedDateStr = order.installationDate;
      } else if (order.installationDay) {
        const match = weekDates.find(w => w.dayName === order.installationDay);
        if (match) matchedDateStr = match.dateStr;
      } else if (order.scheduledDate && schedule[order.scheduledDate]) {
        matchedDateStr = order.scheduledDate;
      } else if (order.scheduledDay) {
        const match = weekDates.find(w => w.dayName === order.scheduledDay);
        if (match) matchedDateStr = match.dateStr;
      }

      if (matchedDateStr && schedule[matchedDateStr]) {
        schedule[matchedDateStr].orders.push(order);
        schedule[matchedDateStr].totalMeters += (order.totalMeters || 0);
        schedule[matchedDateStr].totalOrders += 1;
      }
    });

    weekDates.forEach(d => {
      if (schedule[d.dateStr] && schedule[d.dateStr].orders) {
        // Sort orders chronologically from oldest to newest (FIFO)
        schedule[d.dateStr].orders.sort((a, b) => {
          const timeA = new Date(a.createdAt || a.date || 0).getTime();
          const timeB = new Date(b.createdAt || b.date || 0).getTime();
          return timeA - timeB;
        });
      }
    });

    return schedule;
  }

  // --- Customers Management ---
  getCustomers() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  registerCustomer(customerInfo) {
    if (!customerInfo || !customerInfo.phone) return null;
    const customers = this.getCustomers();
    const existingIndex = customers.findIndex(c => c.phone === customerInfo.phone || c.email === customerInfo.email);

    if (existingIndex >= 0) {
      customers[existingIndex] = {
        ...customers[existingIndex],
        ...customerInfo,
        lastActive: new Date().toISOString()
      };
    } else {
      customers.push({
        ...customerInfo,
        registeredAt: new Date().toISOString()
      });
    }

    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    return customerInfo;
  }

  // --- Category / Bubbles Management (إدارة التصنيفات والفقاعات للمتجر) ---
  getCategories() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
      return INITIAL_CATEGORIES;
    } catch (e) {
      return INITIAL_CATEGORIES;
    }
  }

  addCategory({ name, icon = '🏷️' }) {
    if (!name || !name.trim()) return null;
    const categories = this.getCategories();
    const cleanName = name.trim();
    // Generate clean unique ID
    const cleanId = 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5);
    const newCat = {
      id: cleanId,
      name: cleanName,
      icon: (icon || '🏷️').trim(),
      isCustom: true,
      createdAt: new Date().toISOString()
    };
    categories.push(newCat);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    window.dispatchEvent(new CustomEvent('naseej:categories_updated', { detail: newCat }));
    return newCat;
  }

  deleteCategory(categoryId) {
    if (!categoryId || categoryId === 'all') return false;
    let categories = this.getCategories();
    categories = categories.filter(c => c.id !== categoryId);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    window.dispatchEvent(new CustomEvent('naseej:categories_updated', { detail: { id: categoryId } }));
    return true;
  }

  // --- Statistics for Admin ---
  getStats() {
    const orders = this.getOrders();
    const products = this.getProducts();
    const customers = this.getCustomers();

    const totalSales = orders
      .filter(o => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    const totalMetersSold = orders
      .filter(o => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + (o.totalMeters || 0), 0);

    const lowStockFabrics = products.filter(p => p.stockMeters < 100);

    return {
      totalSales,
      totalOrders: orders.length,
      totalMetersSold,
      totalProducts: products.length,
      totalCustomers: customers.length,
      lowStockCount: lowStockFabrics.length
    };
  }

  // Reset demo data
  resetDefaults() {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    window.location.reload();
  }
}

export const store = new NaseejStore();
