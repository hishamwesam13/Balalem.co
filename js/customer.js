/**
 * NASEEJ LUXURY CURTAIN FABRICS - CUSTOMER STOREFRONT MODULE
 * Handles fabric catalog, curtain smart meter calculator, shopping cart, and order placement.
 */
import { store } from './store.js';
import { auth } from './auth.js';

class NaseejCustomer {
  constructor() {
    this.cart = this.loadCart();
    this.currentCategory = 'all';
    this.searchQuery = '';
    this.activeProductModal = null;
    this.activeCalculator = {
      mode: 'window', // 'window' or 'direct'
      windowWidth: 3.0,
      windowHeight: 2.8,
      fullnessRatio: 2.8, // Default: American Pleats / Shtooh
      sewingType: 'كسرات أمريكي / شتوح',
      directMeters: 5,
      selectedColor: null,
      hangingStyle: 'تفصيل وخياطة جاهزة للتركيب'
    };
    this.applyLoyaltyDiscount = false;

    // Auto update storefront category bubbles when admin updates categories
    window.addEventListener('naseej:categories_updated', () => {
      this.renderCategoryTabs();
    });
  }

  loadCart() {
    try {
      const data = localStorage.getItem('naseej_cart');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveCart() {
    localStorage.setItem('naseej_cart', JSON.stringify(this.cart));
    this.updateCartBadges();
    window.dispatchEvent(new CustomEvent('naseej:cart_updated', { detail: this.cart }));
  }

  // =========================================================================
  // DATA OPERATIONS: Push, Pop, and Patch for Shopping Cart
  // =========================================================================

  /**
   * Push: إضافة عنصر جديد تماماً إلى مصفوفة السلة
   * @param {Object} item
   */
  pushToCart(item) {
    const newItem = {
      id: 'cart-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      ...item
    };
    this.cart.push(newItem);
    const roomStr = newItem.roomName ? ` لـ (${newItem.roomName})` : '';
    this.showToast(`تمت إضافة ${newItem.meters} ${newItem.unitLabel || 'متر'} من ${newItem.productName}${roomStr} إلى السلة`, 'success');
    this.saveCart();
    this.renderCartDrawer();
    return newItem;
  }

  /**
   * Pop: إزالة عنصر محدد أو آخر عنصر من مصفوفة السلة
   * @param {string} [cartItemId]
   */
  popCartItem(cartItemId) {
    let removedItem = null;
    if (cartItemId) {
      const index = this.cart.findIndex(i => i.id === cartItemId);
      if (index > -1) {
        removedItem = this.cart.splice(index, 1)[0];
      }
    } else {
      removedItem = this.cart.pop();
    }
    if (removedItem) {
      this.showToast(`تم حذف ${removedItem.productName} من السلة`, 'info');
    }
    this.saveCart();
    this.renderCartDrawer();
    return removedItem;
  }

  /**
   * Patch: تحديث جزئي لبيانات عنصر في السلة (مثل تعديل الأمتار أو التسمية) دون حذف العنصر
   * @param {string} cartItemId
   * @param {Object} patchData
   */
  patchCartItem(cartItemId, patchData) {
    const index = this.cart.findIndex(i => i.id === cartItemId);
    if (index === -1) return null;

    const currentItem = this.cart[index];
    const updatedItem = {
      ...currentItem,
      ...patchData
    };

    // إعادة احتساب التكلفة إذا تغيرت الأمتار أو السعر
    if (patchData.meters !== undefined || patchData.pricePerMeter !== undefined) {
      updatedItem.meters = Math.round(Number(updatedItem.meters) * 10) / 10;
      updatedItem.total = Math.round(updatedItem.meters * updatedItem.pricePerMeter);
    }

    this.cart[index] = updatedItem;
    const roomStr = updatedItem.roomName ? ` لـ (${updatedItem.roomName})` : '';
    this.showToast(`تم تحديث كمية القماش (${updatedItem.productName}${roomStr}) إلى ${updatedItem.meters} ${updatedItem.unitLabel || 'متر'}`, 'info');
    this.saveCart();
    this.renderCartDrawer();
    return updatedItem;
  }

  addToCart(item) {
    // فحص التطابق مع مراعاة اسم الغرفة حتى لا تدمج ستائر غرف مختلفة معاً
    const existingIndex = this.cart.findIndex(
      ci => ci.productId === item.productId &&
            ci.color === item.color &&
            ci.calculationMode === item.calculationMode &&
            ci.sewingType === item.sewingType &&
            (ci.roomName || '') === (item.roomName || '')
    );

    if (existingIndex > -1) {
      // Patch: تحديث كمية القماش الحالي
      const newMeters = Math.round((this.cart[existingIndex].meters + item.meters) * 10) / 10;
      this.patchCartItem(this.cart[existingIndex].id, { meters: newMeters });
    } else {
      // Push: إضافة عنصر جديد إلى المصفوفة
      this.pushToCart(item);
    }
  }

  removeFromCart(cartItemId) {
    // Pop: إزالة العنصر من السلة
    this.popCartItem(cartItemId);
  }

  clearCart() {
    this.cart = [];
    this.saveCart();
    this.renderCartDrawer();
  }

  getCartTotal() {
    const subtotal = Math.round(this.cart.reduce((sum, item) => sum + item.total, 0));
    const totalMeters = Math.round(this.cart.reduce((sum, item) => sum + item.meters, 0) * 10) / 10;
    const shipping = subtotal > 400 || subtotal === 0 ? 0 : 35;
    return {
      subtotal,
      totalMeters,
      shipping,
      grandTotal: subtotal + shipping
    };
  }

  updateCartBadges() {
    const count = this.cart.reduce((acc, item) => acc + 1, 0);
    document.querySelectorAll('.cart-count-badge').forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  }

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `naseej-toast toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span class="toast-msg">${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  // Render product catalog cards
  renderCatalog(containerId = 'products-grid') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let products = store.getProducts();

    // Filter by Category
    if (this.currentCategory !== 'all') {
      products = products.filter(p => p.category === this.currentCategory);
    }

    // Filter by Search Query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    if (products.length === 0) {
      container.innerHTML = `
        <div class="empty-catalog-state">
          <div class="empty-icon">🪟</div>
          <h3>لم يتم العثور على أقمشة مطابقة</h3>
          <p>جرّب البحث باسم قماش آخر أو تصفح كافة التصنيفات</p>
          <button class="btn btn-primary" onclick="window.naseejCustomer.resetFilters()">عرض كافة الأقمشة</button>
        </div>
      `;
      return;
    }

    container.innerHTML = products.map(product => {
      const stockBadge = product.stockMeters > 50
        ? `<span class="badge badge-success">متوفر بالمستودع (${product.stockMeters} متر)</span>`
        : `<span class="badge badge-warning">كمية محدودة (${product.stockMeters} متر)</span>`;

      const colorDots = (product.colors || []).slice(0, 4).map(c => `
        <span class="color-dot" style="background-color: ${c.hex};" title="${c.name}"></span>
      `).join('');

      return `
        <article class="fabric-card" data-id="${product.id}">
          <div class="fabric-card-media" onclick="window.naseejCustomer.openProductModal('${product.id}')">
            <img src="${product.image}" alt="${product.name}" loading="lazy" class="fabric-img">
            <div class="fabric-badges">
              <span class="badge badge-category">${product.categoryName}</span>
              ${product.isFeatured ? '<span class="badge badge-gold">⭐ الأكثر طلباً</span>' : ''}
              <span class="badge badge-tailor" style="background: rgba(16, 185, 129, 0.12); color: #065f46; font-size: 11px; font-weight: 700;">✂️ متاح تفصيل</span>
            </div>
            <div class="fabric-quick-actions">
              <span class="quick-view-text">انقر لتفصيل القماش وحساب الأمتار ✦</span>
            </div>
          </div>

          <div class="fabric-card-body">
            <div class="fabric-header">
              <h3 class="fabric-title" onclick="window.naseejCustomer.openProductModal('${product.id}')">${product.name}</h3>
              <div class="fabric-rating">
                <span class="star-icon">★</span>
                <span class="rating-num">${product.rating}</span>
                <span class="reviews-count">(${product.reviewsCount})</span>
              </div>
            </div>

            <p class="fabric-desc">${product.description}</p>

            <div class="fabric-specs-compact">
              <span class="spec-chip">📐 عرض الطاقة: ${product.rollWidth} سم</span>
              <span class="spec-chip">🌍 المنشأ: ${product.origin}</span>
            </div>

            <div class="fabric-colors-row">
              <span class="colors-label">الألوان:</span>
              <div class="color-dots-group">
                ${colorDots}
                ${product.colors && product.colors.length > 4 ? `<span class="more-colors">+${product.colors.length - 4}</span>` : ''}
              </div>
            </div>

            <div class="fabric-footer">
              <div class="price-container">
                <span class="price-val">${product.pricePerMeter}</span>
                <span class="price-currency">شيكل</span>
                <span class="price-unit">${product.category === 'tarsoon' ? '/ م² (متر مربع)' : '/ متر طولي'}</span>
              </div>

              <button class="btn btn-luxury-calc" onclick="window.naseejCustomer.openProductModal('${product.id}')" title="تفصيل هذا القماش وحساب المقاسات">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
                <span>تفصيل وحساب المقاسات</span>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // Open the curtain detail and smart calculator modal
  openProductModal(productId) {
    const product = store.getProductById(productId);
    if (!product) return;

    this.activeProductModal = product;
    this.activeCalculator.selectedColor = product.colors && product.colors.length > 0 ? product.colors[0].name : 'اللون الافتراضي';

    const modal = document.getElementById('product-modal');
    if (!modal) return;

    // Reset Room Designation Field
    const roomInput = document.getElementById('window-room-input');
    if (roomInput) roomInput.value = '';
    this.activeCalculator.roomName = '';

    // Set Product Information
    document.getElementById('modal-fabric-name').textContent = product.name;
    document.getElementById('modal-fabric-category').textContent = product.categoryName;
    document.getElementById('modal-fabric-img').src = product.image;
    document.getElementById('modal-fabric-desc').textContent = product.description;
    document.getElementById('modal-fabric-price').textContent = product.pricePerMeter;
    document.getElementById('modal-fabric-width').textContent = `${product.rollWidth} سم`;
    document.getElementById('modal-fabric-origin').textContent = product.origin;
    document.getElementById('modal-fabric-composition').textContent = product.composition;
    document.getElementById('modal-fabric-light').textContent = product.lightBlockage;
    document.getElementById('modal-fabric-stock').textContent = `${product.stockMeters} متر متبقي`;

    // Render Color Options
    const colorsContainer = document.getElementById('modal-colors-selector');
    colorsContainer.innerHTML = (product.colors || []).map((col, index) => `
      <label class="color-option ${index === 0 ? 'selected' : ''}">
        <input type="radio" name="modal-fabric-color" value="${col.name}" ${index === 0 ? 'checked' : ''} onchange="window.naseejCustomer.selectColor('${col.name}')">
        <span class="color-swatch-box" style="background-color: ${col.hex};"></span>
        <span class="color-name-text">${col.name}</span>
      </label>
    `).join('');

    // Render Features
    const featuresContainer = document.getElementById('modal-fabric-features');
    if (featuresContainer && product.features) {
      featuresContainer.innerHTML = product.features.map(f => `<li>✓ ${f}</li>`).join('');
    }

    // Configure UI for Tarsoon (Square Meter) vs Normal Fabric (Linear Meters & Sewing)
    const isTarsoon = product.category === 'tarsoon';
    const tarsoonBanner = document.getElementById('tarsoon-banner-note');
    const fullnessGroup = document.getElementById('calc-field-fullness');
    const dimLabel = document.getElementById('calc-dimensions-label');
    const dimHint = document.getElementById('calc-dimensions-hint');
    const widthSuffix = document.getElementById('window-width-suffix');
    const heightSuffix = document.getElementById('window-height-suffix');
    const tabDirect = document.getElementById('calc-tab-direct');

    if (isTarsoon) {
      if (tarsoonBanner) tarsoonBanner.style.display = 'block';
      if (fullnessGroup) fullnessGroup.style.display = 'none';
      if (dimLabel) dimLabel.textContent = 'مقاسات ستارة الترسون بالمتر (العرض × الطول):';
      if (dimHint) dimHint.textContent = 'حساب ستائر الترسون يتم بضرب العرض في الطول (المتر المربع) بسعر المتر المربع.';
      if (widthSuffix) widthSuffix.textContent = 'متر عرض';
      if (heightSuffix) heightSuffix.textContent = 'متر طول / ارتفاع';
      if (tabDirect) tabDirect.style.display = 'none';
      document.getElementById('modal-fabric-width').textContent = 'تفصيل حسب المقاس';
    } else {
      if (tarsoonBanner) tarsoonBanner.style.display = 'none';
      if (fullnessGroup) fullnessGroup.style.display = 'block';
      if (dimLabel) dimLabel.textContent = 'مقاسات النافذة أو الجدار (بالمتر):';
      if (dimHint) dimHint.textContent = 'عرض طاقة هذا القماش كافٍ لتغطية الارتفاع دون وصلات أفقية.';
      if (widthSuffix) widthSuffix.textContent = 'متر عرض';
      if (heightSuffix) heightSuffix.textContent = 'متر ارتفاع';
      if (tabDirect) tabDirect.style.display = 'block';
      document.getElementById('modal-fabric-width').textContent = `${product.rollWidth} سم`;
    }

    // Sync Fullness and Sewing Option
    const activeRatio = this.activeCalculator.fullnessRatio || 2.8;
    document.querySelectorAll('.fullness-btn').forEach(btn => {
      const oc = btn.getAttribute('onclick') || '';
      if (oc.includes(String(activeRatio))) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Reset mode to window by default
    this.setCalculatorMode('window');

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  selectColor(colorName) {
    this.activeCalculator.selectedColor = colorName;
    document.querySelectorAll('.color-option').forEach(el => {
      const input = el.querySelector('input');
      if (input && input.value === colorName) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  }

  setCalculatorMode(mode) {
    this.activeCalculator.mode = mode;
    const tabWindow = document.getElementById('calc-tab-window');
    const tabDirect = document.getElementById('calc-tab-direct');
    const sectionWindow = document.getElementById('calc-section-window');
    const sectionDirect = document.getElementById('calc-section-direct');
    const addBtn = document.getElementById('modal-add-to-cart-btn');
    const wholesaleActions = document.getElementById('modal-wholesale-actions');
    const summaryCard = document.getElementById('calc-summary-card');

    if (mode === 'window') {
      if (tabWindow) tabWindow.classList.add('active');
      if (tabDirect) tabDirect.classList.remove('active');
      if (sectionWindow) sectionWindow.style.display = 'block';
      if (sectionDirect) sectionDirect.style.display = 'none';
      if (addBtn) addBtn.style.display = 'flex';
      if (wholesaleActions) wholesaleActions.style.display = 'none';
      if (summaryCard) summaryCard.style.display = 'block';
    } else {
      if (tabDirect) tabDirect.classList.add('active');
      if (tabWindow) tabWindow.classList.remove('active');
      if (sectionDirect) sectionDirect.style.display = 'block';
      if (sectionWindow) sectionWindow.style.display = 'none';
      // In direct/wholesale mode, hide add to cart button and show direct contact actions
      if (addBtn) addBtn.style.display = 'none';
      if (wholesaleActions) wholesaleActions.style.display = 'block';
      if (summaryCard) summaryCard.style.display = 'none';
    }

    this.updateCalculatorCalculation();
  }

  setFullness(ratio, sewingType, el) {
    if (typeof sewingType !== 'string' && !el) {
      el = sewingType;
      sewingType = '';
    }
    this.activeCalculator.fullnessRatio = Number(ratio);
    if (sewingType) {
      this.activeCalculator.sewingType = sewingType;
    }
    document.querySelectorAll('.fullness-btn').forEach(btn => btn.classList.remove('active'));
    if (el) el.classList.add('active');
    this.updateCalculatorCalculation();
  }

  setRoomTag(roomName) {
    const roomInput = document.getElementById('window-room-input');
    if (roomInput) {
      roomInput.value = roomName;
      roomInput.focus();
    }
    this.updateCalculatorCalculation();
  }

  adjustDirectMeters(delta) {
    let current = Number(this.activeCalculator.directMeters) || 1;
    current = Math.max(1, Math.min(150, current + delta));
    this.activeCalculator.directMeters = current;
    const input = document.getElementById('direct-meters-input');
    if (input) input.value = current;
    this.updateCalculatorCalculation();
  }

  updateCalculatorCalculation() {
    if (!this.activeProductModal) return;

    const product = this.activeProductModal;
    const isTarsoon = product.category === 'tarsoon';
    let requiredMeters = 0;
    let summaryText = '';

    const roomInput = document.getElementById('window-room-input');
    const roomName = roomInput ? roomInput.value.trim() : '';
    this.activeCalculator.roomName = roomName;
    const roomPrefix = roomName ? `🪟 [${roomName}] ` : '';

    const meterEl = document.getElementById('calc-result-meters');
    const priceEl = document.getElementById('calc-result-price');
    const summaryEl = document.getElementById('calc-result-summary');
    const meterLabel = document.getElementById('calc-meters-label');

    // Scenario 1: Tarsoon Curtains (Square Meters = Length × Width)
    if (isTarsoon) {
      const widthInput = document.getElementById('window-width-input');
      const heightInput = document.getElementById('window-height-input');
      const width = widthInput ? Number(widthInput.value) || 2.0 : 2.0;
      const height = heightInput ? Number(heightInput.value) || 2.0 : 2.0;

      this.activeCalculator.windowWidth = width;
      this.activeCalculator.windowHeight = height;

      // Area in m²
      const area = Math.round((width * height) * 100) / 100;
      requiredMeters = area;
      const pricePerSqm = product.pricePerMeter;
      const totalPrice = Math.round(area * pricePerSqm);
      summaryText = `${roomPrefix}ستائر ترسون: عرض ${width} م × ارتفاع/طول ${height} م = إجمالي المساحة (${area} م²) بسعر ${pricePerSqm} شيكل/م²`;

      if (meterLabel) meterLabel.textContent = 'إجمالي المساحة:';
      if (meterEl) meterEl.textContent = `${area} م² (متر مربع)`;
      if (priceEl) priceEl.textContent = `${totalPrice.toLocaleString()} شيكل`;
      if (summaryEl) summaryEl.textContent = summaryText;

      this.activeCalculator.currentMeters = area;
      this.activeCalculator.currentTotalPrice = totalPrice;
      this.activeCalculator.summaryText = summaryText;
      return;
    }

    // Scenario 2: Normal Curtain Fabrics
    if (meterLabel) meterLabel.textContent = 'إجمالي الأمتار:';

    if (this.activeCalculator.mode === 'window') {
      const widthInput = document.getElementById('window-width-input');
      const heightInput = document.getElementById('window-height-input');
      const width = widthInput ? Number(widthInput.value) || 3.0 : 3.0;
      const height = heightInput ? Number(heightInput.value) || 2.8 : 2.8;

      this.activeCalculator.windowWidth = width;
      this.activeCalculator.windowHeight = height;

      // In curtain making: Width of track/window/wall × Fullness ratio = Required fabric linear meters
      const fullness = this.activeCalculator.fullnessRatio || 2.8;
      const sewingType = this.activeCalculator.sewingType || 'كسرات أمريكي / شتوح';
      const rawMeters = width * fullness;
      requiredMeters = Math.round(rawMeters * 10) / 10;

      summaryText = `${roomPrefix}خياطة (${sewingType}) | عرض الجدار ${width} م × ارتفاع ${height} م (معامل ${fullness} م قماش/م حيط)`;
    } else {
      const directInput = document.getElementById('direct-meters-input');
      requiredMeters = directInput ? Math.max(1, Number(directInput.value) || 1) : this.activeCalculator.directMeters;
      this.activeCalculator.directMeters = requiredMeters;
      summaryText = `طلب أقمشة بالجملة - يرجى التواصل هاتفياً أو عبر واتساب مع مسؤولي المبيعات المعتمدين`;
    }

    const pricePerMeter = product.pricePerMeter;
    const totalPrice = Math.round(requiredMeters * pricePerMeter);

    if (meterEl) meterEl.textContent = `${requiredMeters} متر`;
    if (priceEl) priceEl.textContent = `${totalPrice.toLocaleString()} شيكل`;
    if (summaryEl) summaryEl.textContent = summaryText;

    this.activeCalculator.currentMeters = requiredMeters;
    this.activeCalculator.currentTotalPrice = totalPrice;
    this.activeCalculator.summaryText = summaryText;
  }

  addCurrentModalToCart() {
    if (!this.activeProductModal) return;
    const product = this.activeProductModal;
    const isTarsoon = product.category === 'tarsoon';

    // If in direct wholesale mode, customer must contact team first
    if (this.activeCalculator.mode === 'direct') {
      this.showToast('يفضل التواصل معنا لشراء قماش بالجملة عبر الأرقام الموضحة', 'info');
      return;
    }

    const meters = this.activeCalculator.currentMeters || (isTarsoon ? 4 : 5);
    if (meters > product.stockMeters) {
      this.showToast(`المخزون المتوفر حالياً (${product.stockMeters} ${isTarsoon ? 'م²' : 'متر'}) أقل من المطلوب`, 'error');
      return;
    }

    const roomInput = document.getElementById('window-room-input');
    const roomName = roomInput ? roomInput.value.trim() : '';

    const sewingType = isTarsoon
      ? 'ستائر ترسون (بالمتر المربع)'
      : (this.activeCalculator.sewingType || 'كسرات أمريكي / شتوح');

    const item = {
      productId: product.id,
      productName: product.name,
      roomName: roomName || (isTarsoon ? 'ستارة ترسون' : 'شباك تفصيل'),
      categoryName: product.categoryName,
      image: product.image,
      color: this.activeCalculator.selectedColor,
      sewingType: sewingType,
      isTarsoon: isTarsoon,
      unitLabel: isTarsoon ? 'م²' : 'متر',
      fullnessRatio: !isTarsoon && this.activeCalculator.mode === 'window' ? this.activeCalculator.fullnessRatio : null,
      meters: meters,
      pricePerMeter: product.pricePerMeter,
      total: Math.round(meters * product.pricePerMeter),
      calculationMode: isTarsoon ? 'tarsoon_sqm' : this.activeCalculator.mode,
      details: this.activeCalculator.summaryText,
      addedAt: new Date().toISOString()
    };

    this.addToCart(item);
    this.closeProductModal();
    this.openCartDrawer();
  }

  closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
    this.activeProductModal = null;
  }

  // Cart Drawer Logic
  openCartDrawer() {
    this.renderCartDrawer();
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
  }

  closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  renderCartDrawer() {
    const itemsContainer = document.getElementById('cart-drawer-items');
    if (!itemsContainer) return;

    if (this.cart.length === 0) {
      itemsContainer.innerHTML = `
        <div class="cart-empty-state">
          <div class="cart-empty-icon">🛍️</div>
          <h4>سلة مشترياتك فارغة</h4>
          <p>تصفح كتالوج أقمشة الستائر الفاخرة واختر ما يناسب منزلك</p>
          <button class="btn btn-outline" onclick="window.naseejCustomer.closeCartDrawer()">تصفح الأقمشة الآن</button>
        </div>
      `;
      document.getElementById('cart-drawer-footer').style.display = 'none';
      return;
    }

    document.getElementById('cart-drawer-footer').style.display = 'block';

    itemsContainer.innerHTML = this.cart.map(item => `
      <div class="cart-item-card" data-id="${item.id}">
        <img src="${item.image}" alt="${item.productName}" class="cart-item-thumb">
        <div class="cart-item-info">
          <h5 class="cart-item-title">${item.productName}</h5>
          <div class="cart-item-color">
            ${item.roomName ? `<span class="badge-room-tag" style="margin-left: 5px;">🪟 ${item.roomName}</span>` : ''}
            اللون: <span class="badge-color-tag">${item.color}</span>
            ${item.sewingType ? `<span class="badge-color-tag" style="background: rgba(212,175,55,0.15); color: #856404; font-weight: 700; margin-right: 4px;">${item.sewingType}</span>` : ''}
          </div>
          <div class="cart-item-meta">${item.details}</div>
          <div class="cart-item-pricing">
            <span class="cart-item-meters"><strong>${item.meters} ${item.unitLabel || (item.isTarsoon ? 'م²' : 'متر')}</strong> × ${item.pricePerMeter} شيكل</span>
            <span class="cart-item-total">${item.total.toLocaleString()} شيكل</span>
          </div>
        </div>
        <button class="btn-remove-item" onclick="window.naseejCustomer.removeFromCart('${item.id}')" title="حذف من السلة">✕</button>
      </div>
    `).join('');

    const totals = this.getCartTotal();
    document.getElementById('cart-subtotal').textContent = `${totals.subtotal.toLocaleString()} شيكل`;
    document.getElementById('cart-shipping').textContent = 'استلام مجاني (0 ₪) أو توصيل';
    document.getElementById('cart-grandtotal').textContent = `${totals.subtotal.toLocaleString()} شيكل`;
    document.getElementById('cart-total-meters-badge').textContent = `إجمالي الأمتار: ${totals.totalMeters} متر`;
  }

  // ==========================================
  // CHECKOUT & FULFILLMENT (Pickup / Delivery)
  // ==========================================

  setFulfillmentType(type) {
    this.checkoutFulfillment = type;
    const cardPickup = document.getElementById('fulfillment-card-pickup');
    const cardDelivery = document.getElementById('fulfillment-card-delivery');
    const sectionPickup = document.getElementById('checkout-pickup-section');
    const sectionDelivery = document.getElementById('checkout-delivery-section');
    const radioPickup = document.querySelector('input[name="checkout-fulfillment"][value="pickup"]');
    const radioDelivery = document.querySelector('input[name="checkout-fulfillment"][value="delivery"]');

    if (type === 'pickup') {
      if (cardPickup) cardPickup.classList.add('active');
      if (cardDelivery) cardDelivery.classList.remove('active');
      if (radioPickup) radioPickup.checked = true;
      if (sectionPickup) sectionPickup.style.display = 'block';
      if (sectionDelivery) sectionDelivery.style.display = 'none';
    } else {
      if (cardDelivery) cardDelivery.classList.add('active');
      if (cardPickup) cardPickup.classList.remove('active');
      if (radioDelivery) radioDelivery.checked = true;
      if (sectionPickup) sectionPickup.style.display = 'none';
      if (sectionDelivery) sectionDelivery.style.display = 'block';
    }

    this.updateCheckoutSummary();
  }

  handleFulfillmentChange() {
    const checkedRadio = document.querySelector('input[name="checkout-fulfillment"]:checked');
    const type = checkedRadio ? checkedRadio.value : 'pickup';
    this.setFulfillmentType(type);
  }

  getCheckoutFulfillment() {
    const checkedRadio = document.querySelector('input[name="checkout-fulfillment"]:checked');
    const type = checkedRadio ? checkedRadio.value : (this.checkoutFulfillment || 'pickup');

    if (type === 'pickup') {
      const branchSelect = document.getElementById('checkout-pickup-branch');
      const branch = branchSelect ? branchSelect.value : 'نابلس - باب الساحة';
      return {
        type: 'pickup',
        branch: branch,
        region: '',
        fee: 0,
        summaryLabel: `استلام من فرع (${branch})`
      };
    } else {
      const regionSelect = document.getElementById('checkout-delivery-region');
      const region = regionSelect ? regionSelect.value : 'الضفة الغربية';
      let fee = 20;
      if (region.includes('القدس')) fee = 45;
      else if (region.includes('الداخل') || region.includes('48')) fee = 80;

      return {
        type: 'delivery',
        branch: '',
        region: region,
        fee: fee,
        summaryLabel: `أجور توصيل (${region})`
      };
    }
  }

  toggleLoyaltyDiscount(checked) {
    this.applyLoyaltyDiscount = Boolean(checked);
    this.updateCheckoutSummary();
  }

  updateCheckoutSummary() {
    const fulfillment = this.getCheckoutFulfillment();
    const installCheckbox = document.getElementById('checkout-install-toggle');
    const requiresInstallation = installCheckbox ? installCheckbox.checked : false;

    // Delivery fee is determined by fulfillment selection (West Bank 20, Jerusalem 45, Interior 80, Pickup 0)
    const effectiveShippingFee = fulfillment.fee;
    const subtotal = Math.round(this.cart.reduce((sum, item) => sum + item.total, 0));

    // Loyalty Points Logic: threshold 250 pts (500 ₪ spend), 100 pts = 5 ₪, max 15% discount
    const user = auth.getCurrentUser();
    const isCustomer = user && user.role === 'customer';
    const userPoints = isCustomer ? (user.points || 0) : 0;

    const MIN_REDEEM_POINTS = 250;
    const MAX_DISCOUNT_PERCENT = 0.15;

    let actualDiscount = 0;
    let actualPointsUsed = 0;

    if (isCustomer && userPoints >= MIN_REDEEM_POINTS) {
      const rawDiscount = Math.floor((userPoints / 100) * 5 * 10) / 10;
      const maxCapDiscount = Math.floor(subtotal * MAX_DISCOUNT_PERCENT * 10) / 10;
      const eligibleDiscount = Math.min(rawDiscount, maxCapDiscount);
      const pointsToUse = Math.round((eligibleDiscount / 5) * 100);

      if (this.applyLoyaltyDiscount) {
        actualDiscount = eligibleDiscount;
        actualPointsUsed = pointsToUse;
      }

      // Update banner to show redemption toggle
      const loyaltyContainer = document.getElementById('checkout-loyalty-container');
      if (loyaltyContainer) {
        loyaltyContainer.className = 'loyalty-notice-banner unlocked';
        loyaltyContainer.style.background = 'linear-gradient(135deg, rgba(22, 163, 74, 0.12), rgba(22, 163, 74, 0.04))';
        loyaltyContainer.style.borderColor = '#16a34a';
        loyaltyContainer.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 24px;">🎉</span>
              <div>
                <strong style="color: #166534;">رصيدك مؤهل للخصم! (متوفر لديك ${userPoints} نقطة ولاء)</strong>
                <div style="font-size: 12px; color: #15803d; margin-top: 2px;">
                  يمكنك استبدال نقاطك والحصول على خصم مباشر بقيمة <strong>${eligibleDiscount} شيكل</strong> من هذه الطلبية.
                </div>
              </div>
            </div>
            <label style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; background: #ffffff; padding: 7px 14px; border-radius: 20px; border: 1.5px solid #16a34a; box-shadow: 0 2px 8px rgba(22, 163, 74, 0.15);">
              <input type="checkbox" id="loyalty-discount-toggle" ${this.applyLoyaltyDiscount ? 'checked' : ''} onchange="window.naseejCustomer.toggleLoyaltyDiscount(this.checked)" style="width: 17px; height: 17px; accent-color: #16a34a; cursor: pointer;">
              <span style="font-weight: 700; color: #166534; font-size: 13px;">تطبيق الخصم الآن</span>
            </label>
          </div>
        `;
      }
    } else {
      this.applyLoyaltyDiscount = false;
      const loyaltyContainer = document.getElementById('checkout-loyalty-container');
      if (loyaltyContainer) {
        if (isCustomer) {
          const needed = MIN_REDEEM_POINTS - userPoints;
          loyaltyContainer.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))';
          loyaltyContainer.style.borderColor = '#d4af37';
          loyaltyContainer.innerHTML = `
            <span style="font-size: 22px;">🎁</span>
            <div>
              <div style="font-weight: 700; color: #856404;">رصيد نقاط الولاء الحالي: <strong>${userPoints} نقطة</strong></div>
              <div style="font-size: 12px; color: #785800; margin-top: 2px;">
                يبدأ استبدال النقاط بمبالغ تُخصم من الطلبية عند وصول رصيدك إلى 250 نقطة (يلزمك ${needed} نقطة).
              </div>
            </div>
          `;
        } else {
          loyaltyContainer.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))';
          loyaltyContainer.style.borderColor = '#d4af37';
          loyaltyContainer.innerHTML = `
            <span style="font-size: 22px;">🎁</span>
            <div>
              <div style="font-weight: 700; color: #856404;">برنامج نقاط الولاء لزبائن شركة الولاء</div>
              <div style="font-size: 12px; color: #785800; margin-top: 2px;">
                استبدال نقاط الولاء بمبالغ تُخصم من الطلبية، يبدأ الاستبدال عند وصول رصيدك إلى 250 نقطة.
              </div>
            </div>
          `;
        }
      }
    }

    const grandTotal = Math.max(0, subtotal - actualDiscount + effectiveShippingFee);

    const summaryContainer = document.getElementById('checkout-items-summary');
    if (!summaryContainer) return;

    summaryContainer.innerHTML = this.cart.map(item => `
      <div class="checkout-summary-row">
        <div>
          <span style="font-weight: 600;">${item.productName} (${item.color})</span>
          ${item.roomName ? `<div style="font-size: 12px; color: #0284c7; font-weight: 700; margin-top: 2px;">🪟 ${item.roomName}</div>` : ''}
          ${item.sewingType ? `<div style="font-size: 12px; color: var(--gold-dark); font-weight: 600; margin-top: 2px;">${item.sewingType} × ${item.meters} ${item.unitLabel || (item.isTarsoon ? 'م²' : 'م')}</div>` : `<div style="font-size: 12px; color: #64748b;">${item.meters} ${item.unitLabel || (item.isTarsoon ? 'م²' : 'م')}</div>`}
        </div>
        <strong>${item.total.toLocaleString()} شيكل</strong>
      </div>
    `).join('') + `
      <div class="checkout-summary-row border-top">
        <span>المجموع الفرعي (سعر الأقمشة والتفصيل):</span>
        <span>${subtotal.toLocaleString()} شيكل</span>
      </div>
      ${actualDiscount > 0 ? `
      <div class="checkout-summary-row" style="color: #166534; font-weight: 700; background: #ecfdf5; padding: 7px 10px; border-radius: 6px; margin: 4px 0;">
        <span>🎁 خصم رصيد نقاط الولاء (استبدال ${actualPointsUsed} نقطة):</span>
        <span>-${actualDiscount.toLocaleString()} شيكل</span>
      </div>
      ` : ''}
      <div class="checkout-summary-row" style="color: ${fulfillment.fee === 0 ? '#15803d' : '#0f172a'}; font-weight: 600;">
        <span>${fulfillment.summaryLabel}:</span>
        <span>${fulfillment.fee === 0 ? 'مجاناً (0 شيكل)' : `+${fulfillment.fee} شيكل`}</span>
      </div>
      ${requiresInstallation ? `
      <div class="checkout-summary-row" style="color: #3730a3; font-weight: 700; background: #e0e7ff; padding: 7px 10px; border-radius: 6px; margin: 4px 0;">
        <span>🔧 أجور خدمة التركيب في الموقع:</span>
        <span style="font-size: 12.5px;">متراوحة حسب عدد الشبابيك (تحدد وتدفع عند التركيب)</span>
      </div>
      ` : ''}
      <div class="checkout-summary-row total-row">
        <span>المجموع الإجمالي (الدفع عند الاستلام):</span>
        <span class="gold-text">${grandTotal.toLocaleString()} شيكل</span>
      </div>
    `;

    // Update fee badge on delivery card
    const deliveryBadge = document.getElementById('fulfillment-delivery-badge');
    if (deliveryBadge) {
      if (requiresInstallation) {
        deliveryBadge.textContent = 'مجاناً مع التركيب';
      } else {
        deliveryBadge.textContent = fulfillment.type === 'delivery' ? `+${fulfillment.fee} شيكل` : 'حسب المنطقة';
      }
    }
  }

  // Checkout Modal
  openCheckoutModal() {
    if (this.cart.length === 0) {
      this.showToast('سلة المشتريات فارغة!', 'error');
      return;
    }

    this.closeCartDrawer();
    const modal = document.getElementById('checkout-modal');
    if (!modal) return;

    // Prefill customer credentials if logged in
    const currentUser = auth.getCurrentUser();
    if (currentUser) {
      document.getElementById('checkout-name').value = currentUser.name || '';
      document.getElementById('checkout-phone').value = currentUser.phone || '';
      document.getElementById('checkout-email').value = currentUser.email || '';
      const cityInput = document.getElementById('checkout-city-input');
      if (cityInput && currentUser.city) {
        cityInput.value = currentUser.city;
      }
    }

    // Default to store pickup (free) or preserve current
    this.setFulfillmentType(this.checkoutFulfillment || 'pickup');
    this.updateCheckoutSummary();

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Submit Order
  submitOrder(event) {
    if (event) event.preventDefault();

    const nameInput = document.getElementById('checkout-name');
    const phoneInput = document.getElementById('checkout-phone');
    const emailInput = document.getElementById('checkout-email');
    const notesInput = document.getElementById('checkout-notes');
    const paymentMethodEl = document.querySelector('input[name="checkout-payment"]:checked');

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const notes = notesInput ? notesInput.value.trim() : '';
    const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'الدفع عند الاستلام';

    if (!phone) {
      this.showToast('يرجى إدخال رقم الهاتف الشخصي للتواصل والشحن', 'error');
      phoneInput.focus();
      return;
    }

    if (email && !email.includes('@')) {
      this.showToast('يرجى إدخال بريد إلكتروني صحيح أو ترك الحقل فارغاً', 'error');
      emailInput.focus();
      return;
    }

    if (!name) {
      this.showToast('يرجى كتابة الاسم الكامل للمستلم', 'error');
      nameInput.focus();
      return;
    }

    const fulfillment = this.getCheckoutFulfillment();
    let city = 'نابلس';
    let address = '';

    if (fulfillment.type === 'pickup') {
      city = 'نابلس';
      address = `استلام من الفرع: ${fulfillment.branch}`;
    } else {
      const cityInput = document.getElementById('checkout-city-input');
      const addressInput = document.getElementById('checkout-address');
      city = cityInput && cityInput.value.trim() ? cityInput.value.trim() : fulfillment.region;
      address = addressInput ? addressInput.value.trim() : '';

      if (!address) {
        this.showToast('يرجى كتابة عنوان التوصيل بالتفصيل (الحي، الشارع)', 'error');
        if (addressInput) addressInput.focus();
        return;
      }
    }

    const installCheckbox = document.getElementById('checkout-install-toggle');
    const requiresInstallation = installCheckbox ? installCheckbox.checked : false;

    // Shipping fee applies based on delivery region or showroom pickup
    const shippingFee = fulfillment.fee;
    const installationFee = 0; // variable / agreed based on windows

    const subtotal = Math.round(this.cart.reduce((sum, item) => sum + item.total, 0));
    const totalMeters = Math.round(this.cart.reduce((sum, item) => sum + item.meters, 0) * 10) / 10;

    // Loyalty Points Deduction & Earn Logic (250 pts min, 100 pts = 5 NIS, max 15% cap)
    let user = auth.getCurrentUser();
    const isCustomer = user && user.role === 'customer';
    const userPoints = isCustomer ? (user.points || 0) : 0;

    let actualDiscount = 0;
    let actualPointsUsed = 0;

    if (isCustomer && userPoints >= 250 && this.applyLoyaltyDiscount) {
      const rawDiscount = Math.floor((userPoints / 100) * 5 * 10) / 10;
      const maxCap = Math.floor(subtotal * 0.15 * 10) / 10;
      actualDiscount = Math.min(rawDiscount, maxCap);
      actualPointsUsed = Math.round((actualDiscount / 5) * 100);

      // Deduct redeemed points
      auth.updateUserPoints(user.userId || user.phone, -actualPointsUsed);
    }

    const paidSubtotal = Math.max(0, subtotal - actualDiscount);
    const grandTotal = paidSubtotal + shippingFee;

    // Loyalty Points: 50 points per 100 ₪ on net paid amount
    const pointsEarned = Math.floor((paidSubtotal / 100) * 50);

    // Credit newly earned points
    if (isCustomer) {
      auth.updateUserPoints(user.userId || user.phone, pointsEarned);
      this.updateUserUI();
    }

    const orderData = {
      customer: {
        name: name || (user ? user.name : 'عميل زائر'),
        phone: phone,
        email: email || '',
        city: city,
        address: address,
        notes: notes
      },
      deliveryType: fulfillment.type,
      pickupBranch: fulfillment.branch,
      deliveryRegion: fulfillment.region,
      requiresInstallation: requiresInstallation,
      installationFee: installationFee,
      source: 'online',
      discount: actualDiscount,
      pointsUsed: actualPointsUsed,
      loyaltyPoints: pointsEarned,
      items: this.cart.map(item => ({
        productId: item.productId,
        productName: item.productName,
        roomName: item.roomName || '',
        color: item.color,
        sewingType: item.sewingType || 'عادي',
        fullnessRatio: item.fullnessRatio || null,
        meters: item.meters,
        unitLabel: item.unitLabel || (item.isTarsoon ? 'م²' : 'متر'),
        pricePerMeter: item.pricePerMeter,
        total: item.total,
        notes: item.details
      })),
      totalMeters: totalMeters,
      subtotal: subtotal,
      shippingFee: shippingFee,
      grandTotal: grandTotal,
      paymentMethod: paymentMethod
    };

    const newOrder = store.createOrder(orderData);
    this.clearCart();
    this.applyLoyaltyDiscount = false;
    this.closeCheckoutModal();

    // Show Order Success Modal
    this.showOrderSuccessModal(newOrder);
  }

  showOrderSuccessModal(order) {
    const modal = document.getElementById('order-success-modal');
    if (!modal) return;

    document.getElementById('success-order-id').textContent = order.id;
    document.getElementById('success-customer-name').textContent = order.customer.name;
    document.getElementById('success-customer-phone').textContent = order.customer.phone;
    document.getElementById('success-customer-email').textContent = order.customer.email || 'طلب كزائر (بدون إيميل)';

    const fulfillmentEl = document.getElementById('success-order-fulfillment');
    if (fulfillmentEl) {
      if (order.requiresInstallation) {
        fulfillmentEl.textContent = `🔧 خدمة تركيب في الموقع مع توصيل مجاني (0 ₪) | أجور التركيب متراوحة حسب عدد النوافذ`;
      } else if (order.deliveryType === 'pickup') {
        fulfillmentEl.textContent = `🏪 استلام من الفرع (${order.pickupBranch || 'نابلس - باب الساحة'}) - 0 شيكل`;
      } else {
        fulfillmentEl.textContent = `🚚 توصيل (${order.deliveryRegion || order.customer.city}) - أجور: ${order.shippingFee} شيكل`;
      }
    }

    document.getElementById('success-order-meters').textContent = `${order.totalMeters} متر`;
    document.getElementById('success-order-total').textContent = `${order.grandTotal.toLocaleString()} شيكل`;

    const pointsEl = document.getElementById('success-loyalty-points');
    if (pointsEl) {
      if (order.pointsUsed && order.pointsUsed > 0) {
        pointsEl.innerHTML = `<span>وفرت <strong>${order.discount} ₪</strong> (استبدال ${order.pointsUsed} نقطة) + كسبت <strong>+${order.loyaltyPoints} نقطة جديدة</strong>!</span>`;
      } else {
        pointsEl.textContent = `+${order.loyaltyPoints || 0} نقطة ولاء للطلب`;
      }
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeOrderSuccessModal() {
    const modal = document.getElementById('order-success-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Customer Orders List Modal (طلباتي)
  openMyOrdersModal() {
    const user = auth.getCurrentUser();
    const modal = document.getElementById('my-orders-modal');
    if (!modal) return;

    const listContainer = document.getElementById('my-orders-list');

    if (!user) {
      listContainer.innerHTML = `
        <div class="auth-required-box">
          <div class="auth-icon">📱</div>
          <h4>سجّل دخولك لمشاهدة طلباتك</h4>
          <p>أدخل رقم هاتفك وبريدك الإلكتروني لمتابعة حالة تفصيل وشحن أقمشة الستائر الخاصة بك</p>
          <button class="btn btn-primary" onclick="window.naseejCustomer.closeMyOrdersModal(); window.naseejCustomer.openAuthModal();">
            تسجيل الدخول / إنشاء حساب
          </button>
        </div>
      `;
    } else {
      const allOrders = store.getOrders();
      // Match orders by phone or email
      const userOrders = allOrders.filter(
        o => (o.customer && (o.customer.phone === user.phone || o.customer.email === user.email))
      );

      const userPoints = user.points || 0;
      const pointsHeaderHtml = `
        <div class="my-orders-points-banner" style="background: linear-gradient(135deg, #0b1120 0%, #1e293b 100%); border: 1.5px solid rgba(212, 175, 55, 0.4); border-radius: 12px; padding: 14px; margin-bottom: 14px; color: #ffffff; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 24px;">🎁</span>
              <div>
                <div style="font-size: 11px; color: #d4af37; font-weight: 700;">رصيد نقاط الولاء المعتمد</div>
                <div style="font-size: 18px; font-weight: 800; color: #fef08a;">${userPoints.toLocaleString()} <span style="font-size: 12.5px; font-weight: 600; color: #cbd5e1;">نقطة</span></div>
              </div>
            </div>
            <div>
              <span class="badge" style="background: ${userPoints >= 250 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color: ${userPoints >= 250 ? '#34d399' : '#fbbf24'}; border: 1px solid ${userPoints >= 250 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}; font-size: 11px; padding: 4px 8px; border-radius: 6px; font-weight: 700;">
                ${userPoints >= 250 ? '✓ مؤهل للخصم' : 'يلزمك 250 نقطة'}
              </span>
            </div>
          </div>
          <div style="font-size: 11.5px; color: #94a3b8; line-height: 1.5; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 8px;">
            💡 <strong style="color: #e2e8f0;">طريقة الاستبدال:</strong> استبدال نقاط الولاء بمبالغ تُخصم من الطلبية، يبدأ الاستبدال من 250 نقطة.
          </div>
        </div>
      `;

      if (userOrders.length === 0) {
        listContainer.innerHTML = `
          ${pointsHeaderHtml}
          <div class="empty-orders-box">
            <div class="empty-icon">📦</div>
            <h4>لا توجد طلبات سابقة مسجلة برقم (${user.phone})</h4>
            <p>اختر أقمشة الستائر التي تعجبك وقم بإتمام أول طلب لتتابعه من هنا</p>
          </div>
        `;
      } else {
        listContainer.innerHTML = pointsHeaderHtml + userOrders.map(order => {
          const statusClasses = {
            pending: 'badge-status-pending',
            in_tailoring: 'badge-status-process',
            ready: 'badge-status-ready',
            shipped: 'badge-status-shipped',
            delivered: 'badge-status-delivered'
          };
          const statusClass = statusClasses[order.orderStatus] || 'badge-status-pending';

          const fulfillmentBadge = order.deliveryType === 'pickup'
            ? `<span class="badge" style="background: #dcfce7; color: #15803d; font-size: 11.5px; padding: 3px 8px;">🏪 استلام: ${order.pickupBranch || 'نابلس'}</span>`
            : `<span class="badge" style="background: #e0f2fe; color: #0369a1; font-size: 11.5px; padding: 3px 8px;">🚚 توصيل: ${order.deliveryRegion || order.customer.city} (${order.shippingFee} ₪)</span>`;

          const itemsHtml = (order.items || []).map(it => `
            <div class="order-item-chip" style="margin-bottom: 6px;">
              ${it.roomName ? `<span class="badge-room-tag" style="margin-left: 6px;">🪟 ${it.roomName}</span>` : ''}
              <strong>${it.productName}</strong> (${it.color})${it.sewingType ? ` [${it.sewingType}]` : ''} - <strong>${it.meters} ${it.unitLabel || 'متر'}</strong> [${it.total.toLocaleString()} شيكل]
              ${it.notes ? `<div style="font-size: 11.5px; color: #64748b; margin-top: 3px;">📍 ${it.notes}</div>` : ''}
            </div>
          `).join('');

          const dateStr = new Date(order.date).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          return `
            <div class="customer-order-card">
              <div class="order-card-header">
                <div>
                  <span class="order-id-label">رقم الطلب: <strong>${order.id}</strong></span>
                  <span class="order-date-label">📅 ${dateStr}</span>
                </div>
                <span class="badge ${statusClass}">${order.statusText}</span>
              </div>

              <div class="order-card-items">
                ${itemsHtml}
              </div>

              <div class="order-card-footer" style="flex-wrap: wrap; gap: 10px;">
                <span>إجمالي الأمتار: <strong>${order.totalMeters} متر</strong></span>
                <span>طريقة التسليم: ${fulfillmentBadge}</span>
                <span>طريقة الدفع: <strong>${order.paymentMethod}</strong></span>
                <span class="order-total-highlight">الإجمالي: ${order.grandTotal.toLocaleString()} شيكل</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeMyOrdersModal() {
    const modal = document.getElementById('my-orders-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Customer & Admin Auth Modal (Unified)
  openAuthModal(tab = 'login') {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.add('active');
      this.switchAuthTab(tab);
      document.body.style.overflow = 'hidden';
    }
  }

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  switchAuthTab(tab) {
    const loginTabBtn = document.getElementById('tab-btn-login');
    const regTabBtn = document.getElementById('tab-btn-register');
    const loginPane = document.getElementById('auth-pane-login');
    const regPane = document.getElementById('auth-pane-register');
    const modalTitle = document.getElementById('auth-modal-title');

    if (tab === 'register') {
      if (loginTabBtn) loginTabBtn.classList.remove('active');
      if (regTabBtn) regTabBtn.classList.add('active');
      if (loginPane) loginPane.style.display = 'none';
      if (regPane) regPane.style.display = 'block';
      if (modalTitle) modalTitle.textContent = 'إنشاء حساب عميل جديد';
    } else {
      if (loginTabBtn) loginTabBtn.classList.add('active');
      if (regTabBtn) regTabBtn.classList.remove('active');
      if (loginPane) loginPane.style.display = 'block';
      if (regPane) regPane.style.display = 'none';
      if (modalTitle) modalTitle.textContent = 'تسجيل الدخول إلى حسابك';
    }
  }

  togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (btn) btn.textContent = '👁️‍🗨️';
    } else {
      input.type = 'password';
      if (btn) btn.textContent = '👁️';
    }
  }

  handleLoginSubmit(event) {
    if (event) event.preventDefault();
    const idInput = document.getElementById('login-identifier');
    const passInput = document.getElementById('login-password');
    const identifier = idInput ? idInput.value : '';
    const password = passInput ? passInput.value : '';

    try {
      const session = auth.login(identifier, password);
      this.closeAuthModal();
      this.updateUserUI();

      if (session.role === 'admin') {
        this.showToast(`أهلاً بك يا ${session.name}! تم تسجيل الدخول بصلاحيات مدير النظام 🛡️`, 'success');
        if (window.naseejApp) {
          window.naseejApp.openAdminView();
        }
      } else {
        this.showToast(`مرحباً بك يا ${session.name}! تم تسجيل الدخول بنجاح 🛍️`, 'success');
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  handleRegisterSubmit(event) {
    if (event) event.preventDefault();
    const name = document.getElementById('reg-name')?.value || '';
    const phone = document.getElementById('reg-phone')?.value || '';
    const email = document.getElementById('reg-email')?.value || '';
    const password = document.getElementById('reg-password')?.value || '';
    const city = document.getElementById('reg-city')?.value || 'نابلس';

    try {
      const session = auth.registerCustomer({ name, phone, email, password, city });
      this.closeAuthModal();
      this.updateUserUI();
      this.showToast(`أهلاً بك يا ${session.name}! تم إنشاء حساب العميل بنجاح وتم تسجيل دخولك تلقائياً ✓`, 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // Smooth scroll to target sections (Contacts Table, Catalog, Tailoring, etc.)
  scrollToSection(sectionId, event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    if (window.naseejApp && window.naseejApp.currentView !== 'storefront') {
      window.naseejApp.openStorefrontView();
    }
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Update active nav links
      document.querySelectorAll('.header-nav-menu .nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === `#${sectionId}` || (sectionId === 'storefront-view' && href === '#storefront-view')) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
      // Flash highlight on target section
      const card = target.querySelector('.wholesale-main-card') || 
                   target.querySelector('.tailoring-header') || 
                   target.querySelector('.catalog-toolbar') || 
                   target;
      card.classList.remove('section-target-highlight');
      void card.offsetWidth;
      card.classList.add('section-target-highlight');
      setTimeout(() => card.classList.remove('section-target-highlight'), 2400);
    } else {
      window.location.hash = '#' + sectionId;
    }
  }

  // Open Smart Curtain Calculator directly from Navbar or Tailoring Cards
  openCalculatorFromNav(event, pleatType = null) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (window.naseejApp && window.naseejApp.currentView !== 'storefront') {
      window.naseejApp.openStorefrontView();
    }
    const products = store.getProducts();
    const targetProduct = products.length > 0 ? products[0].id : 'fab-1';
    this.openProductModal(targetProduct);

    if (pleatType === 'wave') {
      this.setFullness(2.5, 'ويفي ملكي انسيابي (Wave S-Fold)');
    } else if (pleatType === 'rings') {
      this.setFullness(2.0, 'حلقات وبكرات كبس (Eyelet)');
    } else if (pleatType === 'american') {
      this.setFullness(2.8, 'كسرات أمريكي / شتوح (American Pleat)');
    }
  }

  // Header Account Dropdown
  toggleAccountDropdown() {
    const dropdown = document.getElementById('header-account-dropdown');
    if (dropdown) {
      dropdown.classList.toggle('active');
    }
  }

  closeAccountDropdown() {
    const dropdown = document.getElementById('header-account-dropdown');
    if (dropdown) {
      dropdown.classList.remove('active');
    }
  }

  updateUserUI() {
    const user = auth.getCurrentUser();
    const userBtn = document.getElementById('header-user-btn');
    const userNameEl = document.getElementById('header-user-name');
    const userRoleBadge = document.getElementById('header-user-role-badge');
    const dropdownBody = document.getElementById('header-dropdown-body');

    // Update active orders badge in header & mobile nav
    const myOrdersCountEl = document.getElementById('header-orders-count');
    const mobileOrdersCountEl = document.getElementById('mobile-orders-count');
    const allOrders = store.getOrders();
    let userOrdersCount = 0;

    if (user && user.phone) {
      userOrdersCount = allOrders.filter(o => o.customerPhone === user.phone && o.orderStatus !== 'cancelled').length;
    } else {
      userOrdersCount = allOrders.filter(o => o.orderStatus !== 'cancelled').length;
    }

    if (myOrdersCountEl) {
      if (userOrdersCount > 0) {
        myOrdersCountEl.textContent = userOrdersCount;
        myOrdersCountEl.style.display = 'inline-flex';
      } else {
        myOrdersCountEl.style.display = 'none';
      }
    }

    if (mobileOrdersCountEl) {
      if (userOrdersCount > 0) {
        mobileOrdersCountEl.textContent = userOrdersCount;
        mobileOrdersCountEl.style.display = 'inline-flex';
      } else {
        mobileOrdersCountEl.style.display = 'none';
      }
    }

    if (!user) {
      if (userBtn) {
        userBtn.classList.remove('is-logged-in', 'is-admin');
      }
      if (userNameEl) userNameEl.textContent = 'تسجيل الدخول';
      if (userRoleBadge) {
        userRoleBadge.textContent = '';
        userRoleBadge.style.display = 'none';
      }
      if (dropdownBody) {
        dropdownBody.innerHTML = `
          <div class="account-menu-header">
            <div class="account-welcome-icon">👋</div>
            <div class="account-welcome-text">
              <strong>أهلاً بك في متجر Balalem co</strong>
              <p>سجّل دخولك لحفظ مقاسات الستائر وسلة مشترياتك وتتبع طلباتك</p>
            </div>
          </div>
          <div class="account-menu-actions">
            <button class="btn btn-gold w-100" onclick="window.naseejCustomer.closeAccountDropdown(); window.naseejCustomer.openAuthModal('login');">
              🔑 تسجيل الدخول
            </button>
            <button class="btn btn-outline w-100" style="margin-top: 8px;" onclick="window.naseejCustomer.closeAccountDropdown(); window.naseejCustomer.openAuthModal('register');">
              ✨ إنشاء حساب عميل جديد
            </button>
          </div>
        `;
      }
    } else if (user.role === 'admin') {
      if (userBtn) {
        userBtn.classList.add('is-logged-in', 'is-admin');
      }
      if (userNameEl) userNameEl.textContent = 'مدير النظام';
      if (userRoleBadge) {
        userRoleBadge.textContent = '🛡️';
        userRoleBadge.style.display = 'inline';
      }
      if (dropdownBody) {
        dropdownBody.innerHTML = `
          <div class="account-menu-header admin-account-header">
            <div class="user-avatar-gold">👑</div>
            <div class="user-info">
              <strong style="color: #fff;">${user.name}</strong>
              <div class="role-pill-gold">🛡️ مدير النظام المعتمد (Admin)</div>
              <span class="user-email-meta">${user.email}</span>
            </div>
          </div>
          <div class="account-menu-actions">
            <button class="btn btn-gold w-100" style="margin-bottom: 8px; font-weight: 700; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.35);" onclick="window.naseejCustomer.closeAccountDropdown(); window.naseejApp.openAdminView();">
              ⚙️ فتح لوحة تحكم المسؤول
            </button>
            <button class="btn btn-outline w-100" style="margin-bottom: 8px;" onclick="window.naseejCustomer.closeAccountDropdown(); window.naseejApp.openStorefrontView();">
              👁️ معاينة المتجر كمدير
            </button>
            <button class="btn btn-danger-soft w-100" onclick="window.naseejCustomer.closeAccountDropdown(); window.naseejApp.logoutUser();">
              🚪 تسجيل الخروج من الإدارة
            </button>
          </div>
        `;
      }
    } else {
      // Customer
      const userPoints = user.points || 0;
      if (userBtn) {
        userBtn.classList.add('is-logged-in');
        userBtn.classList.remove('is-admin');
      }
      if (userNameEl) userNameEl.textContent = user.name.split(' ')[0] || user.name;
      if (userRoleBadge) {
        userRoleBadge.textContent = `🎁 ${userPoints} نقطة`;
        userRoleBadge.className = 'role-badge-customer';
        userRoleBadge.style.display = 'inline-flex';
      }
      if (dropdownBody) {
        dropdownBody.innerHTML = `
          <div class="account-menu-header customer-account-header">
            <div class="user-avatar-teal">👤</div>
            <div class="user-info">
              <strong>${user.name}</strong>
              <div class="role-pill-teal">🛍️ عميل موثوق (${user.city || 'فلسطين'})</div>
              <div style="margin-top: 6px; font-size: 12.5px; background: rgba(212, 175, 55, 0.15); color: #856404; font-weight: 700; border-radius: 6px; padding: 4px 10px; display: inline-flex; align-items: center; gap: 5px;">
                <span>🎁 رصيد نقاط الولاء:</span>
                <strong style="color: #b45309;">${userPoints.toLocaleString()} نقطة</strong>
              </div>
              <span class="user-email-meta" style="margin-top: 4px;">${user.phone}</span>
            </div>
          </div>
          <div class="account-menu-actions">
            <button class="btn btn-primary w-100" style="margin-bottom: 8px;" onclick="window.naseejCustomer.closeAccountDropdown(); window.naseejCustomer.openMyOrdersModal();">
              📦 متابعة طلباتي السابقة
            </button>
            <button class="btn btn-danger-soft w-100" onclick="window.naseejCustomer.closeAccountDropdown(); window.naseejApp.logoutUser();">
              🚪 تسجيل الخروج
            </button>
          </div>
        `;
      }
    }
  }

  // Render dynamic category tabs / filter bubbles from store
  renderCategoryTabs() {
    const container = document.querySelector('.category-tabs-nav');
    if (!container) return;

    const categories = store.getCategories();
    container.innerHTML = categories.map(cat => {
      const isActive = this.currentCategory === cat.id;
      const isTarsoon = cat.id === 'tarsoon';
      const specialStyle = isTarsoon ? 'border-color: var(--gold-primary); color: #92400e; font-weight: 700;' : '';
      const iconSpan = cat.icon ? `<span class="cat-pill-icon" style="margin-left: 5px;">${cat.icon}</span>` : '';
      return `
        <button class="category-tab-btn ${isActive ? 'active' : ''}" data-category="${cat.id}" onclick="window.naseejCustomer.filterCategory('${cat.id}', this)" style="${specialStyle}">
          ${iconSpan}${cat.name}
        </button>
      `;
    }).join('');
  }

  filterCategory(category, targetElement) {
    this.currentCategory = category;
    document.querySelectorAll('.category-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (targetElement) {
      targetElement.classList.add('active');
    }
    this.renderCatalog();
  }

  resetFilters() {
    this.currentCategory = 'all';
    this.searchQuery = '';
    const searchInput = document.getElementById('catalog-search-input');
    if (searchInput) searchInput.value = '';
    this.renderCategoryTabs();
    this.renderCatalog();
  }
}

export const customer = new NaseejCustomer();
window.naseejCustomer = customer;
window.scrollToSection = (id, ev) => customer.scrollToSection(id, ev);
window.openSmartCalculator = (type, ev) => customer.openCalculatorFromNav(ev, type);
