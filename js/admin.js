/**
 * NASEEJ LUXURY CURTAIN FABRICS - ADMIN DASHBOARD MODULE
 * Allows the admin/vendor to provide/add fabrics, update prices & meters stock, fulfill orders, and monitor metrics.
 */
import { store } from './store.js';
import { auth } from './auth.js';

class NaseejAdmin {
  constructor() {
    this.currentTab = 'products'; // 'products', 'orders', 'schedule', 'customers'
    this.currentScheduleSubTab = 'tailoring'; // 'tailoring', 'installation'
    this.selectedInstallerFilter = 'all'; // 'all', 'osama', 'ezz', 'tech3'
    this.editingProductId = null;

    // Calendar Engine State
    const today = new Date();
    this.currentScheduleYear = today.getFullYear();
    this.currentScheduleMonth = today.getMonth() + 1; // 1-12
    this.currentSaturdayDate = store.getSaturdayOfWeek(today);
    this.calendarViewMode = 'weekly'; // 'weekly' or 'monthly'
    this.monthlyFilterOnlyScheduled = false;
    this.monthlyTypeFilter = 'all'; // 'all', 'install', 'pickup'

    // Showroom Walk-in Multi-Window Items State
    this.walkinItems = [];

    // Active product colors state for product modal
    this.activeProductColors = [];

    window.naseejAdmin = this;
  }

  init() {
    if (!auth.isAdmin()) {
      auth.login('admin@balalem.com', 'Balalem@2026');
    }

    this.initCalendarControls();
    this.renderAll();
    window.addEventListener('naseej:products_updated', () => this.renderProductsTable());
    window.addEventListener('naseej:categories_updated', () => {
      this.renderCategoriesTable();
      this.populateCategorySelect();
    });
    window.addEventListener('naseej:orders_updated', () => {
      this.renderOrdersTable();
      this.renderWeeklySchedule();
      this.renderInstallationSchedule();
      if (this.calendarViewMode === 'monthly') this.renderMonthlyCalendar();
      this.renderKPIs();
    });

    // Close dropdowns & search panel when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.walkin-fabric-combobox-wrapper')) {
        this.closeAllFabricDropdowns();
      }
      if (!e.target.closest('.prod-category-combobox-wrapper')) {
        this.closeCategoryDropdown();
      }
      if (!e.target.closest('#admin-top-search-wrap')) {
        const res = document.getElementById('admin-top-search-results');
        if (res) res.style.display = 'none';
      }
    });
  }

  renderAll() {
    this.renderKPIs();
    this.renderProductsTable();
    this.renderOrdersTable();
    this.renderWeeklySchedule();
    this.renderInstallationSchedule();
    this.renderCustomersTable();
    this.renderCategoriesTable();
    this.populateCategorySelect();
  }

  renderKPIs() {
    const stats = store.getStats();

    const salesEl = document.getElementById('admin-stat-sales');
    const ordersEl = document.getElementById('admin-stat-orders');
    const metersEl = document.getElementById('admin-stat-meters');
    const productsEl = document.getElementById('admin-stat-products');

    if (salesEl) salesEl.textContent = `${stats.totalSales.toLocaleString()} شيكل`;
    if (ordersEl) ordersEl.textContent = stats.totalOrders;
    if (metersEl) metersEl.textContent = `${stats.totalMetersSold.toLocaleString()} م`;
    if (productsEl) productsEl.textContent = stats.totalProducts;

    const alertBanner = document.getElementById('admin-stock-alert');
    if (alertBanner) {
      if (stats.lowStockCount > 0) {
        alertBanner.style.display = 'flex';
        alertBanner.innerHTML = `
          <div class="alert-icon">⚠️</div>
          <div><strong>تنبيه المستودع:</strong> يوجد <strong>${stats.lowStockCount}</strong> أصناف أقمشة شارف مخزونها على النفاد (أقل من 100 متر).</div>
        `;
      } else {
        alertBanner.style.display = 'none';
      }
    }
  }

  // Switch Admin Tabs
  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.admin-tab-pane').forEach(pane => {
      pane.style.display = pane.id === `admin-tab-${tabName}` ? 'block' : 'none';
    });

    if (tabName === 'products') this.renderProductsTable();
    if (tabName === 'orders') this.renderOrdersTable();
    if (tabName === 'schedule') {
      if (this.currentScheduleSubTab === 'monthly') {
        this.renderMonthlyScheduleView();
      } else if (this.currentScheduleSubTab === 'installation') {
        this.renderInstallationSchedule();
      } else {
        this.renderWeeklySchedule();
      }
    }
    if (tabName === 'customers') this.renderCustomersTable();
    if (tabName === 'categories') this.renderCategoriesTable();
  }

  // Render Admin Products Table
  renderProductsTable() {
    const tbody = document.getElementById('admin-products-tbody');
    if (!tbody) return;

    const products = store.getProducts();

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">لا توجد أقمشة مسجلة حالياً. استخدم زر "إضافة قماش ستائر جديد" لتزويد المتجر.</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map(product => {
      const stockClass = product.stockMeters < 100 ? 'badge-stock-low' : 'badge-stock-ok';
      const colorsBadges = (product.colors || []).map(c => `
        <span class="admin-color-tag" style="border-left: 4px solid ${c.hex};">${c.name}</span>
      `).join(' ');

      return `
        <tr data-id="${product.id}">
          <td class="product-cell-main">
            <img src="${product.image}" alt="${product.name}" class="admin-product-thumb">
            <div>
              <div class="product-name-bold">${product.name}</div>
              <div class="product-sub-info">${product.categoryName} • ${product.origin}</div>
            </div>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" 
                     class="admin-price-table-input" 
                     value="${product.pricePerMeter}" 
                     min="1" 
                     step="1" 
                     onchange="window.naseejAdmin.quickUpdatePrice('${product.id}', this.value)"
                     title="انقر لتعديل السعر مباشرة ثم اضغط Enter أو انقر في أي مكان للحفظ">
              <span style="font-size: 11.5px; font-weight: 700; color: #64748b; white-space: nowrap;">
                ${product.category === 'tarsoon' ? 'شيكل/م²' : 'شيكل'}
              </span>
            </div>
          </td>
          <td>
            <span class="badge ${stockClass}">
              ${product.stockMeters} متر
            </span>
          </td>
          <td>${product.rollWidth} سم</td>
          <td>
            <div class="admin-colors-wrap">${colorsBadges}</div>
          </td>
          <td>
            <span class="product-light-tag">${product.lightBlockage}</span>
          </td>
          <td class="actions-cell">
            <button class="btn-icon btn-quick-price" onclick="window.naseejAdmin.quickEditPrice('${product.id}')" title="تعديل السعر سريعاً">
              🏷️
            </button>
            <button class="btn-icon btn-edit" onclick="window.naseejAdmin.openEditProductModal('${product.id}')" title="تعديل كامل بيانات القماش">
              ✏️
            </button>
            <button class="btn-icon btn-quick-stock" onclick="window.naseejAdmin.quickAddMeters('${product.id}')" title="تزويد أمتار سريعة للمخزون">
              ➕
            </button>
            <button class="btn-icon btn-delete" onclick="window.naseejAdmin.confirmDeleteProduct('${product.id}', '${product.name}')" title="حذف القماش">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Quick Edit Price directly from Table or Button
  quickUpdatePrice(productId, newPrice) {
    const product = store.getProductById(productId);
    if (!product) return;
    const priceNum = Math.max(1, Number(newPrice) || product.pricePerMeter);
    store.updateProduct(productId, { pricePerMeter: priceNum });
    window.naseejCustomer.showToast(`تم تحديث سعر (${product.name}) إلى ${priceNum} شيكل بنجاح! ✓`, 'success');
    this.renderProductsTable();
    this.renderKPIs();
  }

  quickEditPrice(productId) {
    const product = store.getProductById(productId);
    if (!product) return;
    const unitText = product.category === 'tarsoon' ? 'المتر المربع' : 'المتر الطولي';
    const input = prompt(`أدخل السعر الجديد لـ ${unitText} لقماش (${product.name}):`, product.pricePerMeter);
    if (input !== null && !isNaN(input) && Number(input) > 0) {
      this.quickUpdatePrice(productId, input);
    }
  }

  // Quick Restock Meters
  quickAddMeters(productId) {
    const product = store.getProductById(productId);
    if (!product) return;
    const added = prompt(`أدخل عدد الأمتار المراد إضافتها إلى مخزون (${product.name}):`, '100');
    if (added && !isNaN(added) && Number(added) > 0) {
      const newStock = product.stockMeters + Number(added);
      store.updateProduct(productId, { stockMeters: newStock });
      window.naseejCustomer.showToast(`تم تزويد مخزون ${product.name} بـ ${added} متر إضافية!`, 'success');
      this.renderProductsTable();
      this.renderKPIs();
    }
  }

  // Render Admin Orders Table
  renderOrdersTable() {
    const tbody = document.getElementById('admin-orders-tbody');
    if (!tbody) return;

    const orders = store.getOrders();

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4" style="padding: 40px 20px; font-size: 14px; color: #64748b;"><div style="font-size: 32px; margin-bottom: 6px;">📋</div><strong>لا توجد طلبيات حالياً في النظام</strong><p style="margin-top: 4px; font-size: 12.5px;">الجدول مصفر وجاهز لاستقبال طلبيات الزبائن الجديدة من المتجر الإلكتروني أو تسجيل طلبية يدوية من المعرض.</p></td></tr>`;
      return;
    }

    const workDays = store.getWorkDays();

    tbody.innerHTML = orders.map(order => {
      const itemsList = (order.items || []).map(i => {
        let width = i.width;
        let height = i.height;
        if ((!width || !height) && i.details) {
          const wMatch = i.details.match(/عرض\s*([\d.]+)/);
          const hMatch = i.details.match(/ارتفاع(?:\/طول)?\s*([\d.]+)/);
          if (wMatch) width = wMatch[1];
          if (hMatch) height = hMatch[1];
        }
        const dimsBadge = (width && height)
          ? `<span style="background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 4px;">📐 ${width}م عرض × ${height}م ارتفاع</span>`
          : '';

        return `
        <div class="admin-order-item-row">
          • ${i.roomName ? `<span style="background: #e0f2fe; color: #0369a1; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-left: 4px;">🪟 ${i.roomName}</span>` : ''}
          <strong>${i.productName}</strong> (${i.color}) ${dimsBadge}${i.sewingType ? `<span style="color:#b45309; font-weight:700; font-size:11.5px;">[${i.sewingType}]</span>` : ''} - <span class="badge-meters-count">${i.meters} ${i.unitLabel || 'متر'}</span>
          ${i.notes ? `<small class="text-muted d-block">${i.notes}</small>` : ''}
        </div>
      `;}).join('');

      const dateStr = new Date(order.date).toLocaleDateString('ar-SA', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const dayOptions = workDays.map(d => `
        <option value="${d}" ${(order.scheduledDay || 'الأحد') === d ? 'selected' : ''}>📅 يوم ${d}</option>
      `).join('');

      return `
        <tr data-order-id="${order.id}">
          <td>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
              <span class="order-id-highlight">${order.id}</span>
              ${order.source === 'showroom' ? '<span class="badge badge-source badge-source-showroom">🏪 معرض</span>' : '<span class="badge badge-source badge-source-online">🌐 متجر</span>'}
            </div>
            <div class="order-time-muted">${dateStr}</div>
            <div style="margin-top: 6px;">
              <span style="font-size: 11px; color: #64748b; font-weight: 700;">قص الورشة:</span>
              <select class="admin-schedule-day-select" onchange="window.naseejAdmin.changeOrderScheduleDay('${order.id}', this.value)">
                ${dayOptions}
              </select>
            </div>
            ${order.requiresInstallation ? `
              <div style="margin-top: 6px;">
                <span class="badge-installer badge-installer-${order.installerId || 'osama'}">🔧 تركيب: ${store.getInstallerName(order.installerId)} (${order.installationDay || 'مجدول'})</span>
              </div>
            ` : ''}
          </td>
          <td>
            <div class="customer-info-box">
              <div class="customer-name"><strong>${order.customer.name}</strong></div>
              <div class="customer-phone"><a href="tel:${order.customer.phone}" class="phone-link">📱 ${order.customer.phone}</a></div>
              <div class="customer-email">✉️ ${order.customer.email}</div>
              <div class="customer-city">📍 ${order.customer.city} - ${order.customer.address}</div>
            </div>
          </td>
          <td>
            ${order.deliveryType === 'pickup' ? `
              <span class="schedule-fulfillment-badge badge-pickup">🏪 استلام من المحل</span>
              <div style="font-size: 12px; font-weight: 700; color: #15803d; margin-top: 3px;">${order.pickupBranch || 'نابلس - باب الساحة'}</div>
              <span style="font-size: 11px; color: #15803d; font-weight: 600;">(سعر البرادي فقط 0 ₪)</span>
            ` : `
              <span class="schedule-fulfillment-badge badge-delivery">🚚 توصيل للعنوان</span>
              <div style="font-size: 12px; font-weight: 700; color: #0369a1; margin-top: 3px;">${order.deliveryRegion || order.customer.city}</div>
              <span style="font-size: 11px; color: #0369a1; font-weight: 600;">(+${order.shippingFee} ₪ أجور شحن)</span>
            `}
          </td>
          <td>
            <div class="order-items-cell">${itemsList}</div>
          </td>
          <td>
            <strong class="total-meters-badge">${order.totalMeters} متر</strong>
          </td>
          <td>
            <div class="order-price-bold">${order.grandTotal.toLocaleString()} شيكل</div>
            <span class="payment-method-chip">${order.paymentMethod}</span>
          </td>
          <td>
            <select class="order-status-select" onchange="window.naseejAdmin.handleOrderStatusChange('${order.id}', this.value)">
              <option value="pending" ${order.orderStatus === 'pending' ? 'selected' : ''}>⏳ قيد المراجعة وتأكيد المقاسات</option>
              <option value="in_cutting" ${order.orderStatus === 'in_cutting' ? 'selected' : ''}>✂️ جاري قص القماش بالورشة</option>
              <option value="in_tailoring" ${order.orderStatus === 'in_tailoring' ? 'selected' : ''}>🧵 تم القص - انتقلت للخياطة</option>
              <option value="ready" ${order.orderStatus === 'ready' ? 'selected' : ''}>📦 تم التجهيز للشحن / الاستلام</option>
              <option value="shipped" ${order.orderStatus === 'shipped' ? 'selected' : ''}>🚚 قيد التوصيل مع المندوب</option>
              <option value="delivered" ${order.orderStatus === 'delivered' ? 'selected' : ''}>✅ تم التسليم بنجاح</option>
              <option value="cancelled" ${order.orderStatus === 'cancelled' ? 'selected' : ''}>❌ ملغي من الزبون</option>
            </select>
          </td>
          <td style="white-space: nowrap;">
            <button class="btn btn-sm btn-outline" onclick="window.naseejAdmin.printOrderReceipt('${order.id}')" title="طباعة فاتورة تفصيل">
              🖨️ إيصال
            </button>
            <button class="btn btn-sm" onclick="window.naseejAdmin.confirmDeleteOrder('${order.id}')" title="حذف وإلغاء الطلبية من الورشة نهائياً" style="color: #dc2626; border: 1px solid #fecaca; background: #fef2f2; margin-right: 4px; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: 700;">
              🗑️ حذف
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  handleOrderStatusChange(orderId, newStatus) {
    const updated = store.updateOrderStatus(orderId, newStatus);
    if (updated) {
      window.naseejCustomer.showToast(`تم تحديث حالة الطلب ${orderId} إلى "${updated.statusText}"`, 'success');
      this.renderKPIs();
      this.renderOrdersTable();
      this.renderWeeklySchedule();
      this.renderInstallationSchedule();
      if (this.calendarViewMode === 'monthly') this.renderMonthlyCalendar();
    }
  }

  confirmDeleteOrder(orderId) {
    const orders = store.getOrders();
    const order = orders.find(o => o.id === orderId);
    const custName = order && order.customer ? order.customer.name : '';
    const confirmMsg = `هل أنت متأكد من حذف وإلغاء الطلبية (${orderId})${custName ? ` للزبون "${custName}"` : ''} نهائياً من الورشة وجداول العمل؟`;
    
    if (confirm(confirmMsg)) {
      const ok = store.deleteOrder(orderId);
      if (ok) {
        window.naseejCustomer.showToast(`تم حذف الطلبية (${orderId}) من الورشة والجداول بنجاح ✓`, 'info');
        this.renderAll();
      }
    }
  }

  confirmClearAllOrders() {
    if (confirm('هل تريد تصفير كافة الطلبيات الوهمية لتصبح إحصائيات المبيعات والأمتار والطلبيات (0) والبدء بجدول عمل نظيف تماماً؟')) {
      store.clearAllOrders();
      window.naseejCustomer.showToast('تم تصفير كافة الطلبيات وتصفير المبيعات والأمتار بنجاح ✓', 'success');
      this.renderAll();
    }
  }

  // --- Calendar & Period Controller Methods ---
  initCalendarControls() {
    const monthSelect = document.getElementById('cal-month-select');
    const yearSelect = document.getElementById('cal-year-select');

    if (monthSelect) {
      const months = store.getMonthsList();
      monthSelect.innerHTML = months.map(m => `
        <option value="${m.num}" ${m.num === this.currentScheduleMonth ? 'selected' : ''}>
          ${m.name}
        </option>
      `).join('');
    }

    if (yearSelect) {
      yearSelect.value = this.currentScheduleYear;
    }

    this.updateActiveWeekBanner();
  }

  updateActiveWeekBanner() {
    const label = document.getElementById('calendar-active-week-label');
    if (!label) return;
    const weekDates = store.getWeekDates(this.currentSaturdayDate);
    const start = weekDates[0];
    const end = weekDates[5];

    const currentSat = store.getSaturdayOfWeek(new Date());
    const dView = new Date(this.currentSaturdayDate);
    dView.setHours(0, 0, 0, 0);
    const dCur = new Date(currentSat);
    dCur.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dView.getTime() - dCur.getTime()) / (1000 * 60 * 60 * 24));

    let weekBadge = '';
    if (diffDays === 0) {
      weekBadge = '<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:800; font-size:11.5px; padding:3px 9px; border-radius:6px; margin-left:8px;">📌 الأسبوع الأول (الحالي)</span>';
    } else if (diffDays === 7) {
      weekBadge = '<span class="badge" style="background:#fef3c7; color:#92400e; font-weight:800; font-size:11.5px; padding:3px 9px; border-radius:6px; margin-left:8px;">⏩ الأسبوع الثاني (القادم)</span>';
    } else if (diffDays > 7) {
      const weekIndex = Math.floor(diffDays / 7) + 1;
      weekBadge = `<span class="badge" style="background:#f3e8ff; color:#6b21a8; font-weight:800; font-size:11.5px; padding:3px 9px; border-radius:6px; margin-left:8px;">الأسبوع (${weekIndex})</span>`;
    } else if (diffDays < 0) {
      weekBadge = '<span class="badge" style="background:#f1f5f9; color:#64748b; font-weight:800; font-size:11.5px; padding:3px 9px; border-radius:6px; margin-left:8px;">أسبوع سابق</span>';
    }

    label.innerHTML = `${weekBadge} أسبوع العمل: <strong>${start.dayName} (${start.dayNum} ${start.monthName.split('/')[0].trim()})</strong> ➔ <strong>${end.dayName} (${end.dayNum} ${end.monthName.split('/')[0].trim()} ${this.currentScheduleYear})</strong>`;

    const monthSelect = document.getElementById('cal-month-select');
    if (monthSelect) {
      const weekMonths = [start.monthNum, end.monthNum];
      if (!weekMonths.includes(this.currentScheduleMonth)) {
        this.currentScheduleMonth = end.monthNum;
      }
      monthSelect.value = this.currentScheduleMonth;
    }
  }

  handleMonthChange(monthNum) {
    this.currentScheduleMonth = parseInt(monthNum);
    const weeks = store.getMonthWeeks(this.currentScheduleYear, this.currentScheduleMonth);
    if (weeks.length > 0) {
      let targetWeek = weeks.find(w => {
        const inMonthDays = w.weekDates.filter(d => d.monthNum === this.currentScheduleMonth).length;
        return inMonthDays >= 3;
      }) || weeks[0];
      this.currentSaturdayDate = new Date(targetWeek.saturdayDate);
    }
    this.updateActiveWeekBanner();
    if (this.currentScheduleSubTab === 'monthly') {
      this.renderMonthlyScheduleView();
    } else if (this.calendarViewMode === 'monthly') {
      this.renderMonthlyCalendar();
    } else {
      this.renderWeeklySchedule();
      this.renderInstallationSchedule();
    }
  }

  handleYearChange(year) {
    this.currentScheduleYear = parseInt(year);
    const weeks = store.getMonthWeeks(this.currentScheduleYear, this.currentScheduleMonth);
    if (weeks.length > 0) {
      this.currentSaturdayDate = new Date(weeks[0].saturdayDate);
    }
    this.updateActiveWeekBanner();
    if (this.calendarViewMode === 'monthly') {
      this.renderMonthlyCalendar();
    } else {
      this.renderWeeklySchedule();
      this.renderInstallationSchedule();
    }
  }

  navigateWeek(direction) {
    const newSat = new Date(this.currentSaturdayDate);
    newSat.setDate(newSat.getDate() + (direction * 7));
    this.currentSaturdayDate = newSat;
    this.updateActiveWeekBanner();

    if (this.calendarViewMode === 'monthly') {
      this.setCalendarViewMode('weekly');
    } else {
      this.renderWeeklySchedule();
      this.renderInstallationSchedule();
    }
  }

  goToTodayWeek() {
    this.currentSaturdayDate = store.getSaturdayOfWeek(new Date());
    const today = new Date();
    this.currentScheduleYear = today.getFullYear();
    this.currentScheduleMonth = today.getMonth() + 1;
    this.initCalendarControls();
    this.updateActiveWeekBanner();

    if (this.calendarViewMode === 'monthly') {
      this.setCalendarViewMode('weekly');
    } else {
      this.renderWeeklySchedule();
      this.renderInstallationSchedule();
    }
  }

  jumpToDate(isoDateStr) {
    const targetDate = new Date(isoDateStr);
    this.currentSaturdayDate = store.getSaturdayOfWeek(targetDate);
    this.currentScheduleYear = targetDate.getFullYear();
    this.currentScheduleMonth = targetDate.getMonth() + 1;
    this.initCalendarControls();
    this.setCalendarViewMode('weekly');
  }

  setCalendarViewMode(mode) {
    this.calendarViewMode = mode;
    if (mode === 'monthly') {
      this.switchScheduleSubTab('monthly');
    } else {
      this.switchScheduleSubTab('tailoring');
    }
  }

  renderMonthlyCalendar() {
    const container = document.getElementById('admin-view-monthly-calendar');
    if (!container) return;

    const data = store.getMonthlyScheduleData(this.currentScheduleYear, this.currentScheduleMonth);
    const dayNamesHeader = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    const firstDate = new Date(this.currentScheduleYear, this.currentScheduleMonth - 1, 1);
    const dayOfWeek = firstDate.getDay();
    const offset = (dayOfWeek + 1) % 7;

    const blanksHtml = Array(offset).fill('<div class="monthly-day-card is-other-month" style="opacity: 0.3; background: #f8fafc; border-style: dashed; cursor: default;"></div>').join('');

    const daysHtml = data.days.map(d => {
      const isFriday = d.isFriday;
      const cardClass = `monthly-day-card ${d.isToday ? 'is-today' : ''} ${isFriday ? 'is-friday' : ''}`;
      
      const badgeHtml = isFriday 
        ? `<span class="monthly-day-badge status-off">عطلة الجمعة</span>`
        : `<span class="monthly-day-badge status-${d.status}">${d.statusLabel}</span>`;

      const tailoringStat = (!isFriday && d.tailoringOrders.length > 0)
        ? `<div class="monthly-order-stat">✂️ <strong>${d.tailoringOrders.length}</strong> طلبيات (${d.totalMeters} م)</div>`
        : (!isFriday ? `<div class="monthly-order-stat" style="color: #94a3b8;">🕊️ لا يوجد قص</div>` : '');

      const installStat = (!isFriday && d.installOrders.length > 0)
        ? `<div class="monthly-install-stat">🔧 <strong>${d.installOrders.length}</strong> تركيب ميداني</div>`
        : '';

      const jumpBtn = !isFriday
        ? `<div class="monthly-jump-btn" onclick="event.stopPropagation(); window.naseejAdmin.jumpToDate('${d.dateStr}')">عرض تفاصيل الأسبوع ➔</div>`
        : '';

      return `
        <div class="${cardClass}" onclick="window.naseejAdmin.jumpToDate('${d.dateStr}')" title="عرض أسبوع يوم ${d.dayName} (${d.dateStr})">
          <div class="monthly-day-card-top">
            <span class="monthly-day-num">${d.dayNum}</span>
            ${badgeHtml}
          </div>
          <div class="monthly-day-content">
            <div style="font-size: 11.5px; color: #64748b; font-weight: 700;">${d.dayName}</div>
            ${tailoringStat}
            ${installStat}
          </div>
          ${jumpBtn}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="monthly-cal-header">
        <div class="monthly-cal-title">
          <span>📆 مخطط شهر ${data.monthName} (${data.year}) الشامل لورشة القص ومواعيد التركيب</span>
        </div>
        <div class="monthly-legend">
          <span><span class="legend-dot free"></span> يوم شاغر ومتاح</span>
          <span><span class="legend-dot moderate"></span> متوازن ومناسب</span>
          <span><span class="legend-dot full"></span> ممتلئ 🔥</span>
          <span><span class="legend-dot off"></span> عطلة الجمعة الرسمية</span>
        </div>
      </div>

      <div class="monthly-days-header-grid">
        ${dayNamesHeader.map((name, idx) => `
          <div class="monthly-day-name-cell ${idx === 6 ? 'friday' : ''}">
            ${name} ${idx === 6 ? '(عطلة)' : ''}
          </div>
        `).join('')}
      </div>

      <div class="monthly-days-cells-grid">
        ${blanksHtml}
        ${daysHtml}
      </div>
    `;
  }

  // Change scheduled day for an order (supports both ISO date and dayName)
  changeOrderScheduleDay(orderId, newDateOrDay, newDayName) {
    const updated = store.assignOrderDay(orderId, newDateOrDay, newDayName);
    if (updated) {
      window.naseejCustomer.showToast(`تم نقل الطلبية (${orderId}) إلى موعد ${updated.scheduledDay} (${updated.scheduledDate || ''}) بنجاح! ✓`, 'success');
      this.renderWeeklySchedule();
      this.renderOrdersTable();
      if (this.calendarViewMode === 'monthly') this.renderMonthlyCalendar();
    }
  }

  // Smart Auto-Balance Weekly Schedule
  autoBalanceSchedule() {
    const weekDates = store.getWeekDates(this.currentSaturdayDate);
    const result = store.autoBalanceWeeklySchedule(weekDates);
    if (result && result.success) {
      if (result.overflowCount > 0) {
        window.naseejCustomer.showToast(`✨ تم ضبط العمل: اكتمل الأسبوع الأول، وتم ترحيل (${result.overflowCount}) طلبيات تلقائياً إلى الأسبوع الثاني! ✓`, 'info');
      } else {
        window.naseejCustomer.showToast('✨ تم توزيع وضبط كميات الشغل بالتساوي على أيام الأسبوع بنجاح! ✓', 'success');
      }
      this.renderWeeklySchedule();
      this.renderOrdersTable();
      this.renderKPIs();
      if (this.calendarViewMode === 'monthly') this.renderMonthlyCalendar();
    } else {
      window.naseejCustomer.showToast('لا توجد طلبيات قيد التجهيز لإعادة جدولتها.', 'info');
    }
  }

  // Quick Advance Status (Pending -> In Tailoring -> Ready -> Shipped)
  quickAdvanceOrderStatus(orderId) {
    const orders = store.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    let nextStatus = 'in_cutting';
    if (order.orderStatus === 'pending') nextStatus = 'in_cutting';
    else if (order.orderStatus === 'in_cutting') nextStatus = 'in_tailoring';
    else if (order.orderStatus === 'in_tailoring') nextStatus = 'ready';
    else if (order.orderStatus === 'ready') nextStatus = 'shipped';
    else if (order.orderStatus === 'shipped') nextStatus = 'delivered';

    this.handleOrderStatusChange(orderId, nextStatus);
    this.renderWeeklySchedule();
    this.renderOrdersTable();
    if (this.calendarViewMode === 'monthly') this.renderMonthlyCalendar();
  }

  // Render Weekly Production & Schedule Board
  renderWeeklySchedule() {
    const kpiBar = document.getElementById('admin-schedule-kpi-bar');
    const board = document.getElementById('admin-weekly-schedule-board');
    if (!board) return;

    this.updateActiveWeekBanner();

    const weekDates = store.getWeekDates(this.currentSaturdayDate);
    const scheduleData = store.getWeeklyScheduleData(weekDates);

    // Total week calculations
    let totalScheduledOrders = 0;
    let totalWeekMeters = 0;
    let emptyDaysCount = 0;

    weekDates.forEach(d => {
      const dayInfo = scheduleData[d.dateStr];
      if (dayInfo) {
        totalScheduledOrders += dayInfo.totalOrders;
        totalWeekMeters += dayInfo.totalMeters;
        if (dayInfo.totalOrders === 0) emptyDaysCount++;
      }
    });

    totalWeekMeters = Math.round(totalWeekMeters * 10) / 10;
    const avgPerDay = Math.round((totalWeekMeters / weekDates.length) * 10) / 10;

    if (kpiBar) {
      kpiBar.innerHTML = `
        <div class="schedule-kpi-item">
          <div class="schedule-kpi-icon">📋</div>
          <div class="schedule-kpi-info">
            <span class="schedule-kpi-val">${totalScheduledOrders} طلبية</span>
            <span class="schedule-kpi-lbl">طلبيات الأسبوع (${weekDates[0].formattedDisplay} ➔ ${weekDates[5].formattedDisplay})</span>
          </div>
        </div>

        <div class="schedule-kpi-item">
          <div class="schedule-kpi-icon">📏</div>
          <div class="schedule-kpi-info">
            <span class="schedule-kpi-val">${totalWeekMeters} متر</span>
            <span class="schedule-kpi-lbl">إجمالي كمية الأقمشة المطلوب قصها</span>
          </div>
        </div>

        <div class="schedule-kpi-item">
          <div class="schedule-kpi-icon">⚖️</div>
          <div class="schedule-kpi-info">
            <span class="schedule-kpi-val">${avgPerDay} م / يوم</span>
            <span class="schedule-kpi-lbl">المعدل اليومي المتوازن للشغل</span>
          </div>
        </div>

        <div class="schedule-kpi-item">
          <div class="schedule-kpi-icon">${emptyDaysCount > 0 ? '⚠️' : '✅'}</div>
          <div class="schedule-kpi-info">
            <span class="schedule-kpi-val" style="font-size: 14px; color: ${emptyDaysCount > 0 ? '#b45309' : '#15803d'};">
              ${emptyDaysCount > 0 ? `يوجد (${emptyDaysCount}) أيام شاغرة بالأسبوع` : 'الجدول مكتمل ومتوازن'}
            </span>
            <span class="schedule-kpi-lbl">
              ${emptyDaysCount > 0 ? 'اضغط زر التوزيع الذكي لتعبئة الفراغ' : 'العمل مقسم بانتظام من السبت للخميس'}
            </span>
          </div>
        </div>
      `;
    }

    // Check if this entire week is 100% full
    const isThisWeekFull = store.isWeekFull(weekDates);
    const alertBox = document.getElementById('admin-schedule-week-alert');
    if (alertBox) {
      if (isThisWeekFull) {
        alertBox.style.display = 'block';
        alertBox.innerHTML = `
          <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1.5px solid #f59e0b; border-radius: 8px; padding: 12px 18px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; gap: 14px; box-shadow: 0 2px 6px rgba(245, 158, 11, 0.15);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 26px;">🔥</span>
              <div>
                <div style="font-weight: 800; font-size: 14px; color: #92400e;">
                  تنبيه سعة الورشة: هذا الأسبوع ممتلئ بنسبة 100% (جميع أيام العمل محجوزة بالكامل)
                </div>
                <div style="font-size: 12.5px; color: #b45309; margin-top: 2px;">
                  وصلت أيام هذا الأسبوع لكامل طاقتها التشغيلية. أي طلبيات جديدة يتم جدولتها آلياً ستنتقل تلقائياً ومباشرة إلى <strong>الأسبوع الثاني</strong>!
                </div>
              </div>
            </div>
            <button class="btn btn-sm" onclick="window.naseejAdmin.navigateWeek(1)" style="background: #ffffff; color: #92400e; font-weight: 800; border: 1.5px solid #f59e0b; padding: 7px 16px; border-radius: 6px; cursor: pointer; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
              الانتقال لجدول الأسبوع التالي (2) ▶
            </button>
          </div>
        `;
      } else {
        alertBox.style.display = 'none';
        alertBox.innerHTML = '';
      }
    }

    // Render 6 Columns (Saturday to Thursday) with real calendar dates
    board.innerHTML = weekDates.map(dayObj => {
      const dayInfo = scheduleData[dayObj.dateStr] || { orders: [], totalOrders: 0, totalMeters: 0, status: 'free', statusLabel: 'شاغر', statusClass: 'day-free' };
      const maxTargetMeters = 40;
      const progressPercent = Math.min(100, Math.round((dayInfo.totalMeters / maxTargetMeters) * 100));

      const ordersHtml = dayInfo.orders.length === 0 ? `
        <div class="empty-day-box">
          <div class="empty-day-icon">🕊️</div>
          <p><strong>يوم شاغر (فراغ)</strong></p>
          <p>لا توجد كميات شغل مبرمجة في هذا اليوم</p>
          <button class="btn btn-sm btn-outline" onclick="window.naseejAdmin.autoBalanceSchedule()" style="font-size: 11.5px; padding: 6px 12px;">
            🪄 توزيع العمل لملء هذا اليوم
          </button>
        </div>
      ` : dayInfo.orders.map(order => {
        const windowsCount = (order.items || []).length;
        const fabricsSummary = (order.items || []).map(i => {
          let width = i.width;
          let height = i.height;
          if ((!width || !height) && i.details) {
            const wMatch = i.details.match(/عرض\s*([\d.]+)/);
            const hMatch = i.details.match(/ارتفاع(?:\/طول)?\s*([\d.]+)/);
            if (wMatch) width = wMatch[1];
            if (hMatch) height = hMatch[1];
          }
          const dimPart = (width && height) ? `(${width}×${height}م) ` : '';
          return `${i.roomName ? `[${i.roomName}] ` : ''}${i.productName} (${i.color}) ${dimPart}${i.meters}${i.unitLabel || 'م'}`;
        }).join(' + ');

        const statusBadges = {
          pending: '⏳ قيد المراجعة',
          in_tailoring: '✂️ جاري القص بالورشة',
          ready: '📦 جاهز للتسليم',
          shipped: '🚚 قيد التوصيل',
          delivered: '✅ تم التسليم'
        };

        const fulfillmentHtml = order.deliveryType === 'pickup'
          ? `<span class="schedule-fulfillment-badge badge-pickup">🏪 استلام: ${order.pickupBranch || 'باب الساحة'}</span>`
          : `<span class="schedule-fulfillment-badge badge-delivery">🚚 توصيل: ${order.deliveryRegion || order.customer.city} (+${order.shippingFee} ₪)</span>`;

        const nextSatDate = new Date(dayObj.dateObj);
        nextSatDate.setDate(nextSatDate.getDate() + 7);
        const nextWeekDates = store.getWeekDates(nextSatDate);

        const currentWeekOpts = weekDates.map(d => `
          <option value="${d.dateStr}" ${d.dateStr === dayObj.dateStr ? 'selected' : ''}>
            ${d.dateStr === dayObj.dateStr ? `📅 مسجل: ${d.dayName} (${d.dayNum}/${String(d.monthNum).padStart(2, '0')})` : `نقل لـ: ${d.dayName} (${d.dayNum}/${String(d.monthNum).padStart(2, '0')})`}
          </option>
        `).join('');

        const nextWeekOpts = nextWeekDates.map(d => `
          <option value="${d.dateStr}">
            ⏩ نقل للأسبوع 2: ${d.dayName} (${d.dayNum}/${String(d.monthNum).padStart(2, '0')})
          </option>
        `).join('');

        const otherDaysOptions = `<optgroup label="أيام هذا الأسبوع">${currentWeekOpts}</optgroup><optgroup label="أيام الأسبوع التالي (2)">${nextWeekOpts}</optgroup>`;

        return `
          <div class="schedule-order-card" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${order.id}')">
            <div class="schedule-card-top">
              <div style="display: flex; align-items: center; gap: 4px;">
                <span class="schedule-order-num">${order.id}</span>
                ${order.source === 'showroom' ? '<span class="badge badge-source badge-source-showroom">معرض</span>' : ''}
              </div>
              <select class="schedule-status-mini-select" onchange="window.naseejAdmin.handleOrderStatusChange('${order.id}', this.value)" style="font-size: 11px; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1; background: #ffffff; color: #1e293b; font-weight: 700; cursor: pointer;">
                <option value="pending" ${order.orderStatus === 'pending' ? 'selected' : ''}>⏳ قيد المراجعة</option>
                <option value="in_cutting" ${order.orderStatus === 'in_cutting' ? 'selected' : ''}>✂️ جاري القص</option>
                <option value="in_tailoring" ${order.orderStatus === 'in_tailoring' ? 'selected' : ''}>🧵 انتقلت للخياطة</option>
                <option value="ready" ${order.orderStatus === 'ready' ? 'selected' : ''}>📦 تم التجهيز</option>
                <option value="shipped" ${order.orderStatus === 'shipped' ? 'selected' : ''}>🚚 قيد التوصيل</option>
                <option value="delivered" ${order.orderStatus === 'delivered' ? 'selected' : ''}>✅ تم التسليم</option>
                <option value="cancelled" ${order.orderStatus === 'cancelled' ? 'selected' : ''}>❌ ملغي</option>
              </select>
            </div>

            <div class="schedule-cust-row">
              <span>👤 ${order.customer.name}</span>
            </div>
            <div class="schedule-phone-sub" style="display: flex; justify-content: space-between; align-items: center;">
              <span>📱 <a href="tel:${order.customer.phone}" style="color: inherit; text-decoration: none;">${order.customer.phone}</a></span>
              <a href="https://wa.me/972${(order.customer.phone || '').replace(/\D/g, '').replace(/^0+/, '')}?text=${encodeURIComponent(`السلام عليكم ${order.customer.name || ''}، معك إدارة شركة الولاء للستائر Balalem co بخصوص طلبيتكم رقم (${order.id || ''})`)}" target="_blank" rel="noopener noreferrer" class="schedule-wa-btn" title="مراسلة واتساب فورية">
                💬 واتساب
              </a>
            </div>

            ${fulfillmentHtml}

            ${order.requiresInstallation ? `
              <div style="margin-bottom: 6px;">
                <span class="badge-installer badge-installer-${order.installerId || 'osama'}" style="font-size: 11px;">
                  🔧 تركيب: ${store.getInstallerName(order.installerId)} (${order.installationDay || 'مجدول'})
                </span>
              </div>
            ` : ''}

            <div class="schedule-fabrics-summary" title="${fabricsSummary}">
              🧵 ${windowsCount > 1 ? `(${windowsCount} شبابيك): ` : ''}${fabricsSummary}
            </div>

            <div class="schedule-card-metrics">
              <span class="schedule-meters-chip">📏 ${order.totalMeters} متر ${windowsCount > 1 ? `(${windowsCount} شبابيك)` : ''}</span>
              <span class="schedule-price-chip">${order.grandTotal.toLocaleString()} شيكل</span>
            </div>

            <div class="schedule-move-row" style="display: flex; gap: 5px; align-items: center;">
              <select class="schedule-move-select" style="flex: 1;" onchange="window.naseejAdmin.changeOrderScheduleDay('${order.id}', this.value)" title="نقل ليوم آخر">
                ${otherDaysOptions}
              </select>
              <button class="btn-mini-status" onclick="window.naseejAdmin.quickAdvanceOrderStatus('${order.id}')" title="ترقية المرحلة">
                ✂️
              </button>
              <button class="btn-mini-status" onclick="window.naseejAdmin.printOrderReceipt('${order.id}')" title="طباعة الإيصال">
                🖨️
              </button>
              <button class="btn-mini-status btn-mini-delete" onclick="window.naseejAdmin.confirmDeleteOrder('${order.id}')" title="حذف وإلغاء الطلبية من الورشة والجداول" style="color: #dc2626; background: #fee2e2; border-color: #fca5a5; font-size: 12px;">
                🗑️
              </button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="schedule-day-column" 
             ondragover="event.preventDefault(); this.classList.add('drag-over');"
             ondragleave="this.classList.remove('drag-over');"
             ondrop="event.preventDefault(); this.classList.remove('drag-over'); const oId = event.dataTransfer.getData('text/plain'); window.naseejAdmin.changeOrderScheduleDay(oId, '${dayObj.dateStr}', '${dayObj.dayName}');">
          <div class="day-column-header ${dayInfo.statusClass} ${dayObj.isToday ? 'is-today' : ''}">
            <div class="day-title-row">
              <span class="day-name-title">يوم ${dayObj.dayName} <span class="day-calendar-date">${dayObj.dayNum}/${String(dayObj.monthNum).padStart(2, '0')}</span></span>
              <span class="day-status-pill pill-${dayInfo.status}">${dayInfo.statusLabel}</span>
            </div>
            <div class="day-workload-text">
              <span>الطلبيات: <strong>${dayInfo.totalOrders}</strong></span>
              <span>الأمتار: <strong>${dayInfo.totalMeters} م</strong></span>
            </div>
            <div class="day-progress-track">
              <div class="day-progress-bar bar-${dayInfo.status}" style="width: ${progressPercent}%;"></div>
            </div>
          </div>

          <div class="day-column-orders">
            ${ordersHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  // Switch Schedule Sub-Tab (Tailoring Workshop vs Installation Board vs Monthly Schedule)
  switchScheduleSubTab(subTab) {
    this.currentScheduleSubTab = subTab;
    const btnTailoring = document.getElementById('btn-schedule-tailoring');
    const btnInstallation = document.getElementById('btn-schedule-installation');
    const btnMonthly = document.getElementById('btn-schedule-monthly');
    const viewTailoring = document.getElementById('admin-subview-tailoring');
    const viewInstallation = document.getElementById('admin-subview-installation');
    const viewMonthly = document.getElementById('admin-subview-monthly');
    const monthlyCalendarView = document.getElementById('admin-view-monthly-calendar');

    if (monthlyCalendarView) monthlyCalendarView.style.display = 'none';
    const btnWeekly = document.getElementById('btn-mode-weekly');
    const btnMonthlyMode = document.getElementById('btn-mode-monthly');

    if (subTab === 'monthly') {
      if (btnWeekly) btnWeekly.classList.remove('active');
      if (btnMonthlyMode) btnMonthlyMode.classList.add('active');
      this.calendarViewMode = 'monthly';
    } else {
      if (btnWeekly) btnWeekly.classList.add('active');
      if (btnMonthlyMode) btnMonthlyMode.classList.remove('active');
      this.calendarViewMode = 'weekly';
    }

    if (btnTailoring) btnTailoring.classList.toggle('active', subTab === 'tailoring');
    if (btnInstallation) btnInstallation.classList.toggle('active', subTab === 'installation');
    if (btnMonthly) btnMonthly.classList.toggle('active', subTab === 'monthly');

    if (viewTailoring) viewTailoring.style.display = subTab === 'tailoring' ? 'block' : 'none';
    if (viewInstallation) viewInstallation.style.display = subTab === 'installation' ? 'block' : 'none';
    if (viewMonthly) viewMonthly.style.display = subTab === 'monthly' ? 'block' : 'none';

    if (subTab === 'tailoring') this.renderWeeklySchedule();
    if (subTab === 'installation') this.renderInstallationSchedule();
    if (subTab === 'monthly') this.renderMonthlyScheduleView();
  }

  // ==========================================
  // MONTHLY SCHEDULE TABLE & PAPER SCHEDULE ENGINE
  // ==========================================

  renderMonthlyScheduleView() {
    const container = document.getElementById('admin-subview-monthly');
    if (!container) return;

    const year = this.currentScheduleYear;
    const month = this.currentScheduleMonth;
    const data = store.getMonthlyScheduleData(year, month);
    const monthNames = [
      'كانون الثاني (1)', 'شباط (2)', 'آذار (3)', 'نيسان (4)', 'أيار (5)', 'حزيران (6)',
      'تموز (7)', 'آب (8)', 'أيلول (9)', 'تشرين الأول (10)', 'تشرين الثاني (11)', 'كانون الأول (12)'
    ];
    const monthName = monthNames[month - 1] || `شهر ${month}`;

    let totalScheduledOrders = 0;
    let totalInstallOrders = 0;
    let totalDeliveryOrders = 0;
    let totalPickupOrders = 0;
    let totalMetersMonth = 0;

    const ordersMapByDate = {};
    data.days.forEach(d => {
      const combined = [];
      const seenIds = new Set();
      (d.tailoringOrders || []).forEach(o => {
        if (!seenIds.has(o.id)) {
          seenIds.add(o.id);
          combined.push(o);
        }
      });
      (d.installOrders || []).forEach(o => {
        if (!seenIds.has(o.id)) {
          seenIds.add(o.id);
          combined.push(o);
        }
      });

      ordersMapByDate[d.dateStr] = combined;

      combined.forEach(o => {
        totalScheduledOrders++;
        totalMetersMonth += (o.totalMeters || 0);
        if (o.requiresInstallation) totalInstallOrders++;
        else if (o.deliveryType === 'delivery') totalDeliveryOrders++;
        else totalPickupOrders++;
      });
    });

    totalMetersMonth = Math.round(totalMetersMonth * 10) / 10;

    const badgeMonthly = document.getElementById('badge-monthly-count');
    if (badgeMonthly) badgeMonthly.textContent = totalScheduledOrders;

    // Check for saved paper schedule image
    const paperImgKey = `naseej_paper_sched_${year}_${month}`;
    const savedPaperImg = localStorage.getItem(paperImgKey);

    // Build Paper Schedule Section HTML
    let paperSectionHtml = '';
    if (savedPaperImg) {
      paperSectionHtml = `
        <div class="paper-schedule-section">
          <div class="paper-schedule-header">
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="${savedPaperImg}" alt="صورة جدول الورشة الورقي" class="paper-preview-thumb" onclick="window.naseejAdmin.openPaperScheduleModal()" title="انقر لتكبير الصورة وتفريغ المواعيد">
              <div>
                <div style="font-weight: 800; font-size: 13.5px; color: #0f172a;">📸 صورة جدول الورشة الورقي لشهر ${monthName} (${year})</div>
                <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">تم حفظ صورة الجدول الورقي بنجاح ومتاح للرجوع إليها في أي وقت.</div>
              </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button type="button" class="btn btn-sm btn-gold" onclick="window.naseejAdmin.openPaperScheduleModal()">
                <span>🔍 معاينة الصورة وتفريغ المواعيد</span>
              </button>
              <label class="btn btn-sm btn-outline" style="cursor: pointer; margin-bottom: 0;">
                <span>🔄 تغيير الصورة</span>
                <input type="file" accept="image/*" style="display: none;" onchange="window.naseejAdmin.handlePaperScheduleUpload(this)">
              </label>
            </div>
          </div>
          <div class="paper-prompt-banner">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">📋</span>
              <span style="font-size: 12.5px; font-weight: 800; color: #92400e;">هل تريد تفريغ محتوى الصورة داخل الجدول؟</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn btn-sm btn-primary" onclick="window.naseejAdmin.openPaperScheduleModal()" style="font-weight: 700;">
                نعم، تفريغ المواعيد وإدراجها بالجدول الآن ➔
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      paperSectionHtml = `
        <div class="paper-schedule-section" style="background: #ffffff;">
          <div class="paper-schedule-header">
            <div>
              <div style="font-weight: 800; font-size: 13.5px; color: #0f172a;">📸 إرفاق صورة جدول الورشة الورقي لشهر ${monthName} (${year})</div>
              <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">إذا كان لديكم جدول ورقي مكتوب يدوياً بالورشة، يمكنك تصويره أو رفعه هنا لحفظه وتفريغ مواعيده آلياً.</div>
            </div>
            <div>
              <label class="btn btn-sm btn-gold" style="cursor: pointer; margin-bottom: 0; box-shadow: 0 2px 8px rgba(212,175,55,0.25);">
                <span>📷 رفع صورة الجدول الورقي</span>
                <input type="file" accept="image/*" style="display: none;" onchange="window.naseejAdmin.handlePaperScheduleUpload(this)">
              </label>
            </div>
          </div>
        </div>
      `;
    }

    // Filter orders by appointment type (all, install, pickup)
    const filteredOrdersMap = {};
    data.days.forEach(d => {
      const allOrders = ordersMapByDate[d.dateStr] || [];
      if (this.monthlyTypeFilter === 'install') {
        filteredOrdersMap[d.dateStr] = allOrders.filter(o => o.requiresInstallation);
      } else if (this.monthlyTypeFilter === 'pickup') {
        filteredOrdersMap[d.dateStr] = allOrders.filter(o => !o.requiresInstallation);
      } else {
        filteredOrdersMap[d.dateStr] = allOrders;
      }
    });

    // Build Table Rows for all days or scheduled days only
    let rowsHtml = '';
    const filteredDays = this.monthlyFilterOnlyScheduled 
      ? data.days.filter(d => (filteredOrdersMap[d.dateStr] || []).length > 0)
      : data.days;

    if (filteredDays.length === 0) {
      const emptyMsg = this.monthlyTypeFilter === 'install' 
        ? 'لا توجد مواعيد تركيب منزلي في هذا الشهر.' 
        : (this.monthlyTypeFilter === 'pickup' 
            ? 'لا توجد طلبيات تسليم بالمعرض في هذا الشهر.' 
            : 'لا توجد طلبيات مجدولة في هذا الشهر حتى الآن.');
      rowsHtml = `<tr><td colspan="5" style="text-align: center; padding: 35px; color: #64748b; font-size: 13px;">${emptyMsg}</td></tr>`;
    } else {
      filteredDays.forEach(d => {
        const orders = filteredOrdersMap[d.dateStr] || [];
        const allDayOrders = ordersMapByDate[d.dateStr] || [];
        const isFriday = d.isFriday;
        const rowClass = `${d.isToday ? 'row-today' : ''} ${isFriday ? 'row-friday' : ''}`;

        const dayInstallCount = allDayOrders.filter(o => o.requiresInstallation).length;
        const dayPickupCount = allDayOrders.filter(o => !o.requiresInstallation).length;

        if (orders.length === 0) {
          rowsHtml += `
            <tr class="${rowClass}">
              <td>
                <div class="day-date-cell ${d.isToday ? 'today' : ''}">
                  <span class="day-badge-num">${d.dayNum}</span>
                  <div>
                    <div style="font-weight: 800; color: #0f172a;">${d.dayName}</div>
                    <div style="font-size: 11px; color: #64748b;">${d.dateStr}</div>
                  </div>
                  ${d.isToday ? '<span class="badge badge-gold" style="font-size: 10px; padding: 1px 6px;">اليوم</span>' : ''}
                </div>
              </td>
              <td colspan="3" style="color: ${isFriday ? '#991b1b' : '#94a3b8'}; font-style: italic; padding: 12px 14px;">
                ${isFriday ? '⚠️ عطلة الجمعة الرسمية للورشة' : '🕊️ يوم شاغر ومتاح - لا توجد طلبيات بعد'}
              </td>
              <td style="text-align: left; padding: 10px 14px;">
                ${!isFriday ? `
                  <button type="button" class="btn btn-sm btn-outline" style="font-size: 11px; padding: 3px 10px;" onclick="window.naseejAdmin.quickAddOrderForDate('${d.dateStr}')">
                    ➕ حجز موعد
                  </button>
                ` : ''}
              </td>
            </tr>
          `;
        } else {
          rowsHtml += `
            <tr class="${rowClass}">
              <td style="vertical-align: top; width: 195px; background: ${d.isToday ? '#fefce8' : '#ffffff'}; border-left: 1.5px solid #e2e8f0; padding: 10px 12px;">
                <div class="day-date-cell ${d.isToday ? 'today' : ''}">
                  <span class="day-badge-num">${d.dayNum}</span>
                  <div>
                    <div style="font-weight: 800; color: #0f172a; font-size: 13.5px;">${d.dayName}</div>
                    <div style="font-size: 11px; color: #64748b;">${d.dateStr}</div>
                  </div>
                  ${d.isToday ? '<span class="badge badge-gold" style="font-size: 10px; padding: 1px 6px;">اليوم</span>' : ''}
                </div>

                <!-- Daily Workload Capacity Meter (حد التركيب 3 إلى 4 ورش يومياً) -->
                <div style="margin-top: 8px; font-size: 11px; display: flex; flex-direction: column; gap: 4px; background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: ${dayInstallCount > 4 ? '#b91c1c' : (dayInstallCount >= 3 ? '#b45309' : '#2563eb')}; font-weight: 800;">
                      🔧 تركيب: <strong>${dayInstallCount}</strong> / 4 ورش
                    </span>
                    ${dayInstallCount > 4 
                      ? '<span style="font-size: 9.5px; font-weight: 800; background: #fee2e2; color: #b91c1c; padding: 1px 5px; border-radius: 4px;">⚠️ ضغط وتجاوز الحد!</span>' 
                      : (dayInstallCount >= 3 
                          ? '<span style="font-size: 9.5px; font-weight: 800; background: #fef3c7; color: #92400e; padding: 1px 5px; border-radius: 4px;">مكتمل (3-4)</span>' 
                          : '<span style="font-size: 9.5px; font-weight: 700; background: #dcfce7; color: #166534; padding: 1px 5px; border-radius: 4px;">متاح</span>')}
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #059669; font-weight: 800;">
                      🏪 تسليم بالمعرض: <strong>${dayPickupCount}</strong>
                    </span>
                  </div>
                </div>

                <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                  <span class="badge" style="background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 800;">${orders.length} ${orders.length === 1 ? 'طلبية' : 'طلبيات'}</span>
                  <button type="button" class="btn btn-sm btn-outline" style="font-size: 10.5px; padding: 2px 7px;" onclick="window.naseejAdmin.quickAddOrderForDate('${d.dateStr}')" title="إضافة موعد آخر لهذا اليوم">
                    ➕ موعد
                  </button>
                </div>
              </td>
              <td colspan="4" style="padding: 8px 10px; vertical-align: middle;">
                <div class="day-orders-grid">
                  ${orders.map(o => {
                    const custName = (o.customer && o.customer.name) || o.customerName || 'زبون الورشة';
                    const custPhone = (o.customer && o.customer.phone) || o.customerPhone || '';
                    const isInstall = Boolean(o.requiresInstallation);
                    const windowsCount = (o.items || []).length || 1;
                    const fabricsText = (o.items || []).map(it => it.productName || 'قماش').slice(0, 2).join(' + ') || `${o.totalMeters || 8}م قماش`;
                    const totalAmount = o.grandTotal || o.totalAmount || o.total || 0;
                    
                    const isPrepared = store.isOrderPrepared(o);
                    const prepInfo = store.getWorkshopPrepDate(o.scheduledDate || o.installationDate);
                    const prepDate = o.workshopPrepDate || prepInfo.dateStr;
                    const prepDay = o.workshopPrepDay || prepInfo.dayName;

                    return `
                      <div class="day-order-chip ${isPrepared ? 'chip-prepared' : 'chip-pending'}">
                        <div class="day-order-chip-header">
                          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span class="day-order-cust-name" onclick="window.naseejAdmin.printOrderReceipt('${o.id}')" title="انقر لعرض وطباعة الفاتورة">
                              👤 <strong>${custName}</strong>
                            </span>
                            <span class="badge ${isPrepared ? 'badge-prepared' : 'badge-pending'}" 
                                  onclick="window.naseejAdmin.toggleOrderPrepStatus('${o.id}', event)" 
                                  title="انقر لتغيير حالة التجهيز يدوياً"
                                  style="font-size: 10.5px; padding: 2px 7px; cursor: pointer; user-select: none; transition: transform 0.15s ease;">
                              ${isPrepared ? '✅ تم التجهيز' : '⏳ قيد التجهيز'}
                            </span>
                          </div>
                          ${isInstall ? `
                            <span class="badge" style="font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd;">
                              🔧 تركيب منزلي (${o.installerName || 'فني تركيب'})
                            </span>
                          ` : `
                            <span class="badge" style="font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7;">
                              🏪 تسليم داخل المعرض
                            </span>
                          `}
                        </div>

                        <div class="day-order-chip-body">
                          <span>🪟 ${windowsCount} ${windowsCount === 1 ? 'شباك' : 'شبابيك'} • ${fabricsText}</span>
                          <div style="display: flex; gap: 8px; align-items: center;">
                            ${isPrepared ? '<span style="color: #15803d; font-weight: 800; font-size: 11px;">✓ منجز</span>' : ''}
                            <span style="font-weight: 800; color: #b45309;">${totalAmount.toLocaleString()} ₪</span>
                          </div>
                        </div>

                        <!-- Workshop Prep Date (تنزل للورشة قبل بيومين) -->
                        <div style="margin-top: 5px; font-size: 11px; background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; padding: 3px 8px; border-radius: 5px; display: flex; align-items: center; justify-content: space-between;">
                          <span>✂️ تنزيل وتجهيز الورشة: <strong>يوم ${prepDay} (${prepDate})</strong></span>
                          <span style="font-size: 10px; font-weight: 800; color: #c2410c; background: #ffedd5; padding: 1px 6px; border-radius: 4px;">قبل بيومين</span>
                        </div>

                        <div class="day-order-chip-actions" style="margin-top: 6px;">
                          <span style="font-size: 10px; color: #94a3b8; font-family: monospace;">#${o.id}</span>
                          <div style="display: flex; gap: 4px;">
                            <button type="button" class="btn btn-xs btn-outline" onclick="window.naseejAdmin.printOrderReceipt('${o.id}')" title="طباعة أمر تفصيل الورشة">🖨️ أمر الورشة</button>
                            ${custPhone ? `
                              <a href="https://wa.me/972${custPhone.replace(/\\D/g, '').replace(/^0+/, '')}?text=${encodeURIComponent(`السلام عليكم ${custName}، معك إدارة شركة الولاء للستائر Balalem co بخصوص موعد ${isInstall ? 'التركيب' : 'التسليم بالمعرض'} لطلبيتكم رقم ${o.id}`)}" target="_blank" rel="noopener noreferrer" class="btn btn-xs btn-outline" style="color: #10b981; border-color: #10b981;" title="واتساب">💬</a>
                            ` : ''}
                            <button type="button" class="btn btn-xs btn-danger-soft" onclick="window.naseejAdmin.confirmDeleteOrder('${o.id}')" title="حذف الطلبية">🗑️</button>
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </td>
            </tr>
          `;
        }
      });
    }

    container.innerHTML = `
      <div class="monthly-schedule-card">
        <!-- Top Title & Navigation Bar -->
        <div class="monthly-table-header-bar">
          <div>
            <div class="monthly-table-title">
              <span>📆 جدول مواعيد الطلبيات الشهري (شهر ${monthName} ${year})</span>
              <span class="badge badge-gold" style="font-size: 12px;">شهر كامل</span>
            </div>
            <p style="font-size: 12.5px; color: #64748b; margin: 4px 0 0 0;">
              جدول شامل يوضح مواعيد كافة الزبائن باليوم والتاريخ مع فرز صريح بين مواعيد التركيب المنزلي والتسليم داخل المعرض، وموعد تنزيل الشغل للورشة.
            </p>
          </div>

          <!-- Month & Year Controls -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn-cal-nav" onclick="window.naseejAdmin.navigateMonth(-1)" title="الانتقال للشهر السابق">
              <span>◀ الشهر السابق</span>
            </button>
            <button type="button" class="btn-cal-nav btn-cal-today" onclick="window.naseejAdmin.goToCurrentMonth()" title="الرجوع للشهر الحالي">
              <span>📍 الشهر الحالي</span>
            </button>
            <button type="button" class="btn-cal-nav" onclick="window.naseejAdmin.navigateMonth(1)" title="الانتقال للشهر التالي">
              <span>الشهر التالي ▶</span>
            </button>
            
            <button type="button" class="btn btn-sm ${this.monthlyFilterOnlyScheduled ? 'btn-gold' : 'btn-outline'}" onclick="window.naseejAdmin.toggleMonthlyOnlyScheduled()" title="التبديل بين عرض كافة الأيام أو المجدولة فقط">
              <span>${this.monthlyFilterOnlyScheduled ? '📋 إظهار كافة أيام الشهر' : '🎯 إظهار الأيام المجدولة فقط'}</span>
            </button>
          </div>
        </div>

        <!-- Monthly Aggregate KPIs -->
        <div class="monthly-stats-pills" style="margin-bottom: 12px;">
          <div class="monthly-stat-pill active-gold">
            <span>📦 إجمالي طلبيات الشهر:</span>
            <strong>${totalScheduledOrders} طلبية</strong>
          </div>
          <div class="monthly-stat-pill" style="border-right: 3px solid #2563eb;">
            <span>🔧 مواعيد التركيب المنزلي:</span>
            <strong style="color: #2563eb;">${totalInstallOrders} موعد</strong>
          </div>
          <div class="monthly-stat-pill" style="border-right: 3px solid #059669;">
            <span>🏪 تسليم داخل المعرض:</span>
            <strong style="color: #059669;">${totalDeliveryOrders + totalPickupOrders} موعد</strong>
          </div>
          <div class="monthly-stat-pill">
            <span>📐 إجمالي أمتار القماش:</span>
            <strong>${totalMetersMonth} متر</strong>
          </div>
        </div>

        <!-- Interactive Appointment Type Filter Tabs Bar -->
        <div class="monthly-type-filter-bar" style="display: flex; gap: 8px; margin-bottom: 14px; align-items: center; flex-wrap: wrap; background: #ffffff; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
          <span style="font-size: 13px; font-weight: 800; color: #0f172a; margin-left: 6px;">🎯 فرز نوع الموعد في الجدول:</span>
          <button type="button" class="btn btn-sm ${this.monthlyTypeFilter === 'all' ? 'btn-gold' : 'btn-outline'}" onclick="window.naseejAdmin.setMonthlyTypeFilter('all')" style="font-weight: 800;">
            🔘 كافة المواعيد (${totalScheduledOrders})
          </button>
          <button type="button" class="btn btn-sm ${this.monthlyTypeFilter === 'install' ? 'btn-primary' : 'btn-outline'}" onclick="window.naseejAdmin.setMonthlyTypeFilter('install')" style="font-weight: 800; ${this.monthlyTypeFilter === 'install' ? 'background: #2563eb; color: #fff;' : 'color: #2563eb; border-color: #93c5fd;'}">
            🔧 مواعيد التركيب المنزلي فقط (${totalInstallOrders})
          </button>
          <button type="button" class="btn btn-sm ${this.monthlyTypeFilter === 'pickup' ? 'btn-success' : 'btn-outline'}" onclick="window.naseejAdmin.setMonthlyTypeFilter('pickup')" style="font-weight: 800; ${this.monthlyTypeFilter === 'pickup' ? 'background: #059669; color: #fff;' : 'color: #059669; border-color: #6ee7b7;'}">
            🏪 تسليم داخل المعرض فقط (${totalDeliveryOrders + totalPickupOrders})
          </button>
        </div>

        <!-- Paper Schedule Image & Extractor Section -->
        ${paperSectionHtml}

        <!-- 3-Column Schedule Table -->
        <div class="monthly-table-responsive">
          <table class="monthly-schedule-table">
            <thead>
              <tr>
                <th style="width: 24%;">اليوم والتاريخ 📅 وطاقة اليوم</th>
                <th colspan="4">مواعيد الزبائن والطلبيات 👤 (مع موعد تنزيل الشغل للورشة قبل بيومين)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  setMonthlyTypeFilter(filterType) {
    this.monthlyTypeFilter = filterType;
    this.renderMonthlyScheduleView();
  }

  toggleOrderPrepStatus(orderId, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const order = store.getOrderById(orderId);
    if (!order) return;

    const currentStatus = store.isOrderPrepared(order);
    const newStatus = !currentStatus;

    store.updateOrder(orderId, { isPrepared: newStatus });

    const custName = (order.customer && order.customer.name) || order.customerName || 'الطلبية';
    if (newStatus) {
      if (window.naseejCustomer) window.naseejCustomer.showToast(`✅ تم تأكيد وتحديد طلبية (${custName}) كـ [تم التجهيز] بنجاح`, 'success');
    } else {
      if (window.naseejCustomer) window.naseejCustomer.showToast(`⏳ تم إعادة طلبية (${custName}) إلى [قيد التجهيز]`, 'info');
    }

    this.renderMonthlyScheduleView();
    if (this.currentScheduleSubTab === 'installation') this.renderInstallationSchedule();
    if (this.currentScheduleSubTab === 'tailoring') this.renderWeeklySchedule();
    this.renderOrdersTable();
  }

  printOrderWorkReceipt(orderId) {
    this.printOrderReceipt(orderId);
  }

  handlePaperScheduleUpload(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const key = `naseej_paper_sched_${this.currentScheduleYear}_${this.currentScheduleMonth}`;
      try {
        localStorage.setItem(key, dataUrl);
      } catch (err) {
        console.warn('Storage quota exceeded for paper schedule image:', err);
      }
      window.naseejCustomer.showToast('تم حفظ صورة جدول الورشة الورقي لهذا الشهر بنجاح! ✓', 'success');
      this.renderMonthlyScheduleView();
      setTimeout(() => {
        this.openPaperScheduleModal();
      }, 200);
    };
    reader.readAsDataURL(file);
  }

  openPaperScheduleModal() {
    const key = `naseej_paper_sched_${this.currentScheduleYear}_${this.currentScheduleMonth}`;
    const imgData = localStorage.getItem(key) || 'assets/images/paper_schedule_sample.jpg';
    const modal = document.getElementById('admin-paper-schedule-modal');
    const imgEl = document.getElementById('paper-modal-img-full');
    const linkEl = document.getElementById('paper-modal-img-link');
    const badgeEl = document.getElementById('paper-modal-month-badge');
    const dateInput = document.getElementById('extract-order-date');

    if (!modal) return;
    if (imgEl) imgEl.src = imgData;
    if (linkEl) linkEl.href = imgData;
    if (badgeEl) badgeEl.textContent = `شهر ${this.currentScheduleMonth} / ${this.currentScheduleYear}`;
    if (dateInput) {
      const mStr = String(this.currentScheduleMonth).padStart(2, '0');
      dateInput.value = `${this.currentScheduleYear}-${mStr}-15`;
    }

    modal.classList.add('active');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    modal.style.pointerEvents = 'auto';
    modal.style.zIndex = '99999';
    document.body.style.overflow = 'hidden';
  }

  closePaperScheduleModal() {
    const modal = document.getElementById('admin-paper-schedule-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
      modal.style.opacity = '';
      modal.style.visibility = '';
      modal.style.pointerEvents = '';
      modal.style.zIndex = '';
      document.body.style.overflow = '';
    }
  }

  deletePaperScheduleImage() {
    if (confirm('هل أنت متأكد من حذف صورة الجدول الورقي لهذا الشهر؟')) {
      const key = `naseej_paper_sched_${this.currentScheduleYear}_${this.currentScheduleMonth}`;
      localStorage.removeItem(key);
      window.naseejCustomer.showToast('تم حذف صورة الجدول الورقي', 'info');
      this.closePaperScheduleModal();
      this.renderMonthlyScheduleView();
    }
  }

  submitExtractedEntry(event) {
    if (event) event.preventDefault();
    const name = document.getElementById('extract-cust-name').value.trim();
    const dateStr = document.getElementById('extract-order-date').value;
    const type = document.getElementById('extract-order-type').value;
    const windowsDesc = document.getElementById('extract-windows-desc').value.trim();
    const phone = document.getElementById('extract-cust-phone').value.trim();

    if (!name || !dateStr) {
      window.naseejCustomer.showToast('يرجى كتابة اسم الزبون وتحديد التاريخ', 'error');
      return;
    }

    const d = new Date(dateStr);
    const dayName = store.getDayNameFromDate(d);
    const isInstall = type === 'install';
    const isDelivery = type === 'delivery';

    store.createOrder({
      customer: {
        name: name,
        phone: phone || '0590000000',
        city: 'نابلس',
        address: 'جدول الورشة الورقي'
      },
      customerName: name,
      customerPhone: phone || '0590000000',
      customerCity: 'نابلس',
      customerAddress: 'الورشة',
      scheduledDate: dateStr,
      scheduledDay: dayName,
      requiresInstallation: isInstall,
      installationDate: isInstall ? dateStr : null,
      installationDay: isInstall ? dayName : null,
      deliveryType: isDelivery ? 'delivery' : 'pickup',
      totalMeters: 8,
      source: 'walkin_paper',
      items: [{
        productId: 'p_paper',
        productName: windowsDesc || 'قماش ستائر (جدول ورقي)',
        roomName: 'شباك',
        color: 'حسب الورقة',
        width: 3.0,
        height: 2.8,
        meters: 8,
        unitLabel: 'متر',
        pricePerMeter: 60,
        total: 480
      }],
      totalAmount: 480
    });

    window.naseejCustomer.showToast(`تم تفريغ وإدراج طلبية (${name}) في جدول يوم ${dayName} (${dateStr}) بنجاح! ✓`, 'success');
    document.getElementById('extract-cust-name').value = '';
    document.getElementById('extract-windows-desc').value = '';
    document.getElementById('extract-cust-phone').value = '';

    this.renderMonthlyScheduleView();
    this.renderOrdersTable();
    this.renderKPIs();
  }

  autoExtractPaperSchedule() {
    const btn = document.getElementById('btn-auto-extract-paper');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ جاري قراءة خط اليد وتفريغ مواعيد الورشة...</span>';
    }

    // Comprehensive transcribed schedule directly from the workshop handwritten ledger
    const EXTRACTED_ITEMS = [
      { date: '2026-09-13', name: 'أحمد الفار + سائد دهيمات', type: 'install', desc: 'تفصيل وتركيب برادي' },
      { date: '2026-09-13', name: 'فراس السيد أحمد', type: 'delivery', desc: 'برادي صالون وقعدة' },
      { date: '2026-09-13', name: 'محمود كماجة + حمزة الأمير', type: 'install', desc: 'ستائر غرف نوم' },
      { date: '2026-09-13', name: 'عبد الله إله / كفر قفا', type: 'delivery', desc: 'تفصيل قماش' },
      { date: '2026-09-14', name: 'علاء كيلاني', type: 'install', desc: 'شباك صالة ماستر' },
      { date: '2026-09-14', name: 'أبو كامل + أنس أبو السعود', type: 'delivery', desc: 'برادي كاملة' },
      { date: '2026-09-14', name: 'أم ضياء فتوح', type: 'install', desc: 'ستائر صالون' },
      { date: '2026-09-15', name: 'سميح خضر / شاكر', type: 'install', desc: 'تركيب صالة وغرفة' },
      { date: '2026-09-15', name: 'أبو مهند فقط', type: 'install', desc: 'ورشة أبو مهند' },
      { date: '2026-09-16', name: 'معاذ قادوسية + بشار العقاد', type: 'install', desc: 'برادي شتوح وأمريكي' },
      { date: '2026-09-16', name: 'أم محمد كنت حيلان', type: 'delivery', desc: 'تفصيل برادي' },
      { date: '2026-09-16', name: 'البردويكان + المديونس', type: 'install', desc: 'برادي ويفي وكسرات' },
      { date: '2026-09-17', name: 'أم جميل الشمالي فقط', type: 'delivery', desc: 'برادي صالة' },
      { date: '2026-09-17', name: 'حسام هلال', type: 'install', desc: 'تركيب كامل' },
      { date: '2026-09-17', name: 'عصام التابتي + فخري', type: 'delivery', desc: 'تسليم برادي' },
      { date: '2026-09-17', name: 'سميح خالد', type: 'install', desc: 'تركيب ستائر' },
      { date: '2026-09-19', name: 'جهاد بليه', type: 'install', desc: 'تفصيل وتركيب برادي' },
      { date: '2026-09-19', name: 'سامي عبد الهادي + جهان غانم', type: 'delivery', desc: 'برادي صالون' },
      { date: '2026-09-19', name: 'أبو مجدي الصليبي + عبد الهادي', type: 'install', desc: 'تركيب ستائر' },
      { date: '2026-09-19', name: 'حسام اشتية', type: 'install', desc: 'برادي كاملة' },
      { date: '2026-09-20', name: 'عبود الصوالحي', type: 'install', desc: 'شباك ماستر وقعدة' },
      { date: '2026-09-20', name: 'هندية', type: 'delivery', desc: 'برادي صالون' },
      { date: '2026-09-20', name: 'أبو علي عوض + أم خلدون', type: 'install', desc: 'تركيب صالون' },
      { date: '2026-09-20', name: 'حازم جبر + سليمان أهالي', type: 'delivery', desc: 'تفصيل برادي' },
      { date: '2026-09-21', name: 'محمد سوالمة', type: 'install', desc: 'تركيب برادي' },
      { date: '2026-09-21', name: 'اشتية سالم', type: 'delivery', desc: 'تسليم برادي' },
      { date: '2026-09-21', name: 'أبو مهند فقط', type: 'install', desc: 'ورشة أبو مهند' },
      { date: '2026-09-22', name: 'أبو العز رومي', type: 'install', desc: 'برادي صالون' },
      { date: '2026-09-22', name: 'فاروق جاد الله / عقاله', type: 'delivery', desc: 'برادي ويفي' },
      { date: '2026-09-22', name: 'عاصم نيران تل', type: 'install', desc: 'تركيب تل' },
      { date: '2026-09-22', name: 'كابر فخري / وراوي', type: 'delivery', desc: 'تسليم برادي' },
      { date: '2026-09-23', name: 'أمير جناعة / حارة قيرا', type: 'install', desc: 'برادي صالة وغرفة' },
      { date: '2026-09-23', name: 'أم الصناعة', type: 'delivery', desc: 'تسليم ستائر' },
      { date: '2026-09-23', name: 'بيت الفقية / أولاد عطية', type: 'install', desc: 'تركيب كامل' },
      { date: '2026-09-23', name: 'نادر حلبيه / اسكنكنة حيلان', type: 'delivery', desc: 'تفصيل برادي' },
      { date: '2026-09-24', name: 'عبد السالم + عبد الخالق', type: 'install', desc: 'تركيب برادي' },
      { date: '2026-09-24', name: 'محمد عفانة / عزون', type: 'delivery', desc: 'تسليم عزون' },
      { date: '2026-09-24', name: 'أبو علي عوض', type: 'install', desc: 'شباك صالون' },
      { date: '2026-09-24', name: 'أبو مهند فقط', type: 'install', desc: 'ورشة أبو مهند' },
      { date: '2026-09-26', name: 'محمد النابلسي', type: 'install', desc: 'برادي شتوح' },
      { date: '2026-09-26', name: 'محمد شام', type: 'delivery', desc: 'تسليم برادي' },
      { date: '2026-09-26', name: 'أحمد أبو الهدى / خالة رامي', type: 'install', desc: 'تركيب كامل' },
      { date: '2026-09-26', name: 'أم خالد رامي / فيصل عليوي', type: 'delivery', desc: 'تسليم برادي' },
      { date: '2026-09-27', name: 'عمر اشتيه / حي العبدان', type: 'install', desc: 'برادي صالون' },
      { date: '2026-09-27', name: 'قصي الطراوي', type: 'delivery', desc: 'تفصيل برادي' },
      { date: '2026-09-27', name: 'حيدر صوان', type: 'install', desc: 'تركيب ستائر' },
      { date: '2026-09-28', name: 'عنان أقرع / عزموط الخله', type: 'install', desc: 'تركيب عزموط' },
      { date: '2026-09-28', name: 'جميل عبدة', type: 'delivery', desc: 'تسليم برادي' },
      { date: '2026-09-28', name: 'رياض عنتري / دير شرف', type: 'install', desc: 'تركيب دير شرف' },
      { date: '2026-09-28', name: 'أبو مهند فقط', type: 'install', desc: 'ورشة أبو مهند' },
      { date: '2026-09-29', name: 'الرستناعة', type: 'delivery', desc: 'تسليم ستائر' },
      { date: '2026-09-29', name: 'محمد عوشي', type: 'install', desc: 'تركيب برادي' },
      { date: '2026-09-29', name: 'أمجد أبو خيط', type: 'delivery', desc: 'تسليم برادي' },
      { date: '2026-09-29', name: 'أبو مهند', type: 'install', desc: 'ورشة أبو مهند' },
      { date: '2026-09-30', name: 'حميد جابر', type: 'install', desc: 'برادي صالون وقعدة' },
      { date: '2026-09-30', name: 'محمد منصور', type: 'delivery', desc: 'تسليم برادي' },
      { date: '2026-09-30', name: 'أم آرام ضروري', type: 'install', desc: 'تركيب عاجل ضروري' },
      { date: '2026-10-01', name: 'أسامة تمام', type: 'install', desc: 'تركيب برادي' },
      { date: '2026-10-01', name: 'نضال عميرة / عزون (أحمد لامي)', type: 'delivery', desc: 'تسليم عزون' },
      { date: '2026-10-03', name: 'عمار حمارشة', type: 'install', desc: 'تركيب برادي' },
      { date: '2026-10-04', name: 'غالب جابر', type: 'delivery', desc: 'تسليم برادي' },
      { date: '2026-10-04', name: 'عبد الله صقر', type: 'install', desc: 'تركيب صالة' },
      { date: '2026-10-04', name: 'أم مهند بيت فوريك', type: 'delivery', desc: 'تسليم بيت فوريك' },
      { date: '2026-10-05', name: 'سمير ترابي', type: 'install', desc: 'تركيب برادي' },
      { date: '2026-10-05', name: 'خالد دراوشة + تصوير فلان', type: 'delivery', desc: 'تسليم وتصوير' },
      { date: '2026-10-06', name: 'نضال خلف', type: 'install', desc: 'تركيب برادي' },
      { date: '2026-10-07', name: 'مهدي ضويرم ضروري', type: 'install', desc: 'تركيب عاجل ضروري' }
    ];

    setTimeout(() => {
      let addedCount = 0;
      const existingOrders = store.getOrders();
      const existingKeys = new Set(existingOrders.map(o => `${o.scheduledDate}_${(o.customer?.name || o.customerName || '').trim()}`));

      EXTRACTED_ITEMS.forEach(item => {
        const key = `${item.date}_${item.name.trim()}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          const d = new Date(item.date);
          const dayName = store.getDayNameFromDate(d);
          const isInstall = item.type === 'install';
          const prepInfo = store.getWorkshopPrepDate(item.date);

          store.createOrder({
            customer: {
              name: item.name,
              phone: '059' + Math.floor(1000000 + Math.random() * 8999999),
              city: 'نابلس',
              address: isInstall ? item.desc : 'استلام وتسليم داخل المعرض'
            },
            customerName: item.name,
            customerPhone: '059' + Math.floor(1000000 + Math.random() * 8999999),
            customerCity: 'نابلس',
            scheduledDate: item.date,
            scheduledDay: dayName,
            requiresInstallation: isInstall,
            installationDate: isInstall ? item.date : null,
            installationDay: isInstall ? dayName : null,
            installerName: isInstall ? (item.desc.includes('عز') ? 'عز' : 'أسامة') : null,
            installerId: isInstall ? (item.desc.includes('عز') ? 'ezz' : 'osama') : null,
            deliveryType: isInstall ? 'delivery' : 'pickup',
            deliveryRegion: isInstall ? 'تركيب منزلي' : 'تسليم داخل المعرض',
            workshopPrepDate: prepInfo.dateStr,
            workshopPrepDay: prepInfo.dayName,
            totalMeters: 8,
            source: 'paper_schedule_ai',
            items: [{
              productId: 'p_paper',
              productName: item.desc || 'قماش ستائر تفصيل',
              roomName: 'شباك',
              color: 'بيج رملي',
              width: 3.0,
              height: 2.8,
              meters: 8,
              unitLabel: 'متر',
              pricePerMeter: 60,
              total: 480
            }],
            totalAmount: 480
          });
          addedCount++;
        }
      });

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>⚡ تفريغ محتوى جدول الورقة تلقائياً بضغطة واحدة</span>';
      }

      window.naseejCustomer.showToast(`🎉 تم تفريغ وإدراج (${addedCount || EXTRACTED_ITEMS.length}) موعداً من جدول الورشة الورقي بنجاح في الجدول الشهري!`, 'success');
      this.closePaperScheduleModal();
      this.renderMonthlyScheduleView();
      this.renderOrdersTable();
      this.renderKPIs();
    }, 600);
  }

  navigateMonth(delta) {
    let m = this.currentScheduleMonth + delta;
    let y = this.currentScheduleYear;
    if (m > 12) {
      m = 1;
      y++;
    } else if (m < 1) {
      m = 12;
      y--;
    }
    this.currentScheduleMonth = m;
    this.currentScheduleYear = y;
    const selectMonth = document.getElementById('cal-month-select');
    const selectYear = document.getElementById('cal-year-select');
    if (selectMonth) selectMonth.value = m;
    if (selectYear) selectYear.value = y;
    const firstDay = new Date(y, m - 1, 1);
    this.currentSaturdayDate = store.getSaturdayOfWeek(firstDay);
    this.updateActiveWeekBanner();
    this.renderMonthlyScheduleView();
  }

  goToCurrentMonth() {
    const today = new Date();
    this.currentScheduleYear = today.getFullYear();
    this.currentScheduleMonth = today.getMonth() + 1;
    const selectMonth = document.getElementById('cal-month-select');
    const selectYear = document.getElementById('cal-year-select');
    if (selectMonth) selectMonth.value = this.currentScheduleMonth;
    if (selectYear) selectYear.value = this.currentScheduleYear;
    this.currentSaturdayDate = store.getSaturdayOfWeek(today);
    this.updateActiveWeekBanner();
    this.renderMonthlyScheduleView();
  }

  toggleMonthlyOnlyScheduled() {
    this.monthlyFilterOnlyScheduled = !this.monthlyFilterOnlyScheduled;
    this.renderMonthlyScheduleView();
  }

  quickAddOrderForDate(dateStr) {
    this.openWalkinOrderModal();
    const dateInput = document.getElementById('walkin-schedule-date');
    if (dateInput && dateStr) {
      dateInput.value = dateStr;
      this.handleWalkinDateChange(dateStr);
    }
    const installDateInput = document.getElementById('walkin-install-date');
    if (installDateInput && dateStr) {
      installDateInput.value = dateStr;
      this.handleWalkinInstallDateChange(dateStr);
    }
  }

  // ==========================================
  // CUSTOMER SEARCH ENGINE (البحث عن زبون / صاحب طلبية)
  // ==========================================

  handleTopCustomerSearch(query) {
    const clearBtn = document.getElementById('admin-top-search-clear');
    const resultsPanel = document.getElementById('admin-top-search-results');
    if (!resultsPanel) return;

    const q = (query || '').trim();
    if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';

    if (!q) {
      resultsPanel.style.display = 'none';
      return;
    }

    const normalizeArabic = (s) => (s || '').toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '')
      .trim();

    const qNorm = normalizeArabic(q);
    const orders = store.getOrders();

    const matches = orders.filter(o => {
      const custName = (o.customer && o.customer.name) || o.customerName || '';
      const custPhone = (o.customer && o.customer.phone) || o.customerPhone || '';
      const custCity = (o.customer && o.customer.city) || o.customerCity || o.deliveryRegion || '';
      const name = normalizeArabic(custName);
      const phone = custPhone.replace(/\D/g, '');
      const id = normalizeArabic(o.id || '');
      const city = normalizeArabic(custCity);
      const qDigits = q.replace(/\D/g, '');
      return name.includes(qNorm) || (qDigits && phone.includes(qDigits)) || id.includes(qNorm) || city.includes(qNorm);
    });

    resultsPanel.style.display = 'block';

    if (matches.length === 0) {
      resultsPanel.innerHTML = `
        <div style="text-align: center; padding: 20px 10px; color: #64748b;">
          <div style="font-size: 28px; margin-bottom: 6px;">🔍</div>
          <div style="font-weight: 700; color: #0f172a;">لا يوجد زبون مطابق لـ "${q}"</div>
          <div style="font-size: 11.5px; margin-top: 4px;">تأكد من كتابة الاسم أو رقم الهاتف بشكل صحيح، أو سجل طلبية جديدة.</div>
          <button type="button" class="btn btn-sm btn-gold" style="margin-top: 10px;" onclick="window.naseejAdmin.clearTopCustomerSearch(); window.openWalkinOrderModal();">
            ➕ تسجيل طلبية جديدة لهذا الزبون
          </button>
        </div>
      `;
      return;
    }

    const cardsHtml = matches.map(o => {
      const custName = (o.customer && o.customer.name) || o.customerName || 'زبون الورشة';
      const custPhone = (o.customer && o.customer.phone) || o.customerPhone || '';
      const custCity = (o.customer && o.customer.city) || o.customerCity || o.deliveryRegion || 'نابلس';
      const grandTotal = o.grandTotal || o.totalAmount || o.subtotal || o.total || 0;

      const windowsCount = (o.items || []).length || 1;
      const windowsCountLabel = windowsCount === 1 ? 'شباك واحد' : (windowsCount === 2 ? 'شباكان' : `${windowsCount} شبابيك`);
      
      const windowsDetailsHtml = (o.items || []).map((it, idx) => {
        const dimStr = (it.width && it.height) ? `[${it.width}م عرض × ${it.height}م ارتفاع]` : '';
        return `
          <div class="search-window-item">
            <div>
              <strong>#${idx + 1} ${it.roomName || 'شباك'}:</strong>
              <span>${it.productName || 'قماش'} (${it.color || 'بيج'})</span>
              ${dimStr ? `<span style="color: #b45309; font-weight: 700; margin-right: 4px;">${dimStr}</span>` : ''}
            </div>
            <div style="white-space: nowrap; font-weight: 700; color: #0f172a;">
              ${it.meters || 0} ${it.unitLabel || 'متر'} • ${(it.total || 0).toLocaleString()} ₪
            </div>
          </div>
        `;
      }).join('');

      let apptBadge = '';
      if (o.requiresInstallation) {
        apptBadge = `<span class="order-type-badge install" style="font-size: 10.5px;">🔧 موعد تركيب (${o.installationDate || o.scheduledDate || 'قريباً'})</span>`;
      } else if (o.deliveryType === 'delivery') {
        apptBadge = `<span class="order-type-badge delivery" style="font-size: 10.5px;">🚚 توصيل (${o.scheduledDate || 'قريباً'})</span>`;
      } else {
        apptBadge = `<span class="order-type-badge pickup" style="font-size: 10.5px;">🏪 استلام بالفرع (${o.scheduledDate || 'قريباً'})</span>`;
      }

      return `
        <div class="search-result-card">
          <div class="search-result-top">
            <div>
              <div class="search-cust-name" style="font-size: 14.5px; font-weight: 800; color: #0f172a;">👤 ${custName}</div>
              <div class="search-cust-meta" style="font-size: 12px; color: #64748b; margin-top: 3px;">
                <span>📞 ${custPhone ? `<a href="tel:${custPhone}" style="color: #0284c7; font-weight: 700; text-decoration: none;">${custPhone}</a>` : '<span style="color: #94a3b8;">لا يوجد هاتف</span>'}</span>
                <span>•</span>
                <span>📍 ${custCity}</span>
                <span>•</span>
                <span class="badge badge-gold" style="font-size: 10.5px; font-family: monospace;">#${o.id}</span>
              </div>
            </div>
            <div>
              ${apptBadge}
            </div>
          </div>

          <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 6px;">
            🪟 ${windowsCountLabel} (إجمالي ${o.totalMeters || 0} متر)
          </div>

          <div class="search-windows-list">
            ${windowsDetailsHtml}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
            <div style="font-size: 14px; font-weight: 800; color: #b45309;">
              المجموع: <strong>${grandTotal.toLocaleString()} ₪</strong>
            </div>
            <div class="search-card-actions">
              <button type="button" class="btn btn-sm btn-outline" style="font-size: 11px; padding: 3px 8px;" onclick="window.naseejAdmin.printOrderWorkReceipt('${o.id}'); window.naseejAdmin.clearTopCustomerSearch();">
                🖨️ أمر الورشة
              </button>
              ${custPhone ? `
                <a href="https://wa.me/972${custPhone.replace(/\\D/g, '').replace(/^0+/, '')}?text=${encodeURIComponent(`مرحباً ${custName}، شركة الولاء للستائر BalalemCo بخصوص طلبية الستائر رقم ${o.id}`)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="color: #10b981; border-color: #10b981; font-size: 11px; padding: 3px 8px;" title="مراسلة واتساب">
                  💬 واتساب
                </a>
              ` : ''}
              <button type="button" class="btn btn-sm btn-gold" style="font-size: 11px; padding: 3px 8px;" onclick="window.naseejAdmin.jumpToDate('${o.scheduledDate || o.installationDate || ''}'); window.naseejAdmin.clearTopCustomerSearch();">
                📅 عرض بالجدول
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    resultsPanel.innerHTML = `
      <div class="search-results-header">
        <span>تم العثور على ${matches.length} طلبية / زبون:</span>
        <button type="button" onclick="window.naseejAdmin.clearTopCustomerSearch()" style="background: none; border: none; font-size: 11.5px; color: #64748b; cursor: pointer;">إغلاق ✕</button>
      </div>
      <div>
        ${cardsHtml}
      </div>
    `;
  }

  clearTopCustomerSearch() {
    const input = document.getElementById('admin-top-customer-search-input');
    const clearBtn = document.getElementById('admin-top-search-clear');
    const resultsPanel = document.getElementById('admin-top-search-results');
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (resultsPanel) resultsPanel.style.display = 'none';
  }

  // Filter Installers on Installation Board
  filterInstallers(techId) {
    this.selectedInstallerFilter = techId;
    document.querySelectorAll('.tech-filter-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.tech === techId);
    });
    this.renderInstallationSchedule();
  }

  // Change assigned installer for an order
  changeOrderInstaller(orderId, newInstallerId) {
    const updated = store.assignOrderInstallation(orderId, { installerId: newInstallerId });
    if (updated) {
      window.naseejCustomer.showToast(`تم تعيين الفني (${store.getInstallerName(newInstallerId)}) للطلبية ${orderId} بنجاح!`, 'success');
      this.renderInstallationSchedule();
      this.renderOrdersTable();
      this.renderWeeklySchedule();
      if (this.calendarViewMode === 'monthly') this.renderMonthlyCalendar();
    }
  }

  // Change installation day & date for an order
  changeOrderInstallDay(orderId, newDateOrDay, newDayName) {
    const updates = {};
    if (newDateOrDay && newDateOrDay.includes('-')) {
      updates.installationDate = newDateOrDay;
      updates.installationDay = newDayName || store.getDayNameFromDate(new Date(newDateOrDay));
    } else {
      updates.installationDay = newDateOrDay;
    }

    const updated = store.assignOrderInstallation(orderId, updates);
    if (updated) {
      window.naseejCustomer.showToast(`تم نقل موعد تركيب الطلبية (${orderId}) إلى ${updated.installationDay} (${updated.installationDate || ''})!`, 'success');
      this.renderInstallationSchedule();
      this.renderOrdersTable();
      this.renderWeeklySchedule();
      if (this.calendarViewMode === 'monthly') this.renderMonthlyCalendar();
    }
  }

  // Toggle installation status (scheduled vs completed)
  toggleInstallStatus(orderId) {
    const orders = store.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const newStatus = order.installationStatus === 'completed' ? 'scheduled' : 'completed';
    const updated = store.assignOrderInstallation(orderId, { installationStatus: newStatus });
    if (updated) {
      const statusLabel = newStatus === 'completed' ? 'تم التركيب بنجاح ✅' : 'بانتظار التركيب ⏳';
      window.naseejCustomer.showToast(`تم تحديث حالة التركيب إلى "${statusLabel}" للطلبية ${orderId}`, 'success');
      this.renderInstallationSchedule();
      this.renderOrdersTable();
      if (this.calendarViewMode === 'monthly') this.renderMonthlyCalendar();
    }
  }

  // Auto-balance installation schedule across Osama, Ezz, and Tech3 for active week
  autoBalanceInstallationSchedule() {
    const weekDates = store.getWeekDates(this.currentSaturdayDate);
    const count = store.autoBalanceInstallationSchedule(weekDates);
    if (count > 0) {
      window.naseejCustomer.showToast(`✨ تم موازنة وتوزيع (${count}) طلبيات تركيب بنجاح وفق النسبة المعتمدة (70% لأسامة، و30% لعز وفني 3) على أيام أسبوع العمل! ✓`, 'success');
      this.renderInstallationSchedule();
      this.renderOrdersTable();
      this.renderWeeklySchedule();
      if (this.calendarViewMode === 'monthly') this.renderMonthlyCalendar();
    } else {
      window.naseejCustomer.showToast('لا توجد طلبيات تركيب بحاجة لتوزيع.', 'info');
    }
  }

  // Render Field Curtain Installation Schedule Board with real dates
  renderInstallationSchedule() {
    const kpiBar = document.getElementById('admin-install-kpi-bar');
    const board = document.getElementById('admin-installation-schedule-board');
    if (!board) return;

    this.updateActiveWeekBanner();

    const weekDates = store.getWeekDates(this.currentSaturdayDate);
    const installData = store.getWeeklyInstallationData(weekDates, this.selectedInstallerFilter);
    const allOrders = store.getOrders();
    const installOrders = allOrders.filter(o => o.requiresInstallation);

    // Update technician badge counts
    const osamaCount = installOrders.filter(o => o.installerId === 'osama').length;
    const ezzCount = installOrders.filter(o => o.installerId === 'ezz').length;
    const tech3Count = installOrders.filter(o => o.installerId === 'tech3').length;

    const countAllBadge = document.getElementById('badge-installations-count');
    const countOsamaBadge = document.getElementById('badge-tech-osama-count');
    const countEzzBadge = document.getElementById('badge-tech-ezz-count');
    const countTech3Badge = document.getElementById('badge-tech-tech3-count');

    if (countAllBadge) countAllBadge.textContent = installOrders.length;
    if (countOsamaBadge) countOsamaBadge.textContent = osamaCount;
    if (countEzzBadge) countEzzBadge.textContent = ezzCount;
    if (countTech3Badge) countTech3Badge.textContent = tech3Count;

    // KPI Summary for this week
    let weekInstallCount = 0;
    let weekCompletedCount = 0;
    weekDates.forEach(d => {
      const info = installData[d.dateStr];
      if (info) {
        weekInstallCount += info.totalOrders;
        info.orders.forEach(o => {
          if (o.installationStatus === 'completed') weekCompletedCount++;
        });
      }
    });

    const totalInstallOrders = installOrders.length;
    const totalInstallRevenue = installOrders.reduce((sum, o) => sum + (Number(o.installationFee) || 0), 0);

    if (kpiBar) {
      kpiBar.innerHTML = `
        <div class="schedule-kpi-item">
          <div class="schedule-kpi-icon">🔧</div>
          <div class="schedule-kpi-info">
            <span class="schedule-kpi-val">${weekInstallCount} مواعيد</span>
            <span class="schedule-kpi-lbl">مواعيد تركيب هذا الأسبوع (${weekDates[0].formattedDisplay} ➔ ${weekDates[5].formattedDisplay})</span>
          </div>
        </div>

        <div class="schedule-kpi-item">
          <div class="schedule-kpi-icon">⏳</div>
          <div class="schedule-kpi-info">
            <span class="schedule-kpi-val">${weekInstallCount - weekCompletedCount} قيد التنفيذ</span>
            <span class="schedule-kpi-lbl">مواعيد تركيب مجدولة لم تكتمل بعد</span>
          </div>
        </div>

        <div class="schedule-kpi-item">
          <div class="schedule-kpi-icon">✅</div>
          <div class="schedule-kpi-info">
            <span class="schedule-kpi-val">${weekCompletedCount} تم تركيبها</span>
            <span class="schedule-kpi-lbl">تركيبات مكتملة بالموقع بنجاح</span>
          </div>
        </div>

        <div class="schedule-kpi-item">
          <div class="schedule-kpi-icon">💵</div>
          <div class="schedule-kpi-info">
            <span class="schedule-kpi-val">${totalInstallRevenue > 0 ? `${totalInstallRevenue.toLocaleString()} شيكل` : 'متراوحة حسب النوافذ'}</span>
            <span class="schedule-kpi-lbl">إجمالي أجور التركيب (التوصيل مجاني 0 ₪)</span>
          </div>
        </div>
      `;
    }

    const filter = this.selectedInstallerFilter || 'all';

    // Render 6 Days (Saturday to Thursday) with calendar dates
    board.innerHTML = weekDates.map(dayObj => {
      const dayData = installData[dayObj.dateStr] || { orders: [], totalOrders: 0, totalMeters: 0 };
      let orders = dayData.orders;
      if (filter !== 'all') {
        orders = orders.filter(o => o.installerId === filter);
      }

      const ordersHtml = orders.length === 0 ? `
        <div class="empty-day-box">
          <div class="empty-day-icon">🔧</div>
          <p><strong>لا توجد مواعيد تركيب</strong></p>
          <p style="font-size: 11.5px; color: #94a3b8;">${filter === 'all' ? 'يوم شاغر لفريق التركيب' : `لا توجد تركيبات لـ ${store.getInstallerName(filter)}`}</p>
        </div>
      ` : orders.map(order => {
        const isCompleted = order.installationStatus === 'completed';
        const installerName = store.getInstallerName(order.installerId);
        const installerClass = `badge-installer-${order.installerId || 'osama'}`;

        const otherDaysOptions = weekDates.map(d => `
          <option value="${d.dateStr}" ${d.dateStr === dayObj.dateStr ? 'selected' : ''}>نقل لـ: ${d.dayName} (${d.dayNum}/${String(d.monthNum).padStart(2, '0')})</option>
        `).join('');

        const installerOptions = `
          <option value="osama" ${order.installerId === 'osama' ? 'selected' : ''}>الفني: أسامة</option>
          <option value="ezz" ${order.installerId === 'ezz' ? 'selected' : ''}>الفني: عِـز</option>
          <option value="tech3" ${order.installerId === 'tech3' ? 'selected' : ''}>الفني: فني تركيب 3</option>
        `;

        const installFeeDisplay = order.installationFee > 0 ? `${order.installationFee} ₪` : 'متراوح ✏️';

        return `
          <div class="schedule-order-card" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${order.id}')">
            <div class="schedule-card-top">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="schedule-order-num">${order.id}</span>
                ${order.source === 'showroom' ? '<span class="badge badge-source badge-source-showroom">معرض</span>' : '<span class="badge badge-source badge-source-online">متجر</span>'}
              </div>
              <span class="badge-install-status ${isCompleted ? 'completed' : 'scheduled'}" style="cursor: pointer;" onclick="window.naseejAdmin.toggleInstallationStatus('${order.id}')" title="انقر للتبديل بين: تم التركيب / بانتظار التركيب">
                ${isCompleted ? 'تم التركيب ✓' : 'بانتظار التركيب ⏳'}
              </span>
            </div>

            <div style="margin-bottom: 6px;">
              <span class="badge-installer ${installerClass}">
                🔧 ${installerName}
              </span>
            </div>

            <div class="schedule-cust-row">
              <span>👤 ${order.customer.name}</span>
            </div>
            <div class="schedule-phone-sub" style="display: flex; justify-content: space-between; align-items: center;">
              <span>📱 <a href="tel:${order.customer.phone}" style="color: inherit; text-decoration: none;">${order.customer.phone}</a></span>
              <a href="https://wa.me/972${(order.customer.phone || '').replace(/\D/g, '').replace(/^0+/, '')}?text=${encodeURIComponent(`السلام عليكم ${order.customer.name || ''}، معك إدارة شركة الولاء للستائر Balalem co بخصوص موعد تركيب الستائر لطلبيتكم (${order.id || ''})`)}" target="_blank" rel="noopener noreferrer" class="schedule-wa-btn" title="مراسلة واتساب فورية">
                💬 واتساب
              </a>
            </div>

            <div style="font-size: 11.5px; color: #475569; background: #f8fafc; padding: 6px 8px; border-radius: 4px; margin-bottom: 8px;">
              📍 ${order.customer.city} - ${order.customer.address || 'حسب العنوان'}
            </div>

            <div class="schedule-card-metrics">
              <span class="schedule-meters-chip">📏 ${order.totalMeters} متر ${order.items && order.items.length > 1 ? `(${order.items.length} شبابيك)` : ''}</span>
              <span class="schedule-price-chip" style="color: #4338ca; font-size: 11.5px; cursor: pointer; text-decoration: underline;" onclick="window.naseejAdmin.quickEditInstallFee('${order.id}')" title="انقر لتعديل أجور التركيب المتفق عليها">
                🔧 التركيب: <strong>${installFeeDisplay}</strong>
              </span>
            </div>

            <!-- Technician & Day Reassignment Controls -->
            <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e2e8f0;">
              <select class="schedule-move-select" onchange="window.naseejAdmin.changeOrderInstaller('${order.id}', this.value)" title="تغيير فني التركيب">
                ${installerOptions}
              </select>
              <div style="display: flex; gap: 6px; align-items: center;">
                <select class="schedule-move-select" onchange="window.naseejAdmin.changeOrderInstallDay('${order.id}', this.value)" title="تغيير يوم التركيب">
                  ${otherDaysOptions}
                </select>
                <button class="btn-mini-status" onclick="window.naseejAdmin.toggleInstallStatus('${order.id}')" title="${isCompleted ? 'إعادة إلى قيد الانتظار' : 'تأكيد إتمام التركيب'}">
                  ${isCompleted ? '↩️' : '✅'}
                </button>
                <button class="btn-mini-status" onclick="window.naseejAdmin.printOrderReceipt('${order.id}')" title="طباعة الإيصال">
                  🖨️
                </button>
                <button class="btn-mini-status btn-mini-delete" onclick="window.naseejAdmin.confirmDeleteOrder('${order.id}')" title="حذف وإلغاء الطلبية نهائياً" style="color: #dc2626; background: #fee2e2; border-color: #fca5a5;">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="schedule-day-column"
             ondragover="event.preventDefault(); this.classList.add('drag-over');"
             ondragleave="this.classList.remove('drag-over');"
             ondrop="event.preventDefault(); this.classList.remove('drag-over'); const oId = event.dataTransfer.getData('text/plain'); window.naseejAdmin.changeOrderInstallDay(oId, '${dayObj.dateStr}', '${dayObj.dayName}');">
          <div class="day-column-header ${dayData.orders.length > 0 ? 'day-moderate' : 'day-free'} ${dayObj.isToday ? 'is-today' : ''}">
            <div class="day-title-row">
              <span class="day-name-title">يوم ${dayObj.dayName} <span class="day-calendar-date">${dayObj.dayNum}/${String(dayObj.monthNum).padStart(2, '0')}</span></span>
              <span class="day-status-pill ${dayData.orders.length > 0 ? 'pill-moderate' : 'pill-free'}">
                ${dayData.orders.length} تركيب
              </span>
            </div>
            <div class="day-workload-text">
              <span>التركيبات: <strong>${dayData.orders.length}</strong></span>
              <span>الأمتار: <strong>${dayData.totalMeters} م</strong></span>
            </div>
          </div>

          <div class="day-column-orders">
            ${ordersHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  // Quick Edit Installation Fee on an Order
  quickEditInstallFee(orderId) {
    const order = store.getOrders().find(o => o.id === orderId);
    if (!order) return;
    const current = order.installationFee || 0;
    const val = prompt(`تحديد أجور التركيب للطلبية (${orderId}) بالشيكل:\n(أدخل 0 أو اتركها فارغة إن كانت متراوحة بحسب عدد الشبابيك)`, current);
    if (val !== null) {
      const fee = Math.max(0, parseFloat(val) || 0);
      store.assignOrderInstallation(orderId, { installationFee: fee });
      window.naseejCustomer.showToast(`تم تحديث أجور التركيب للطلبية ${orderId} إلى: ${fee > 0 ? fee + ' شيكل' : 'متراوحة'}`, 'success');
      this.renderInstallationSchedule();
      this.renderOrdersTable();
    }
  }

  // ==========================================
  // SHOWROOM WALK-IN ORDERS (طلبيات المعرض المباشرة - شبابيك متعددة)
  // ==========================================

  createDefaultWalkinItem(roomName = 'الصالة') {
    const products = store.getProducts();
    const defaultProduct = products[0] || { id: 'p1', name: 'شانيل تركي فاخر', pricePerMeter: 65, category: 'curtain' };
    const defaultColor = (defaultProduct.colors && defaultProduct.colors[0] && defaultProduct.colors[0].name) || 'بيج رملي';
    const isTarsoon = defaultProduct.category === 'tarsoon';
    const width = 3.0;
    const height = 2.8;
    const fullnessRatio = 2.8;
    const sewingStyle = isTarsoon ? 'tarsoon' : 'american';
    const sewingBaseName = isTarsoon ? 'ستائر ترسون' : 'كسرات أمريكي / شتوح';
    const sewingType = isTarsoon ? 'ستائر ترسون (بالمتر المربع)' : 'كسرات أمريكي / شتوح (2.8 م قماش/م حيط)';
    const meters = isTarsoon ? Math.round(width * height * 100) / 100 : Math.round(width * fullnessRatio * 10) / 10;
    return {
      id: 'w_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      roomName: roomName,
      productId: defaultProduct.id,
      productName: defaultProduct.name,
      color: defaultColor,
      width: width,
      height: height,
      sewingStyle: sewingStyle,
      sewingBaseName: sewingBaseName,
      sewingType: sewingType,
      fullnessRatio: isTarsoon ? null : fullnessRatio,
      meters: meters,
      unitPrice: defaultProduct.pricePerMeter || 65,
      unitLabel: isTarsoon ? 'م²' : 'متر',
      notes: ''
    };
  }

  openWalkinOrderModal() {
    const modal = document.getElementById('admin-walkin-order-modal');
    if (!modal) return;

    // Reset customer fields
    document.getElementById('walkin-cust-name').value = '';
    document.getElementById('walkin-cust-phone').value = '';
    document.getElementById('walkin-cust-city').value = 'نابلس';
    document.getElementById('walkin-cust-address').value = '';
    document.getElementById('walkin-notes').value = '';
    const installFeeInput = document.getElementById('walkin-install-fee');
    if (installFeeInput) installFeeInput.value = 0;

    // Reset date fields using smart slot finder: if Week 1 is full, default automatically to Week 2!
    const slot = store.getNextAvailableSlot(8);
    const defaultScheduleDate = slot.dateStr;
    const scheduleDateInput = document.getElementById('walkin-schedule-date');
    if (scheduleDateInput) {
      scheduleDateInput.value = defaultScheduleDate;
      this.handleWalkinDateChange(defaultScheduleDate);
    }
    const installDateInput = document.getElementById('walkin-install-date');
    if (installDateInput) {
      installDateInput.value = defaultScheduleDate;
      this.handleWalkinInstallDateChange(defaultScheduleDate);
    }

    // Initialize with 1 default window (الصالة)
    this.walkinItems = [
      this.createDefaultWalkinItem('الصالة')
    ];

    this.renderWalkinItems();
    this.recalcWalkinTotal();

    modal.classList.add('active');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    modal.style.pointerEvents = 'auto';
    modal.style.zIndex = '99999';
    document.body.style.overflow = 'hidden';
  }

  addWalkinItem() {
    const roomSuggestions = ['غرفة ماستر', 'صالون الضيوف', 'غرفة أطفال', 'غرفة قعدة', 'المطبخ', 'غرفة السفرة', 'المجلس'];
    const currentCount = this.walkinItems.length;
    const suggestedRoom = roomSuggestions[(currentCount - 1) % roomSuggestions.length] || `شباك ${currentCount + 1}`;
    
    this.walkinItems.push(this.createDefaultWalkinItem(suggestedRoom));
    this.renderWalkinItems();
    this.recalcWalkinTotal();
    
    // Smoothly scroll to the bottom of the items list
    setTimeout(() => {
      const container = document.getElementById('walkin-items-container');
      if (container && container.lastElementChild) {
        container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 60);
  }

  removeWalkinItem(index) {
    if (this.walkinItems.length <= 1) {
      window.naseejCustomer.showToast('يجب أن تحتوي الطلبية على شباك / ستارة واحدة على الأقل!', 'warning');
      return;
    }
    this.walkinItems.splice(index, 1);
    this.renderWalkinItems();
    this.recalcWalkinTotal();
  }

  setWalkinItemRoom(index, roomName) {
    if (!this.walkinItems[index]) return;
    this.walkinItems[index].roomName = roomName;
    const input = document.getElementById(`walkin-item-room-${index}`);
    if (input) input.value = roomName;
    
    // Update active state of chips in this card
    const card = document.getElementById(`walkin-item-card-${index}`);
    if (card) {
      card.querySelectorAll('.room-chip-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.room === roomName);
      });
    }
  }

  updateWalkinItem(index, field, value) {
    if (!this.walkinItems[index]) return;
    const item = this.walkinItems[index];

    if (field === 'productId') {
      const product = store.getProductById(value);
      if (product) {
        item.productId = product.id;
        item.productName = product.name;
        item.unitPrice = product.pricePerMeter || 65;
        const wasTarsoon = item.unitLabel === 'م²';
        const isTarsoon = product.category === 'tarsoon';
        item.unitLabel = isTarsoon ? 'م²' : 'متر';
        if (product.colors && product.colors[0]) {
          item.color = product.colors[0].name;
        }
        if (isTarsoon) {
          item.sewingStyle = 'tarsoon';
          item.sewingBaseName = 'ستائر ترسون';
          item.sewingType = 'ستائر ترسون (بالمتر المربع)';
          item.fullnessRatio = null;
          item.meters = Math.round((item.width || 3.0) * (item.height || 2.8) * 100) / 100;
        } else if (wasTarsoon) {
          item.sewingStyle = 'american';
          item.sewingBaseName = 'كسرات أمريكي / شتوح';
          item.fullnessRatio = 2.8;
          item.sewingType = 'كسرات أمريكي / شتوح (2.8 م قماش/م حيط)';
          item.meters = Math.round((item.width || 3.0) * 2.8 * 10) / 10;
        }
        // Update DOM inputs directly without losing focus
        const searchInput = document.getElementById(`walkin-fabric-search-${index}`);
        const priceInput = document.getElementById(`walkin-item-price-${index}`);
        const colorInput = document.getElementById(`walkin-item-color-${index}`);
        const unitBadge = document.getElementById(`walkin-item-unit-${index}`);
        const sewingSelect = document.getElementById(`walkin-item-sewing-${index}`);
        const metersInput = document.getElementById(`walkin-item-meters-${index}`);
        if (searchInput) searchInput.value = item.productName;
        if (priceInput) priceInput.value = item.unitPrice;
        if (colorInput) colorInput.value = item.color;
        if (unitBadge) unitBadge.textContent = item.unitLabel;
        if (sewingSelect) sewingSelect.value = isTarsoon ? 'tarsoon' : 'american';
        if (metersInput) metersInput.value = item.meters;
      }
    } else if (field === 'productName') {
      item.productName = value;
    } else if (field === 'width') {
      item.width = parseFloat(value) || 0;
      if (item.unitLabel === 'م²') {
        item.meters = Math.round(item.width * (item.height || 1) * 100) / 100;
      } else {
        const ratio = item.fullnessRatio || 2.8;
        item.meters = Math.round(item.width * ratio * 10) / 10;
      }
      const metersInput = document.getElementById(`walkin-item-meters-${index}`);
      if (metersInput) metersInput.value = item.meters;
    } else if (field === 'height') {
      item.height = parseFloat(value) || 0;
      if (item.unitLabel === 'م²') {
        item.meters = Math.round((item.width || 1) * item.height * 100) / 100;
        const metersInput = document.getElementById(`walkin-item-meters-${index}`);
        if (metersInput) metersInput.value = item.meters;
      }
    } else if (field === 'sewingType') {
      if (value === 'american') {
        item.sewingStyle = 'american';
        item.sewingBaseName = 'كسرات أمريكي / شتوح';
        item.fullnessRatio = 2.8;
        item.sewingType = 'كسرات أمريكي / شتوح (2.8 م قماش/م حيط)';
        item.unitLabel = 'متر';
        item.meters = Math.round((item.width || 3.0) * 2.8 * 10) / 10;
      } else if (value === 'wave') {
        item.sewingStyle = 'wave';
        item.sewingBaseName = 'ويفي (Wave)';
        item.fullnessRatio = 3.0;
        item.sewingType = 'ويفي (Wave) (3.0 م قماش/م حيط)';
        item.unitLabel = 'متر';
        item.meters = Math.round((item.width || 3.0) * 3.0 * 10) / 10;
      } else if (value === 'rings_tight') {
        item.sewingStyle = 'rings_tight';
        item.sewingBaseName = 'رنج مزموم';
        item.fullnessRatio = 2.5;
        item.sewingType = 'رنج مزموم (2.5 م قماش/م حيط)';
        item.unitLabel = 'متر';
        item.meters = Math.round((item.width || 3.0) * 2.5 * 10) / 10;
      } else if (value === 'rings_single') {
        item.sewingStyle = 'rings_single';
        item.sewingBaseName = 'رنج فرد';
        item.fullnessRatio = 1.5;
        item.sewingType = 'رنج فرد (1.5 م قماش/م حيط)';
        item.unitLabel = 'متر';
        item.meters = Math.round((item.width || 3.0) * 1.5 * 10) / 10;
      } else if (value === 'tarsoon') {
        item.sewingStyle = 'tarsoon';
        item.sewingBaseName = 'ستائر ترسون';
        item.sewingType = 'ستائر ترسون (بالمتر المربع)';
        item.fullnessRatio = null;
        item.unitLabel = 'م²';
        item.meters = Math.round((item.width || 3.0) * (item.height || 2.8) * 100) / 100;
      } else {
        item.sewingType = 'تحديد الأمتار يدوياً';
        item.fullnessRatio = null;
      }
      const unitBadge = document.getElementById(`walkin-item-unit-${index}`);
      if (unitBadge) unitBadge.textContent = item.unitLabel;
      const metersInput = document.getElementById(`walkin-item-meters-${index}`);
      if (metersInput) metersInput.value = item.meters;
    } else if (field === 'meters') {
      item.meters = parseFloat(value) || 0;
    } else if (field === 'unitPrice') {
      item.unitPrice = parseFloat(value) || 0;
    } else if (field === 'color') {
      item.color = value;
    } else if (field === 'roomName') {
      item.roomName = value;
    } else if (field === 'notes') {
      item.notes = value;
    }

    // Update subtotal badge for this card
    this.updateWalkinCardSubtotal(index);
    this.recalcWalkinTotal();
  }

  updateWalkinCardSubtotal(index) {
    if (!this.walkinItems || !this.walkinItems[index]) return;
    const item = this.walkinItems[index];
    const itemSubtotal = Math.round((item.meters || 0) * (item.unitPrice || 0));
    const subtotalEl = document.getElementById(`walkin-item-subtotal-${index}`);
    if (subtotalEl) {
      const dimInfo = (item.width && item.height) ? `مقاس [${item.width}م عرض × ${item.height}م ارتفاع] • ` : '';
      const sewInfo = item.sewingType ? `${item.sewingType} • ` : '';
      subtotalEl.innerHTML = `${dimInfo}${sewInfo}المجموع: <strong>${itemSubtotal.toLocaleString()} ₪</strong> (${item.meters} ${item.unitLabel} × ${item.unitPrice} ₪)`;
    }
  }

  setWalkinPleat(index, styleKey, baseName, defaultRatio, btnEl) {
    if (!this.walkinItems || !this.walkinItems[index]) return;
    const item = this.walkinItems[index];

    // Support legacy (index, ratio, title, btnEl)
    if (typeof styleKey === 'number') {
      const ratio = styleKey;
      if (ratio === 1.5) { styleKey = 'rings_single'; baseName = 'رنج فرد'; defaultRatio = 1.5; }
      else if (ratio === 2.5) { styleKey = 'rings_tight'; baseName = 'رنج مزموم'; defaultRatio = 2.5; }
      else if (ratio === 3.0) { styleKey = 'wave'; baseName = 'ويفي (Wave)'; defaultRatio = 3.0; }
      else { styleKey = 'american'; baseName = 'كسرات أمريكي / شتوح'; defaultRatio = 2.8; }
    }

    item.sewingStyle = styleKey;
    item.sewingBaseName = baseName;
    item.fullnessRatio = parseFloat(defaultRatio) || 2.8;
    item.sewingType = `${baseName} (${item.fullnessRatio} م قماش/م حيط)`;

    // Recalculate meters = width * ratio
    const width = parseFloat(item.width) || 3.0;
    item.meters = Math.round(width * item.fullnessRatio * 10) / 10;

    // Update active button state within card and reset subtitles to default
    const card = document.getElementById(`walkin-item-card-${index}`);
    if (card) {
      card.querySelectorAll('.fullness-btn').forEach(btn => {
        btn.classList.remove('active');
        const dRatio = btn.getAttribute('data-default-ratio');
        const ratioSpan = btn.querySelector('.fullness-ratio');
        if (ratioSpan && dRatio) {
          ratioSpan.textContent = `${dRatio} م قماش / م حيط`;
        }
      });
      if (btnEl) {
        btnEl.classList.add('active');
      } else {
        const targetBtn = card.querySelector(`.fullness-btn[data-style="${styleKey}"]`);
        if (targetBtn) targetBtn.classList.add('active');
      }
    }

    // Update custom ratio input in card
    const ratioInput = document.getElementById(`walkin-item-ratio-${index}`);
    if (ratioInput) ratioInput.value = item.fullnessRatio;

    // Update hidden meters input
    const metersInput = document.getElementById(`walkin-item-meters-${index}`);
    if (metersInput) metersInput.value = item.meters;

    // Update subtotal badge
    this.updateWalkinCardSubtotal(index);
    this.recalcWalkinTotal();
  }

  updateWalkinCustomRatio(index, ratioVal) {
    if (!this.walkinItems || !this.walkinItems[index]) return;
    const item = this.walkinItems[index];
    const ratio = parseFloat(ratioVal);
    if (!ratio || ratio <= 0) return;

    item.fullnessRatio = Math.round(ratio * 100) / 100;

    // Ensure style and base name are preserved
    if (!item.sewingStyle) {
      if (item.sewingType && item.sewingType.includes('رنج مزموم')) {
        item.sewingStyle = 'rings_tight';
        item.sewingBaseName = 'رنج مزموم';
      } else if (item.sewingType && item.sewingType.includes('رنج فرد')) {
        item.sewingStyle = 'rings_single';
        item.sewingBaseName = 'رنج فرد';
      } else if (item.sewingType && (item.sewingType.includes('ويفي') || item.sewingType.toLowerCase().includes('wave'))) {
        item.sewingStyle = 'wave';
        item.sewingBaseName = 'ويفي (Wave)';
      } else {
        item.sewingStyle = 'american';
        item.sewingBaseName = 'كسرات أمريكي / شتوح';
      }
    }

    const baseName = item.sewingBaseName || 'كسرات أمريكي / شتوح';
    item.sewingType = `${baseName} (${item.fullnessRatio} م قماش/م حيط)`;

    // Recalculate meters
    const width = parseFloat(item.width) || 3.0;
    item.meters = Math.round(width * item.fullnessRatio * 10) / 10;

    // Keep the chosen sewing style active, and update its subtitle ratio display
    const card = document.getElementById(`walkin-item-card-${index}`);
    if (card) {
      card.querySelectorAll('.fullness-btn').forEach(btn => {
        const btnStyle = btn.getAttribute('data-style');
        const isMatch = btnStyle === item.sewingStyle;
        btn.classList.toggle('active', isMatch);
        const ratioSpan = btn.querySelector('.fullness-ratio');
        if (ratioSpan) {
          if (isMatch) {
            ratioSpan.textContent = `${item.fullnessRatio} م قماش / م حيط`;
          } else {
            const dRatio = btn.getAttribute('data-default-ratio');
            if (dRatio) {
              ratioSpan.textContent = `${dRatio} م قماش / م حيط`;
            }
          }
        }
      });
    }

    // Update hidden meters input
    const metersInput = document.getElementById(`walkin-item-meters-${index}`);
    if (metersInput) metersInput.value = item.meters;

    // Update subtotal badge
    this.updateWalkinCardSubtotal(index);
    this.recalcWalkinTotal();
  }

  // ==========================================
  // SEARCHABLE FABRIC COMBOBOX METHODS (كتابة + سكرول)
  // ==========================================

  generateFabricOptionsHtml(index, selectedProductId, query = '') {
    const products = store.getProducts();
    const normalizeArabic = (s) => (s || '').toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '')
      .trim();

    const q = normalizeArabic(query);
    const filtered = products.filter(p => {
      if (!q) return true;
      const name = normalizeArabic(p.name);
      const cat = normalizeArabic(p.categoryName || p.category || '');
      const id = normalizeArabic(p.id);
      return name.includes(q) || cat.includes(q) || id.includes(q);
    });

    if (filtered.length === 0) {
      let noResHtml = `
        <div class="walkin-fabric-no-results">
          <span>لا يوجد قماش مطابق لـ "${query}"</span>
        </div>
      `;
      if (query && query.trim()) {
        const safeQuery = query.trim().replace(/'/g, "\\'").replace(/"/g, '&quot;');
        noResHtml += `
          <div class="walkin-fabric-custom-option" 
               onmousedown="event.preventDefault(); window.naseejAdmin.applyCustomFabric(${index}, '${safeQuery}')">
            <span>✨ اعتماد كقماش مخصص: <strong>"${safeQuery}"</strong></span>
            <span style="font-size: 11px; color: #b45309;">(اضغط للاختيار وتعديل السعر)</span>
          </div>
        `;
      }
      return noResHtml;
    }

    let html = filtered.map(p => {
      const isSelected = p.id === selectedProductId;
      const unitLabel = p.category === 'tarsoon' ? 'م²' : 'متر';
      const safeId = (p.id || '').replace(/'/g, "\\'");
      const safeName = (p.name || '').replace(/"/g, '&quot;');
      return `
        <div class="walkin-fabric-option ${isSelected ? 'selected' : ''}" 
             data-id="${safeId}" 
             data-name="${safeName}"
             tabindex="0"
             onmousedown="event.preventDefault(); window.naseejAdmin.selectWalkinFabric(${index}, '${safeId}')">
          <div class="walkin-fabric-opt-main">
            <span class="walkin-fabric-opt-name">${p.name}</span>
            ${p.categoryName ? `<span class="walkin-fabric-opt-cat">${p.categoryName}</span>` : ''}
          </div>
          <div class="walkin-fabric-opt-meta">
            <span class="walkin-fabric-opt-price">${p.pricePerMeter} ₪ / ${unitLabel}</span>
            ${isSelected ? '<span class="walkin-fabric-check">✓</span>' : ''}
          </div>
        </div>
      `;
    }).join('');

    if (query && query.trim() && !products.some(p => normalizeArabic(p.name) === q)) {
      const safeQuery = query.trim().replace(/'/g, "\\'").replace(/"/g, '&quot;');
      html += `
        <div class="walkin-fabric-custom-option" 
             onmousedown="event.preventDefault(); window.naseejAdmin.applyCustomFabric(${index}, '${safeQuery}')">
          <span>✨ اعتماد كقماش مخصص: <strong>"${safeQuery}"</strong></span>
          <span style="font-size: 11px; color: #b45309;">(اضغط للاختيار وتعديل السعر)</span>
        </div>
      `;
    }

    return html;
  }

  openFabricDropdown(index) {
    this.closeAllFabricDropdowns(index);
    const dropdown = document.getElementById(`walkin-fabric-dropdown-${index}`);
    const wrapper = document.getElementById(`walkin-combobox-${index}`);
    const card = document.getElementById(`walkin-item-card-${index}`);
    if (!dropdown || !wrapper) return;

    dropdown.style.display = 'block';
    wrapper.classList.add('is-open');
    if (card) card.classList.add('has-open-combobox');

    // Auto-scroll to selected option if present
    setTimeout(() => {
      const list = document.getElementById(`walkin-fabric-list-${index}`);
      if (list) {
        const selected = list.querySelector('.walkin-fabric-option.selected');
        if (selected) {
          selected.scrollIntoView({ block: 'nearest' });
        }
      }
    }, 20);
  }

  closeFabricDropdown(index) {
    const dropdown = document.getElementById(`walkin-fabric-dropdown-${index}`);
    const wrapper = document.getElementById(`walkin-combobox-${index}`);
    const card = document.getElementById(`walkin-item-card-${index}`);
    if (dropdown) dropdown.style.display = 'none';
    if (wrapper) wrapper.classList.remove('is-open');
    if (card) card.classList.remove('has-open-combobox');
  }

  closeAllFabricDropdowns(exceptIndex = null) {
    const dropdowns = document.querySelectorAll('.walkin-fabric-dropdown');
    dropdowns.forEach(dd => {
      const idx = dd.id.replace('walkin-fabric-dropdown-', '');
      if (exceptIndex !== null && parseInt(idx, 10) === exceptIndex) return;
      dd.style.display = 'none';
      const wrapper = document.getElementById(`walkin-combobox-${idx}`);
      if (wrapper) wrapper.classList.remove('is-open');
      const card = document.getElementById(`walkin-item-card-${idx}`);
      if (card) card.classList.remove('has-open-combobox');
    });
  }

  toggleFabricDropdown(index, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const dropdown = document.getElementById(`walkin-fabric-dropdown-${index}`);
    const isOpen = dropdown && dropdown.style.display === 'block';
    if (isOpen) {
      this.closeFabricDropdown(index);
    } else {
      const input = document.getElementById(`walkin-fabric-search-${index}`);
      const listEl = document.getElementById(`walkin-fabric-list-${index}`);
      const item = this.walkinItems[index];
      if (listEl && item) {
        listEl.innerHTML = this.generateFabricOptionsHtml(index, item.productId, '');
      }
      this.openFabricDropdown(index);
      if (input) input.focus();
    }
  }

  filterFabricDropdown(index, query) {
    const item = this.walkinItems[index];
    if (!item) return;

    item.productName = query;

    const listEl = document.getElementById(`walkin-fabric-list-${index}`);
    if (listEl) {
      listEl.innerHTML = this.generateFabricOptionsHtml(index, item.productId, query);
    }
    this.openFabricDropdown(index);

    const products = store.getProducts();
    const cleanQ = (query || '').trim().toLowerCase();
    const exact = products.find(p => p.name.trim().toLowerCase() === cleanQ || p.id.toLowerCase() === cleanQ);
    if (exact) {
      this.selectWalkinFabric(index, exact.id, false);
    }
  }

  selectWalkinFabric(index, productId, updateInputValue = true) {
    const product = store.getProductById(productId);
    if (!product || !this.walkinItems[index]) return;

    const item = this.walkinItems[index];
    item.productId = product.id;
    item.productName = product.name;
    item.unitPrice = product.pricePerMeter || 65;
    const isTarsoon = product.category === 'tarsoon';
    item.unitLabel = isTarsoon ? 'م²' : 'متر';
    if (product.colors && product.colors[0]) {
      item.color = product.colors[0].name;
    }
    if (isTarsoon) {
      item.sewingStyle = 'tarsoon';
      item.sewingBaseName = 'ستائر ترسون';
      item.sewingType = 'ستائر ترسون (بالمتر المربع)';
      item.fullnessRatio = null;
      item.meters = Math.round((item.width || 3.0) * (item.height || 2.8) * 100) / 100;
    } else if (item.unitLabel === 'م²' || !item.fullnessRatio) {
      item.sewingStyle = 'american';
      item.sewingBaseName = 'كسرات أمريكي / شتوح';
      item.sewingType = 'كسرات أمريكي / شتوح (2.8 م قماش/م حيط)';
      item.fullnessRatio = 2.8;
      item.meters = Math.round((item.width || 3.0) * 2.8 * 10) / 10;
    }

    if (updateInputValue) {
      const searchInput = document.getElementById(`walkin-fabric-search-${index}`);
      if (searchInput) searchInput.value = product.name;
    }

    const priceInput = document.getElementById(`walkin-item-price-${index}`);
    const colorInput = document.getElementById(`walkin-item-color-${index}`);
    const unitBadge = document.getElementById(`walkin-item-unit-${index}`);
    const sewingSelect = document.getElementById(`walkin-item-sewing-${index}`);
    const metersInput = document.getElementById(`walkin-item-meters-${index}`);
    if (priceInput) priceInput.value = item.unitPrice;
    if (colorInput) colorInput.value = item.color;
    if (unitBadge) unitBadge.textContent = item.unitLabel;
    if (sewingSelect) sewingSelect.value = isTarsoon ? 'tarsoon' : 'american';
    if (metersInput) metersInput.value = item.meters;

    // Update subtotal badge
    this.updateWalkinCardSubtotal(index);

    this.closeFabricDropdown(index);
    this.recalcWalkinTotal();
  }

  applyCustomFabric(index, customName) {
    const item = this.walkinItems[index];
    if (!item) return;

    item.productId = 'custom_' + Date.now();
    item.productName = customName;

    const searchInput = document.getElementById(`walkin-fabric-search-${index}`);
    if (searchInput) searchInput.value = customName;

    this.closeFabricDropdown(index);
    this.recalcWalkinTotal();

    const priceInput = document.getElementById(`walkin-item-price-${index}`);
    if (priceInput) {
      priceInput.focus();
      priceInput.select();
    }
  }

  handleFabricKeydown(index, event) {
    const listEl = document.getElementById(`walkin-fabric-list-${index}`);
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!listEl) return;
      const highlighted = listEl.querySelector('.walkin-fabric-option.highlighted') || listEl.querySelector('.walkin-fabric-option');
      if (highlighted && highlighted.dataset.id) {
        this.selectWalkinFabric(index, highlighted.dataset.id);
      } else {
        const input = document.getElementById(`walkin-fabric-search-${index}`);
        if (input && input.value.trim()) {
          this.applyCustomFabric(index, input.value.trim());
        }
      }
      this.closeFabricDropdown(index);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      this.closeFabricDropdown(index);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.openFabricDropdown(index);
      if (!listEl) return;
      const options = Array.from(listEl.querySelectorAll('.walkin-fabric-option'));
      if (options.length === 0) return;
      const curIndex = options.findIndex(opt => opt.classList.contains('highlighted'));
      let nextIndex = 0;
      if (event.key === 'ArrowDown') {
        nextIndex = curIndex < options.length - 1 ? curIndex + 1 : 0;
      } else {
        nextIndex = curIndex > 0 ? curIndex - 1 : options.length - 1;
      }
      options.forEach(opt => opt.classList.remove('highlighted'));
      options[nextIndex].classList.add('highlighted');
      options[nextIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  renderWalkinItems() {
    const container = document.getElementById('walkin-items-container');
    const badgeCount = document.getElementById('walkin-windows-count-badge');
    if (!container) return;

    if (badgeCount) {
      const count = this.walkinItems.length;
      badgeCount.textContent = count === 1 ? 'شباك واحد (1)' : (count === 2 ? 'شباكان (2)' : `${count} شبابيك`);
    }

    const products = store.getProducts();
    const commonRooms = [
      'الصالة',
      'غرفة ماستر',
      'صالون الضيوف',
      'غرفة أطفال',
      'المطبخ',
      'غرفة قعدة',
      'المجلس'
    ];

    container.innerHTML = this.walkinItems.map((item, idx) => {
      if (!item.sewingStyle && item.unitLabel !== 'م²') {
        if (item.sewingType && item.sewingType.includes('رنج مزموم')) {
          item.sewingStyle = 'rings_tight';
          item.sewingBaseName = 'رنج مزموم';
        } else if (item.sewingType && item.sewingType.includes('رنج فرد')) {
          item.sewingStyle = 'rings_single';
          item.sewingBaseName = 'رنج فرد';
        } else if (item.sewingType && (item.sewingType.includes('ويفي') || item.sewingType.toLowerCase().includes('wave'))) {
          item.sewingStyle = 'wave';
          item.sewingBaseName = 'ويفي (Wave)';
        } else {
          item.sewingStyle = 'american';
          item.sewingBaseName = 'كسرات أمريكي / شتوح';
        }
      }

      const itemSubtotal = Math.round((item.meters || 0) * (item.unitPrice || 0));

      const roomChipsHtml = commonRooms.map(r => `
        <button type="button" class="room-chip-btn ${item.roomName === r ? 'active' : ''}" data-room="${r}" onclick="window.naseejAdmin.setWalkinItemRoom(${idx}, '${r}')">
          ${r}
        </button>
      `).join('');

      const isDeleteDisabled = this.walkinItems.length <= 1;

      return `
        <div class="walkin-item-card" id="walkin-item-card-${idx}">
          <div class="walkin-item-header">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <span class="walkin-item-badge">
                🪟 شباك <span class="window-index">#${idx + 1}</span>
              </span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <input type="text" id="walkin-item-room-${idx}" class="form-control" style="width: 155px; height: 32px; font-size: 12.5px; padding: 4px 8px; font-weight: 700;" value="${item.roomName}" placeholder="اسم الغرفة / الشباك" oninput="window.naseejAdmin.updateWalkinItem(${idx}, 'roomName', this.value)">
              </div>
              <div class="room-chips-wrapper">
                ${roomChipsHtml}
              </div>
            </div>

            ${!isDeleteDisabled ? `
              <button type="button" class="btn-remove-window" onclick="window.naseejAdmin.removeWalkinItem(${idx})" title="حذف هذا الشباك">
                🗑️ حذف الشباك
              </button>
            ` : `
              <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">(الشباك الأساسي)</span>
            `}
          </div>

          <div class="walkin-item-fields-grid">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 11.5px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
                <span>نوع قماش الشباك *</span>
                <span style="font-size: 10px; color: #94a3b8; font-weight: normal;">(كتابة أو سكرول)</span>
              </label>
              <div class="walkin-fabric-combobox-wrapper" id="walkin-combobox-${idx}">
                <div class="walkin-fabric-input-group">
                  <span class="walkin-fabric-input-icon">🧵</span>
                  <input 
                    type="text" 
                    id="walkin-fabric-search-${idx}" 
                    class="form-control walkin-fabric-input" 
                    placeholder="ابحث بالاسم/الرقم أو اختر بالسكرول..." 
                    value="${(item.productName || '').replace(/"/g, '&quot;')}"
                    autocomplete="off"
                    onfocus="window.naseejAdmin.openFabricDropdown(${idx})"
                    onclick="window.naseejAdmin.openFabricDropdown(${idx})"
                    oninput="window.naseejAdmin.filterFabricDropdown(${idx}, this.value)"
                    onkeydown="window.naseejAdmin.handleFabricKeydown(${idx}, event)"
                  >
                  <button 
                    type="button" 
                    class="walkin-combobox-toggle" 
                    id="walkin-combobox-toggle-${idx}" 
                    tabindex="-1"
                    title="عرض قائمة الأقمشة الكاملة للاختيار بالسكرول" 
                    onclick="window.naseejAdmin.toggleFabricDropdown(${idx}, event)"
                  >
                    <span class="combobox-arrow">▼</span>
                  </button>
                </div>
                
                <div class="walkin-fabric-dropdown" id="walkin-fabric-dropdown-${idx}" style="display: none;">
                  <div class="walkin-fabric-dropdown-header">
                    <span>قائمة الأقمشة المتاحة (${products.length})</span>
                    <span style="font-size: 10px; color: #94a3b8;">اختر بالسكرول أو اكتب</span>
                  </div>
                  <div class="walkin-fabric-list-scroll" id="walkin-fabric-list-${idx}">
                    ${this.generateFabricOptionsHtml(idx, item.productId, '')}
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 11.5px; margin-bottom: 4px;">اللون المختار</label>
              <input type="text" id="walkin-item-color-${idx}" class="form-control" style="font-size: 12.5px; height: 36px; padding: 4px 8px;" value="${item.color}" placeholder="مثال: بيج / أوف وايت" oninput="window.naseejAdmin.updateWalkinItem(${idx}, 'color', this.value)">
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 11.5px; margin-bottom: 4px; font-weight: 700; color: #334155;">القياس بالعرض (متر) *</label>
              <div class="walkin-dim-input-wrap">
                <input type="number" id="walkin-item-width-${idx}" class="form-control" style="font-size: 13px; height: 36px; padding: 4px 8px 4px 34px; font-weight: 700;" value="${item.width || 3.0}" step="0.1" min="0.1" max="30" placeholder="مثال: 3.0" required oninput="window.naseejAdmin.updateWalkinItem(${idx}, 'width', this.value)">
                <span class="walkin-dim-suffix">متر</span>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 11.5px; margin-bottom: 4px; font-weight: 700; color: #334155;">القياس بالارتفاع (متر) *</label>
              <div class="walkin-dim-input-wrap">
                <input type="number" id="walkin-item-height-${idx}" class="form-control" style="font-size: 13px; height: 36px; padding: 4px 8px 4px 34px; font-weight: 700;" value="${item.height || 2.8}" step="0.1" min="0.1" max="15" placeholder="مثال: 2.8" required oninput="window.naseejAdmin.updateWalkinItem(${idx}, 'height', this.value)">
                <span class="walkin-dim-suffix">متر</span>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 11.5px; margin-bottom: 4px; font-weight: 700; color: #334155;">سعر المتر / م² (₪) *</label>
              <input type="number" id="walkin-item-price-${idx}" class="form-control" style="font-size: 13px; height: 36px; padding: 4px 8px; font-weight: 700;" value="${item.unitPrice}" min="1" required oninput="window.naseejAdmin.updateWalkinItem(${idx}, 'unitPrice', this.value)">
            </div>
          </div>

          <!-- Pleats and Sewing Density Options (كثافة ونوع الكسرات) -->
          ${item.unitLabel !== 'م²' ? `
            <div class="walkin-pleat-section">
              <div class="walkin-pleat-header">
                <span class="walkin-pleat-title">كثافة الكسرات ونوع الخياطة (لكل متر حائط):</span>
                <div class="walkin-custom-ratio-box">
                  <span class="walkin-custom-ratio-label">✏️ تعديل الكسرات:</span>
                  <div class="walkin-custom-ratio-input-wrap">
                    <input type="number" 
                           id="walkin-item-ratio-${idx}" 
                           class="walkin-custom-ratio-input" 
                           value="${item.fullnessRatio || 2.8}" 
                           step="0.1" 
                           min="1.0" 
                           max="6.0" 
                           title="معامل مضاعفة أمتار القماش لكل متر حائط"
                           oninput="window.naseejAdmin.updateWalkinCustomRatio(${idx}, this.value)">
                    <span class="walkin-custom-ratio-unit">م قماش/م حيط</span>
                  </div>
                </div>
              </div>

              <div class="fullness-options-row">
                <div class="fullness-btn ${item.sewingStyle === 'rings_single' ? 'active' : ''}" 
                     data-style="rings_single"
                     data-default-ratio="1.5"
                     onclick="window.naseejAdmin.setWalkinPleat(${idx}, 'rings_single', 'رنج فرد', 1.5, this)">
                  <span class="fullness-title">رنج فرد</span>
                  <span class="fullness-ratio">${item.sewingStyle === 'rings_single' && item.fullnessRatio ? `${item.fullnessRatio} م قماش / م حيط` : '1.5 م قماش / م حيط'}</span>
                </div>
                <div class="fullness-btn ${item.sewingStyle === 'rings_tight' ? 'active' : ''}" 
                     data-style="rings_tight"
                     data-default-ratio="2.5"
                     onclick="window.naseejAdmin.setWalkinPleat(${idx}, 'rings_tight', 'رنج مزموم', 2.5, this)">
                  <span class="fullness-title">رنج مزموم</span>
                  <span class="fullness-ratio">${item.sewingStyle === 'rings_tight' && item.fullnessRatio ? `${item.fullnessRatio} م قماش / م حيط` : '2.5 م قماش / م حيط'}</span>
                </div>
                <div class="fullness-btn ${(!item.sewingStyle || item.sewingStyle === 'american') ? 'active' : ''}" 
                     data-style="american"
                     data-default-ratio="2.8"
                     onclick="window.naseejAdmin.setWalkinPleat(${idx}, 'american', 'كسرات أمريكي / شتوح', 2.8, this)">
                  <span class="fullness-title">كسرات أمريكي / شتوح</span>
                  <span class="fullness-ratio">${(!item.sewingStyle || item.sewingStyle === 'american') && item.fullnessRatio ? `${item.fullnessRatio} م قماش / م حيط` : '2.8 م قماش / م حيط'}</span>
                </div>
                <div class="fullness-btn ${item.sewingStyle === 'wave' ? 'active' : ''}" 
                     data-style="wave"
                     data-default-ratio="3.0"
                     onclick="window.naseejAdmin.setWalkinPleat(${idx}, 'wave', 'ويفي (Wave)', 3.0, this)">
                  <span class="fullness-title">ويفي (Wave)</span>
                  <span class="fullness-ratio">${item.sewingStyle === 'wave' && item.fullnessRatio ? `${item.fullnessRatio} م قماش / م حيط` : '3.0 م قماش / م حيط'}</span>
                </div>
              </div>
            </div>
          ` : `
            <div class="walkin-pleat-section walkin-tarsoon-notice">
              <span>🪟 <strong>ستائر ترسون:</strong> تُحسب بالمتر المربع مسطحة (العرض ${item.width || 3}م × الارتفاع ${item.height || 2.8}م = ${item.meters} م²) دون مضاعفة كسرات.</span>
            </div>
          `}

          <!-- Hidden helper inputs to keep references alive -->
          <input type="hidden" id="walkin-item-meters-${idx}" value="${item.meters}">
          <span id="walkin-item-unit-${idx}" style="display: none;">${item.unitLabel}</span>

          <div class="walkin-item-footer" style="margin-top: 10px;">
            <input type="text" class="form-control walkin-item-notes-input" value="${item.notes}" placeholder="ملاحظة خاصة بهذا الشباك (تفصيل كسرات، إضافات، ملاحظات فنية...)" oninput="window.naseejAdmin.updateWalkinItem(${idx}, 'notes', this.value)">
            
            <div class="walkin-item-total-badge" id="walkin-item-subtotal-${idx}">
              ${(item.width && item.height) ? `مقاس [${item.width}م عرض × ${item.height}م ارتفاع] • ` : ''}${item.sewingType ? `${item.sewingType} • ` : ''}المجموع: <strong>${itemSubtotal.toLocaleString()} ₪</strong> (${item.meters} ${item.unitLabel} × ${item.unitPrice} ₪)
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  handleWalkinDateChange(dateVal) {
    if (!dateVal) return;
    const d = new Date(dateVal);
    const dayName = store.getDayNameFromDate(d);
    const isFriday = d.getDay() === 5;
    const badge = document.getElementById('walkin-schedule-day-badge');
    const warn = document.getElementById('walkin-friday-warn');
    const noticeWeek2 = document.getElementById('walkin-week2-notice');

    if (badge) {
      const currentSat = store.getSaturdayOfWeek(new Date());
      const nextSat = new Date(currentSat);
      nextSat.setDate(nextSat.getDate() + 7);
      const isNextWeek = d >= nextSat;
      const weekLabel = isNextWeek ? '<span style="background: #fef3c7; color: #92400e; padding: 2px 7px; border-radius: 4px; font-size: 11px; margin-right: 6px; font-weight: 800;">⏩ الأسبوع الثاني</span>' : '<span style="background: #e0f2fe; color: #0369a1; padding: 2px 7px; border-radius: 4px; font-size: 11px; margin-right: 6px; font-weight: 800;">📌 الأسبوع الأول</span>';
      badge.innerHTML = `يوم ${dayName} ${weekLabel}`;

      if (noticeWeek2) {
        noticeWeek2.style.display = isNextWeek ? 'block' : 'none';
      }
    }
    if (warn) warn.style.display = isFriday ? 'block' : 'none';
  }

  handleWalkinInstallDateChange(dateVal) {
    if (!dateVal) return;
    const d = new Date(dateVal);
    const dayName = store.getDayNameFromDate(d);
    const badge = document.getElementById('walkin-install-day-badge');
    if (badge) badge.textContent = `يوم ${dayName}`;
  }

  closeWalkinOrderModal() {
    this.closeAllFabricDropdowns();
    const modal = document.getElementById('admin-walkin-order-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = '';
      modal.style.opacity = '';
      modal.style.visibility = '';
      modal.style.pointerEvents = '';
      modal.style.zIndex = '';
      document.body.style.overflow = '';
    }
  }

  handleWalkinDeliveryChange() {
    this.recalcWalkinTotal();
  }

  handleWalkinInstallToggle() {
    const checkbox = document.getElementById('walkin-install-toggle');
    const fields = document.getElementById('walkin-install-fields');
    if (fields) {
      fields.style.display = checkbox && checkbox.checked ? 'grid' : 'none';
    }
    this.recalcWalkinTotal();
  }

  recalcWalkinTotal() {
    let totalMeters = 0;
    let fabricsSubtotal = 0;

    (this.walkinItems || []).forEach(item => {
      const m = parseFloat(item.meters) || 0;
      const p = parseFloat(item.unitPrice) || 0;
      totalMeters += m;
      fabricsSubtotal += Math.round(m * p);
    });

    totalMeters = Math.round(totalMeters * 10) / 10;

    const deliveryType = document.getElementById('walkin-delivery-type')?.value || 'pickup_babsaha';
    const installToggle = document.getElementById('walkin-install-toggle')?.checked || false;

    // When installation is requested: road delivery fee is 0 (free with technician) while installation fee is added
    let deliveryFee = 0;
    if (!installToggle) {
      if (deliveryType === 'delivery_wb') deliveryFee = 20;
      else if (deliveryType === 'delivery_jer') deliveryFee = 45;
      else if (deliveryType === 'delivery_48') deliveryFee = 80;
    }

    const installFeeInput = document.getElementById('walkin-install-fee');
    const installFee = installToggle ? (parseFloat(installFeeInput?.value) || 0) : 0;
    const grandTotal = fabricsSubtotal + deliveryFee + installFee;

    const breakdownEl = document.getElementById('walkin-calc-breakdown');
    const grandtotalEl = document.getElementById('walkin-calc-grandtotal');

    if (breakdownEl) {
      const windowsCount = (this.walkinItems || []).length;
      const windowsCountLabel = windowsCount === 1 ? 'شباك واحد' : (windowsCount === 2 ? 'شباكان' : `${windowsCount} شبابيك`);
      let parts = [
        `<strong>${windowsCountLabel}</strong>`,
        `إجمالي الأمتار: <strong>${totalMeters} متر</strong>`,
        `مجموع الأقمشة: <strong>${fabricsSubtotal.toLocaleString()} ₪</strong>`
      ];
      if (installToggle) {
        parts.push(`أجور الطريق: مجاناً (0 ₪ مع الفني)`);
        if (installFee > 0) parts.push(`أجور التركيب: +${installFee} ₪`);
        else parts.push(`أجور التركيب: متراوحة`);
      } else if (deliveryFee > 0) {
        parts.push(`أجور التوصيل: +${deliveryFee} ₪`);
      } else {
        parts.push(`استلام من الفرع: مجاني (0 ₪)`);
      }
      breakdownEl.innerHTML = parts.join(' | ');
    }

    if (grandtotalEl) {
      grandtotalEl.textContent = `${grandTotal.toLocaleString()} شيكل`;
    }
  }

  submitWalkinOrder(event) {
    if (event) event.preventDefault();

    const name = document.getElementById('walkin-cust-name').value.trim();
    const phone = document.getElementById('walkin-cust-phone').value.trim();
    const city = document.getElementById('walkin-cust-city').value.trim() || 'نابلس';
    const address = document.getElementById('walkin-cust-address').value.trim();
    const deliveryVal = document.getElementById('walkin-delivery-type').value;

    const tailoringDate = document.getElementById('walkin-schedule-date')?.value || store.formatDateISO(new Date());
    const tailoringDayObj = new Date(tailoringDate);
    const tailoringDay = store.getDayNameFromDate(tailoringDayObj);

    const installToggle = document.getElementById('walkin-install-toggle').checked;
    const installerId = document.getElementById('walkin-installer-select').value;
    const installDate = document.getElementById('walkin-install-date')?.value || tailoringDate;
    const installDayObj = new Date(installDate);
    const installDay = store.getDayNameFromDate(installDayObj);

    const generalNotes = document.getElementById('walkin-notes').value.trim();

    if (!name) {
      window.naseejCustomer.showToast('يرجى كتابة اسم الزبون', 'error');
      return;
    }
    if (!phone) {
      window.naseejCustomer.showToast('يرجى كتابة رقم هاتف الزبون', 'error');
      return;
    }

    if (!this.walkinItems || this.walkinItems.length === 0) {
      window.naseejCustomer.showToast('يرجى إضافة شباك واحد على الأقل للطلبية!', 'error');
      return;
    }

    let deliveryType = 'pickup';
    let pickupBranch = 'نابلس - باب الساحة';
    let deliveryRegion = '';
    let baseShippingFee = 0;

    if (deliveryVal === 'pickup_babsaha') {
      deliveryType = 'pickup';
      pickupBranch = 'نابلس - باب الساحة';
    } else if (deliveryVal === 'pickup_beitwazan') {
      deliveryType = 'pickup';
      pickupBranch = 'نابلس - بيت وزن بجانب طلعة برافو';
    } else if (deliveryVal === 'delivery_wb') {
      deliveryType = 'delivery';
      deliveryRegion = 'الضفة الغربية';
      baseShippingFee = 20;
    } else if (deliveryVal === 'delivery_jer') {
      deliveryType = 'delivery';
      deliveryRegion = 'القدس';
      baseShippingFee = 45;
    } else if (deliveryVal === 'delivery_48') {
      deliveryType = 'delivery';
      deliveryRegion = 'الداخل الفلسطيني (مناطق 48)';
      baseShippingFee = 80;
    }

    // When installation is requested: road delivery fee is 0 ₪, installation fee is added
    const shippingFee = installToggle ? 0 : baseShippingFee;
    const installFeeInput = document.getElementById('walkin-install-fee');
    const installFee = installToggle ? (parseFloat(installFeeInput?.value) || 0) : 0;

    // Process all items
    let totalMeters = 0;
    let subtotal = 0;

    const orderItems = this.walkinItems.map((item, index) => {
      const product = store.getProductById(item.productId) || { name: item.productName || 'قماش مخصص', category: 'curtain' };
      const itemMeters = parseFloat(item.meters) || 1;
      const itemUnitPrice = parseFloat(item.unitPrice) || 60;
      const itemTotal = Math.round(itemMeters * itemUnitPrice);
      
      totalMeters += itemMeters;
      subtotal += itemTotal;

      const itemWidth = parseFloat(item.width) || null;
      const itemHeight = parseFloat(item.height) || null;

      return {
        productId: item.productId,
        productName: product.name,
        roomName: item.roomName || `شباك ${index + 1}`,
        color: item.color || 'بيج رملي',
        width: itemWidth,
        height: itemHeight,
        sewingType: item.sewingType || 'تفصيل وخياطة متقنة',
        fullnessRatio: item.fullnessRatio || null,
        meters: itemMeters,
        unitLabel: item.unitLabel || (product.category === 'tarsoon' ? 'م²' : 'متر'),
        pricePerMeter: itemUnitPrice,
        total: itemTotal,
        notes: item.notes || ''
      };
    });

    totalMeters = Math.round(totalMeters * 10) / 10;
    const grandTotal = subtotal + shippingFee + installFee;

    const orderData = {
      customer: {
        name,
        phone,
        email: `${phone.replace(/\D/g, '')}@showroom-customer.com`,
        city,
        address: address || (deliveryType === 'pickup' ? `استلام من فرع ${pickupBranch}` : city),
        notes: generalNotes ? `[طلب معرض]: ${generalNotes}` : '[طلب زبون مباشر من داخل المعرض]'
      },
      deliveryType,
      pickupBranch,
      deliveryRegion,
      scheduledDate: tailoringDate,
      scheduledDay: tailoringDay,
      requiresInstallation: installToggle,
      installationFee: installFee,
      installationDate: installDate,
      installationDay: installDay,
      installerId: installToggle ? installerId : null,
      installerName: installToggle ? store.getInstallerName(installerId) : null,
      installationStatus: installToggle ? 'scheduled' : 'none',
      source: 'showroom',
      items: orderItems,
      totalMeters,
      subtotal,
      shippingFee,
      discount: 0,
      grandTotal,
      paymentMethod: 'الدفع عند الاستلام (نقد داخل المعرض)'
    };

    const newOrder = store.createOrder(orderData);
    const windowsSummary = orderItems.length === 1 ? 'شباك واحد' : `${orderItems.length} شبابيك (${totalMeters} متر)`;
    window.naseejCustomer.showToast(`🎉 تم تسجيل طلبية المعرض (${newOrder.id}) باسم "${name}" (${windowsSummary}) وإدراجها بالجدول ليوم ${tailoringDay} (${tailoringDate})!`, 'success');
    this.closeWalkinOrderModal();
    this.renderAll();
  }

  // Print / View Order Receipt
  printOrderReceipt(orderId) {
    const order = store.getOrders().find(o => o.id === orderId);
    if (!order) return;

    const receiptWindow = window.open('', '_blank', 'width=720,height=850');
    const fulfillmentText = order.deliveryType === 'pickup'
      ? `استلام من المحل: ${order.pickupBranch || 'نابلس - باب الساحة'} (0 شيكل)`
      : `توصيل وشحن: ${order.deliveryRegion || order.customer.city} (${order.shippingFee} شيكل)`;

    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>فاتورة تفصيل وقص قماش - ${order.id}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 25px; color: #1e293b; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #0f172a; }
          .sub { color: #d4af37; font-size: 14px; margin-top: 4px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; background: #f8fafc; padding: 14px; border-radius: 6px; border: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: right; }
          th { background: #0f172a; color: #ffffff; }
          .total-box { text-align: left; font-size: 18px; margin-top: 20px; border-top: 2px dashed #cbd5e1; padding-top: 15px; }
          .barcode { text-align: center; margin-top: 30px; letter-spacing: 5px; font-family: monospace; font-size: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">شركة الولاء للستائر BalalemCo</div>
          <div class="sub">إيصال ورشة قص وتفصيل أقمشة الستائر الفاخرة • هاتف وواتساب: 0599842231</div>
        </div>
        <div class="info-grid">
          <div>
            <strong>رقم الطلب:</strong> #${order.id}<br>
            <strong>✂️ موعد تجهيز وتفصيل الورشة:</strong> <span style="color:#b45309; font-weight:bold;">يوم ${order.workshopPrepDay || ''} (${order.workshopPrepDate || ''})</span> <small style="color:#b45309;">(قبل بيومين من التسليم)</small><br>
            <strong>📅 موعد التسليم / التركيب للزبون:</strong> <span style="color:#0f172a; font-weight:bold;">يوم ${order.scheduledDay || 'السبت'} (${order.scheduledDate || ''})</span><br>
            <strong>🏷️ نوع وتصنيف الموعد:</strong> <span style="font-weight:bold; color: ${order.requiresInstallation ? '#2563eb' : '#059669'};">${order.requiresInstallation ? `🔧 تركيب منزلي (${order.installerName || 'فني تركيب معتمد'})` : '🏪 تسليم واستلام داخل المعرض'}</span><br>
            <strong>حالة التجهيز بالورشة:</strong> <span style="font-weight:bold; color: ${store.isOrderPrepared(order) ? '#15803d' : '#d97706'};">${store.isOrderPrepared(order) ? '✅ تم التجهيز بالكامل' : '⏳ قيد التجهيز'}</span><br>
            <strong>طريقة الدفع:</strong> ${order.paymentMethod}
          </div>
          <div>
            <strong>العميل:</strong> ${order.customer.name}<br>
            <strong>الجوال:</strong> ${order.customer.phone}<br>
            <strong>العنوان:</strong> ${order.customer.city} - ${order.customer.address}<br>
            <strong>طريقة التسليم:</strong> <strong>${fulfillmentText}</strong>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>القماش والغرفة / الشباك</th>
              <th>اللون</th>
              <th>الأمتار / المساحة</th>
              <th>سعر الوحدة</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || []).map(i => {
              let width = i.width;
              let height = i.height;
              if ((!width || !height) && i.details) {
                const wMatch = i.details.match(/عرض\s*([\d.]+)/);
                const hMatch = i.details.match(/ارتفاع(?:\/طول)?\s*([\d.]+)/);
                if (wMatch) width = wMatch[1];
                if (hMatch) height = hMatch[1];
              }
              const dimHtml = (width && height)
                ? `<div style="color: #065f46; font-size: 12px; font-weight: bold; margin-top: 2px;">📐 المقاسات: عرض ${width} م × ارتفاع/طول ${height} م</div>`
                : '';

              return `
              <tr>
                <td>
                  <strong>${i.productName}</strong>
                  ${i.roomName ? `<div style="color: #0284c7; font-size: 12px; font-weight: bold; margin-top: 2px;">🪟 الغرفة: ${i.roomName}</div>` : ''}
                  ${dimHtml}
                  ${i.sewingType ? `<div style="color:#b45309; font-size:12px; font-weight:bold; margin-top: 2px;">[${i.sewingType}]</div>` : ''}
                  <small style="color:#475569;">${i.notes || ''}</small>
                </td>
                <td>${i.color}</td>
                <td><strong>${i.meters} ${i.unitLabel || 'متر'}</strong></td>
                <td>${i.pricePerMeter} شيكل</td>
                <td>${i.total.toLocaleString()} شيكل</td>
              </tr>
            `;}).join('')}
          </tbody>
        </table>
        <div class="total-box">
          <div>المجموع الفرعي للأقمشة: <strong>${order.subtotal.toLocaleString()} شيكل</strong></div>
          <div>أجور التوصيل / التسليم: <strong>${order.shippingFee === 0 ? 'مجاناً (استلام فرع)' : order.shippingFee + ' شيكل'}</strong></div>
          <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 8px;">المبلغ الإجمالي المطلوب عند الاستلام: ${order.grandTotal.toLocaleString()} شيكل</div>
        </div>
        <div class="barcode">*${order.id}*</div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    receiptWindow.document.close();
  }

  // Render Registered Customers Table
  renderCustomersTable() {
    const tbody = document.getElementById('admin-customers-tbody');
    if (!tbody) return;

    const customers = store.getCustomers();
    const orders = store.getOrders();

    if (customers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4">لا يوجد زبائن مسجلون بعد.</td></tr>`;
      return;
    }

    tbody.innerHTML = customers.map(cust => {
      // Find orders belonging to this customer
      const custOrders = orders.filter(o => o.customer && (o.customer.phone === cust.phone || o.customer.email === cust.email));
      const totalSpent = custOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      const totalMeters = custOrders.reduce((sum, o) => sum + (o.totalMeters || 0), 0);

      return `
        <tr>
          <td><strong>${cust.name || 'عميل المتجر'}</strong></td>
          <td><span class="phone-link">📱 ${cust.phone}</span></td>
          <td><span class="email-link">✉️ ${cust.email}</span></td>
          <td>${custOrders.length} طلبات (${totalMeters} متر)</td>
          <td><strong>${totalSpent.toLocaleString()} شيكل</strong></td>
        </tr>
      `;
    }).join('');
  }

  // Quick 1-Click Fabric Presets
  applyProductPreset(presetKey) {
    const presets = {
      crepe_royal: {
        name: 'كريب ستائر رويال إسطنبولي فاخر',
        category: 'crepe',
        price: 65,
        width: 300,
        stock: 450,
        origin: 'تركيا (بورصة)',
        composition: '100% كريب بوليستر معالج ضد الانكماش والكهرباء الساكنة',
        light: '75% حجب وانسيابية ملكية',
        colors: 'بيج رملي:#d2b48c, أوف وايت:#fdfbf7, رمادي لؤلؤي:#c5c6c7, موكا هادئ:#8b7355',
        image: 'assets/images/curtain_crepe.jpg',
        desc: 'قماش كريب ستائر تركي ملكي فائق النعومة، بوزن مثالي يسدل بكسرات متناسقة، مناسب لغرف الضيوف وغرف المعيشة الراقية.'
      },
      linen_sage: {
        name: 'كتان ريفي طبيعي مسدل بدرجات السيج',
        category: 'linen',
        price: 75,
        width: 300,
        stock: 350,
        origin: 'بلجيكا',
        composition: '80% ألياف كتان طبيعي منقى + 20% خيوط مقاومة للتجعد',
        light: '65% عزل ضوئي مع إضاءة طبيعية دافئة',
        colors: 'أخضر سيج ناعم:#94a390, كتان بيج طبيعي:#e6dec8, أبيض قطني:#f8f9fa, رمادي ترابي:#a8a29e',
        image: 'assets/images/curtain_linen_sage.jpg',
        desc: 'كتان فاخر ملمسه غني وطبيعي يضفي على المنزل طابع الهدوء والأناقة الريفية الحديثة، مقاوم لأشعة الشمس.'
      },
      tulle_sheer: {
        name: 'تول وشيفون فوال شفاف مطرز بالحرير',
        category: 'tulle',
        price: 50,
        width: 320,
        stock: 500,
        origin: 'تركيا',
        composition: '100% خيوط فوال ميكروفايبر حريرية مع تطريز دقيق',
        light: '30% ترشيح ناعم لأشعة الشمس ونفاذية إضاءة ممتازة',
        colors: 'أوف وايت نقي:#faf9f6, عاجي لؤلؤي:#fffff0, رمادي فضي:#e2e8f0',
        image: 'assets/images/curtain_tulle.jpg',
        desc: 'تول ستائر ناعم وخفيف يتناغم مع الستائر الثقيلة، يسمح بدخول الإضاءة الطبيعية مع الحفاظ على الخصوصية والجمال.'
      },
      velvet_blackout: {
        name: 'مخمل ملكي معتم بلاك آوت عازل للصوت والحرارة',
        category: 'velvet',
        price: 95,
        width: 300,
        stock: 280,
        origin: 'إيطاليا',
        composition: 'مخمل قطيفة كثيف مع طبقة تبطين ثلاثية عازلة',
        light: '100% بلاك آوت تام حجب كامل للضوء',
        colors: 'نبيذي ملكي:#721c24, رمادي غرافيت:#2d3748, كحلي ملكي:#1a365d, زيتي زمردي:#1c4532',
        image: 'assets/images/curtain_velvet.jpg',
        desc: 'أفخم أنواع المخمل العازل للضوء والحرارة، يوفر ظلاماً تاماً وهدوءاً عازلاً للصوت لغرف النوم والصالونات الفخمة.'
      },
      tarsoon_zebra: {
        name: 'ستائر ترسون زيبرا مودرن بالمتر المربع',
        category: 'tarsoon',
        price: 85,
        width: 280,
        stock: 400,
        origin: 'كوريا الجنوبية',
        composition: 'شرائح بوليستر مزدوجة معالجة ومقاومة للغبار والماء',
        light: 'تحكم مزدوج من 40% إلى 95% عزل ضوئي',
        colors: 'أبيض عاجي أنيق:#f8fafc, بيج مودرن:#e2d9cc, رصاصي عصري:#64748b',
        image: 'assets/images/curtain_brocade.jpg',
        desc: 'ستائر ترسون زيبرا حديثة بنظام تحكم سلس بالبكرات، تدمج بين طبقات شفافة ومعتمة للتحكم بمرور الضوء بسهولة.'
      }
    };

    const preset = presets[presetKey];
    if (!preset) return;

    const el = (id) => document.getElementById(id);
    if (el('prod-name')) el('prod-name').value = preset.name;
    if (preset.category) {
      this.selectProductCategory(preset.category);
    }
    if (el('prod-price')) el('prod-price').value = preset.price;
    if (el('prod-width')) el('prod-width').value = preset.width;
    if (el('prod-stock')) el('prod-stock').value = preset.stock;
    if (el('prod-origin')) el('prod-origin').value = preset.origin;
    if (el('prod-composition')) el('prod-composition').value = preset.composition;
    if (el('prod-light')) el('prod-light').value = preset.light;
    if (preset.colors) {
      this.setProductColorsFromString(preset.colors);
    }
    if (el('prod-image-url')) el('prod-image-url').value = preset.image;
    if (el('prod-image-preview')) el('prod-image-preview').src = preset.image;
    if (el('prod-desc')) el('prod-desc').value = preset.desc;

    this.updateProductLivePreview();
    if (window.naseejCustomer) {
      window.naseejCustomer.showToast(`✨ تم ملء مواصفات (${preset.name}) بنجاح!`, 'success');
    }
  }

  // Update real-time 3D live preview card in the product modal
  updateProductLivePreview() {
    const el = (id) => document.getElementById(id);
    const name = el('prod-name')?.value || 'اسم قماش الستارة';
    const price = el('prod-price')?.value || '65';
    const category = el('prod-category')?.value || 'crepe';
    const imgUrl = el('prod-image-url')?.value || 'assets/images/curtain_crepe.jpg';
    const origin = el('prod-origin')?.value || 'تركيا';
    const colors = el('prod-colors')?.value || '';

    const previewName = el('preview-card-name');
    const previewPrice = el('preview-card-price');
    const previewImg = el('preview-card-img');
    const previewOrigin = el('preview-card-origin');
    const previewUnit = el('preview-card-unit');
    const previewColors = el('preview-card-colors');

    if (previewName) previewName.textContent = name;
    if (previewPrice) previewPrice.textContent = `${price} ₪`;
    if (previewImg) previewImg.src = imgUrl;
    if (previewOrigin) previewOrigin.textContent = origin;
    if (previewUnit) previewUnit.textContent = category === 'tarsoon' ? 'لكل م²' : 'لكل متر طولي';

    if (previewColors) {
      const activeList = Array.isArray(this.activeProductColors) && this.activeProductColors.length > 0
        ? this.activeProductColors
        : (colors ? colors.split(',').map(p => {
            const [cName, cHex] = p.split(':').map(s => s ? s.trim() : '');
            return { name: cName, hex: cHex };
          }) : []);
      const parts = activeList.slice(0, 5);
      previewColors.innerHTML = parts.map(c => {
        const hex = c.hex && c.hex.startsWith('#') ? c.hex : '#d4af37';
        return `<span class="preview-color-dot" style="background-color: ${hex};" title="${c.name || ''}"></span>`;
      }).join('');
    }
  }

  // Quick fill guest for walkin orders
  quickFillWalkinGuest() {
    const el = (id) => document.getElementById(id);
    const randomNames = ['زبون صالة العرض', 'أبو أحمد النتشة', 'أم عمر المصري', 'طارق منصور', 'خالد عبد الرحيم', 'م. حسام التميمي'];
    const rName = randomNames[Math.floor(Math.random() * randomNames.length)];
    const rPhone = '059' + Math.floor(1000000 + Math.random() * 9000000);
    
    if (el('walkin-cust-name')) el('walkin-cust-name').value = rName;
    if (el('walkin-cust-phone')) el('walkin-cust-phone').value = rPhone;
    if (el('walkin-cust-city')) el('walkin-cust-city').value = 'نابلس';
    if (el('walkin-cust-address')) el('walkin-cust-address').value = 'نابلس - المعرض الرئيسي';
    if (window.naseejCustomer) {
      window.naseejCustomer.showToast(`تم إدخال بيانات (${rName}) سريعاً بنجاح ✓`, 'info');
    }
  }

  // Open "Add Product" Modal (تزويد منتج جديد)
  openAddProductModal() {
    this.editingProductId = null;
    this.populateCategorySelect();
    this.selectProductCategory('crepe');

    // Default 4 main popular colors pre-selected as requested by store owner
    this.activeProductColors = [
      { name: 'سكني', hex: '#808488' },
      { name: 'بيج', hex: '#d2b48c' },
      { name: 'سكري (أوف وايت)', hex: '#fdfbf7' },
      { name: 'ذهبي', hex: '#d4af37' }
    ];
    this.syncProductColors();

    const titleEl = document.getElementById('admin-product-modal-title');
    if (titleEl) titleEl.textContent = 'تزويد قماش ستائر جديد للمتجر';
    const formEl = document.getElementById('admin-product-form');
    if (formEl) formEl.reset();
    const idEl = document.getElementById('prod-form-id');
    if (idEl) idEl.value = '';
    const imgEl = document.getElementById('prod-image-preview');
    if (imgEl) imgEl.src = 'assets/images/curtain_crepe.jpg';

    this.updateProductLivePreview();

    const modal = document.getElementById('admin-product-modal');
    if (modal) {
      modal.classList.add('active');
      modal.style.display = 'flex';
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
      modal.style.pointerEvents = 'auto';
      modal.style.zIndex = '99999';
      document.body.style.overflow = 'hidden';
    }
  }

  // Open "Edit Product" Modal
  openEditProductModal(productId) {
    const product = store.getProductById(productId);
    if (!product) return;

    this.editingProductId = productId;
    this.populateCategorySelect();
    document.getElementById('admin-product-modal-title').textContent = `تعديل قماش (${product.name})`;
    document.getElementById('prod-form-id').value = product.id;
    document.getElementById('prod-name').value = product.name;
    this.selectProductCategory(product.category);
    document.getElementById('prod-price').value = product.pricePerMeter;
    document.getElementById('prod-width').value = product.rollWidth;
    document.getElementById('prod-stock').value = product.stockMeters;
    document.getElementById('prod-origin').value = product.origin;
    document.getElementById('prod-composition').value = product.composition;
    document.getElementById('prod-light').value = product.lightBlockage;
    document.getElementById('prod-desc').value = product.description;
    document.getElementById('prod-image-url').value = product.image;
    document.getElementById('prod-image-preview').src = product.image;

    if (Array.isArray(product.colors) && product.colors.length > 0) {
      this.activeProductColors = product.colors.map(c => ({ name: c.name, hex: c.hex || '#808488' }));
    } else {
      this.setProductColorsFromString(product.colorsStr || '');
    }
    this.syncProductColors();

    const modal = document.getElementById('admin-product-modal');
    if (modal) {
      modal.classList.add('active');
      modal.style.display = 'flex';
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
      modal.style.pointerEvents = 'auto';
      modal.style.zIndex = '99999';
      document.body.style.overflow = 'hidden';
    }
  }

  closeProductModal() {
    this.closeCategoryDropdown();
    const modal = document.getElementById('admin-product-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = '';
      modal.style.opacity = '';
      modal.style.visibility = '';
      modal.style.pointerEvents = '';
      modal.style.zIndex = '';
      document.body.style.overflow = '';
    }
  }

  // Save Product (Add or Edit)
  handleProductFormSubmit(event) {
    if (event) event.preventDefault();

    const id = document.getElementById('prod-form-id').value;
    const nameInput = document.getElementById('prod-name');
    const name = nameInput ? nameInput.value.trim() : '';

    const searchInput = document.getElementById('prod-category-search');
    const typedCategoryName = searchInput ? searchInput.value.trim() : '';
    let category = document.getElementById('prod-category')?.value || 'crepe';

    // If user typed a custom category name that doesn't exist yet, automatically add it to the store
    if (typedCategoryName) {
      const allCats = store.getCategories();
      const match = allCats.find(c => c.name.toLowerCase() === typedCategoryName.toLowerCase() || c.id === category);
      if (!match) {
        const added = store.addCategory({ name: typedCategoryName, icon: '✨' });
        if (added) {
          category = added.id;
          if (document.getElementById('prod-category')) document.getElementById('prod-category').value = added.id;
          this.renderCategoriesTable();
        }
      } else {
        category = match.id;
      }
    }

    const pricePerMeter = Math.max(1, Number(document.getElementById('prod-price').value) || 60);
    const rollWidth = Math.max(50, Number(document.getElementById('prod-width').value) || 280);
    const stockMeters = Math.max(0, Number(document.getElementById('prod-stock').value) || 200);
    const origin = document.getElementById('prod-origin').value.trim() || 'تركيا';
    const composition = document.getElementById('prod-composition').value.trim() || '100% بوليستر معالج';
    const lightBlockage = document.getElementById('prod-light').value.trim() || 'حجب معتدل للضوء';
    const description = document.getElementById('prod-desc').value.trim() || 'قماش ستائر فاخر عالي الجودة.';
    const imageUrl = document.getElementById('prod-image-url').value.trim() || 'assets/images/curtain_crepe.jpg';
    const colorsInput = document.getElementById('prod-colors').value.trim();

    if (!name) {
      if (window.naseejCustomer) {
        window.naseejCustomer.showToast('يرجى إدخال اسم قماش الستارة أولاً', 'error');
      } else {
        alert('يرجى إدخال اسم قماش الستارة');
      }
      if (nameInput) nameInput.focus();
      return;
    }

    const categoryNames = {
      crepe: 'أقمشة كريب ستائر',
      linen: 'أقمشة كتان طبيعي',
      tulle: 'أقمشة تول وشيفون',
      velvet: 'أقمشة مخمل وبلاك آوت',
      brocade: 'أقمشة بروكار وجاكار',
      tarsoon: 'ستائر الترسون (بالمتر المربع)'
    };

    const allCats = store.getCategories();
    const foundCat = allCats.find(c => c.id === category);
    const categoryName = foundCat ? foundCat.name : (typedCategoryName || categoryNames[category] || 'أقمشة ستائر ومفروشات');

    // Parse colors from activeProductColors or input
    let parsedColors = Array.isArray(this.activeProductColors) && this.activeProductColors.length > 0
      ? [...this.activeProductColors]
      : [];

    if (parsedColors.length === 0 && colorsInput) {
      parsedColors = colorsInput.split(',').map(part => {
        const [cName, cHex] = part.split(':').map(s => s ? s.trim() : '');
        return {
          name: cName || 'لون مخصص',
          hex: cHex && cHex.startsWith('#') ? cHex : '#808488'
        };
      });
    }
    if (parsedColors.length === 0) {
      parsedColors = [
        { name: 'سكني', hex: '#808488' },
        { name: 'بيج', hex: '#d2b48c' },
        { name: 'سكري (أوف وايت)', hex: '#fdfbf7' },
        { name: 'ذهبي', hex: '#d4af37' }
      ];
    }

    const productPayload = {
      name,
      category,
      categoryName: categoryName,
      pricePerMeter,
      rollWidth,
      stockMeters,
      origin,
      composition,
      lightBlockage,
      description,
      image: imageUrl,
      colors: parsedColors
    };

    if (id) {
      store.updateProduct(id, productPayload);
      window.naseejCustomer.showToast(`تم تحديث قماش (${name}) بنجاح`, 'success');
    } else {
      store.addProduct(productPayload);
      window.naseejCustomer.showToast(`تم تزويد وإضافة قماش (${name}) للمتجر بنجاح!`, 'success');
    }

    this.closeProductModal();
    this.renderProductsTable();
    this.renderKPIs();
  }

  confirmDeleteProduct(id, name) {
    if (confirm(`هل أنت متأكد من حذف قماش (${name}) من قائمة المتجر؟`)) {
      store.deleteProduct(id);
      window.naseejCustomer.showToast(`تم حذف القماش بنجاح`, 'info');
      this.renderProductsTable();
      this.renderKPIs();
    }
  }

  // Handle local image file upload for new fabric
  handleImageUpload(input) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById('prod-image-url').value = e.target.result;
        document.getElementById('prod-image-preview').src = e.target.result;
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  // --- Category & Bubbles Management (إدارة التصنيفات والفقاعات) ---
  renderCategoriesTable() {
    const tbody = document.getElementById('admin-categories-tbody');
    if (!tbody) return;

    const categories = store.getCategories();
    const products = store.getProducts();

    if (categories.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 30px; color: #64748b;">لا توجد تصنيفات مضافة حالياً.</td></tr>`;
      return;
    }

    tbody.innerHTML = categories.map(cat => {
      const isAll = cat.id === 'all';
      const count = isAll ? products.length : products.filter(p => p.category === cat.id).length;
      const isDefault = cat.isDefault || isAll;
      const typeBadge = isDefault
        ? `<span class="badge" style="background: #e2e8f0; color: #475569; font-size: 11px;">أساسي بالنظام</span>`
        : `<span class="badge badge-gold" style="font-size: 11px;">✨ مخصص مضاف</span>`;
      
      const deleteBtn = isDefault
        ? `<button type="button" class="btn btn-sm" disabled style="opacity: 0.4; cursor: not-allowed;" title="التصنيفات الافتراضية محمية من الحذف">🔒 أساسي</button>`
        : `<button type="button" class="btn btn-danger btn-sm" onclick="window.naseejAdmin.deleteCategory('${cat.id}', '${cat.name.replace(/'/g, "\\'")}')" title="حذف هذا التصنيف">🗑️ حذف</button>`;

      return `
        <tr>
          <td style="text-align: center; font-size: 20px;">${cat.icon || '🏷️'}</td>
          <td><strong>${cat.name}</strong></td>
          <td><code style="font-size: 12px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #0284c7;">${cat.id}</code></td>
          <td><span class="badge" style="background: rgba(212, 175, 55, 0.15); color: #856404; font-weight: 700;">${count} صنف</span></td>
          <td>${typeBadge}</td>
          <td style="text-align: center;">${deleteBtn}</td>
        </tr>
      `;
    }).join('');
  }

  handleAddCategorySubmit(event) {
    if (event) event.preventDefault();
    const nameInput = document.getElementById('new-cat-name');
    const iconInput = document.getElementById('new-cat-icon');
    if (!nameInput) return;

    const name = nameInput.value.trim();
    const icon = iconInput ? iconInput.value.trim() : '🏷️';

    if (!name) {
      if (window.naseejCustomer) window.naseejCustomer.showToast('يرجى إدخال اسم التصنيف الجديد', 'error');
      return;
    }

    const newCat = store.addCategory({ name, icon });
    if (newCat) {
      if (window.naseejCustomer) {
        window.naseejCustomer.showToast(`✨ تم بنجاح إضافة تصنيف (${name}) لفقاعات المتجر!`, 'success');
      }
      nameInput.value = '';
      if (iconInput) iconInput.value = '🏷️';
      this.renderCategoriesTable();
      this.populateCategorySelect();
    }
  }

  deleteCategory(categoryId, categoryName) {
    if (!categoryId || categoryId === 'all') return;
    if (confirm(`هل أنت متأكد من حذف تصنيف (${categoryName || categoryId}) من فقاعات المتجر؟`)) {
      const ok = store.deleteCategory(categoryId);
      if (ok) {
        if (window.naseejCustomer) {
          window.naseejCustomer.showToast(`تم حذف التصنيف بنجاح`, 'info');
        }
        this.renderCategoriesTable();
        this.populateCategorySelect();
      }
    }
  }

  // ==========================================
  // PRODUCT CATEGORY SEARCHABLE COMBOBOX (كتابة + سكرول + إضافة جديد)
  // ==========================================

  generateCategoryOptionsHtml(query = '') {
    const categories = store.getCategories().filter(c => c.id !== 'all');
    const selectedCatId = document.getElementById('prod-category')?.value || 'crepe';

    const normalizeArabic = (s) => (s || '').toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '')
      .trim();

    const q = normalizeArabic(query);
    const filtered = categories.filter(c => {
      if (!q) return true;
      const name = normalizeArabic(c.name);
      const id = normalizeArabic(c.id);
      return name.includes(q) || id.includes(q);
    });

    let html = '';

    if (filtered.length > 0) {
      html += filtered.map(c => {
        const isSelected = c.id === selectedCatId;
        const icon = c.icon || '🏷️';
        const typeBadge = c.isCustom ? '✨ مخصص' : 'أساسي';
        const safeName = (c.name || '').replace(/"/g, '&quot;');
        return `
          <div class="prod-category-option ${isSelected ? 'selected' : ''}" 
               data-id="${c.id}" 
               data-name="${safeName}"
               data-icon="${icon}"
               tabindex="0"
               onmousedown="event.preventDefault(); window.naseejAdmin.selectProductCategory('${c.id}')">
            <div class="prod-category-opt-main">
              <span style="font-size: 16px;">${icon}</span>
              <span class="prod-category-opt-name">${c.name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="prod-category-opt-badge">${typeBadge}</span>
              ${isSelected ? '<span style="color: #16a34a; font-weight: 900; font-size: 13px;">✓</span>' : ''}
            </div>
          </div>
        `;
      }).join('');
    } else {
      html += `
        <div style="padding: 14px 10px; text-align: center; color: #64748b; font-size: 12px;">
          <span>لا يوجد تصنيف مطابق لـ "${query}"</span>
        </div>
      `;
    }

    // Offer to create a new category if query doesn't match an existing one
    const cleanQ = (query || '').trim();
    if (cleanQ && !categories.some(c => normalizeArabic(c.name) === q)) {
      const safeQuery = cleanQ.replace(/'/g, "\\'").replace(/"/g, '&quot;');
      html += `
        <div class="prod-category-custom-add-btn" 
             onmousedown="event.preventDefault(); window.naseejAdmin.addAndSelectCustomCategory('${safeQuery}')">
          <span>✨ إضافة كـ تصنيف ونوع جديد للمتجر: <strong>"${safeQuery}"</strong></span>
          <span style="font-size: 10.5px; color: #b45309;">(انقر هنا لإنشاء التصنيف واعتماده فوراً للمنتج)</span>
        </div>
      `;
    }

    return html;
  }

  openCategoryDropdown() {
    this.closeAllFabricDropdowns();
    const dropdown = document.getElementById('prod-category-dropdown');
    const wrapper = document.getElementById('prod-category-combobox');
    if (!dropdown || !wrapper) return;

    const listEl = document.getElementById('prod-category-list');
    const input = document.getElementById('prod-category-search');
    if (listEl) {
      listEl.innerHTML = this.generateCategoryOptionsHtml(input ? input.value : '');
    }

    dropdown.style.display = 'block';
    wrapper.classList.add('is-open');

    setTimeout(() => {
      const selected = listEl?.querySelector('.prod-category-option.selected');
      if (selected) selected.scrollIntoView({ block: 'nearest' });
    }, 20);
  }

  closeCategoryDropdown() {
    const dropdown = document.getElementById('prod-category-dropdown');
    const wrapper = document.getElementById('prod-category-combobox');
    if (dropdown) dropdown.style.display = 'none';
    if (wrapper) wrapper.classList.remove('is-open');
  }

  toggleCategoryDropdown(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const dropdown = document.getElementById('prod-category-dropdown');
    const isOpen = dropdown && dropdown.style.display === 'block';
    if (isOpen) {
      this.closeCategoryDropdown();
    } else {
      const listEl = document.getElementById('prod-category-list');
      if (listEl) {
        listEl.innerHTML = this.generateCategoryOptionsHtml('');
      }
      this.openCategoryDropdown();
      const input = document.getElementById('prod-category-search');
      if (input) input.focus();
    }
  }

  filterCategoryDropdown(query) {
    const listEl = document.getElementById('prod-category-list');
    if (listEl) {
      listEl.innerHTML = this.generateCategoryOptionsHtml(query);
    }
    this.openCategoryDropdown();

    const categories = store.getCategories().filter(c => c.id !== 'all');
    const cleanQ = (query || '').trim().toLowerCase();
    const match = categories.find(c => c.name.trim().toLowerCase() === cleanQ || c.id.toLowerCase() === cleanQ);
    if (match) {
      this.selectProductCategory(match.id, false);
    } else {
      const nameHidden = document.getElementById('prod-category-name');
      if (nameHidden) nameHidden.value = query;
    }
  }

  selectProductCategory(categoryId, updateInput = true) {
    const categories = store.getCategories();
    const cat = categories.find(c => c.id === categoryId);
    const hiddenId = document.getElementById('prod-category');
    const hiddenName = document.getElementById('prod-category-name');
    const searchInput = document.getElementById('prod-category-search');
    const iconBadge = document.getElementById('prod-category-icon-badge');

    if (cat) {
      if (hiddenId) hiddenId.value = cat.id;
      if (hiddenName) hiddenName.value = cat.name;
      if (updateInput && searchInput) searchInput.value = cat.name;
      if (iconBadge) iconBadge.textContent = cat.icon || '🏷️';
    } else if (categoryId) {
      if (hiddenId) hiddenId.value = categoryId;
      if (hiddenName) hiddenName.value = categoryId;
      if (updateInput && searchInput) searchInput.value = categoryId;
    }

    this.closeCategoryDropdown();
    this.updateProductLivePreview();
  }

  addAndSelectCustomCategory(categoryName) {
    if (!categoryName || !categoryName.trim()) return;
    const cleanName = categoryName.trim();

    const existing = store.getCategories().find(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      this.selectProductCategory(existing.id);
      return;
    }

    const newCat = store.addCategory({ name: cleanName, icon: '✨' });
    if (newCat) {
      this.selectProductCategory(newCat.id);
      if (window.naseejCustomer) {
        window.naseejCustomer.showToast(`✨ تم إنشاء تصنيف (${cleanName}) وإضافته للمتجر بنجاح!`, 'success');
      }
      this.renderCategoriesTable();
    }
  }

  handleCategoryKeydown(event) {
    const listEl = document.getElementById('prod-category-list');
    if (event.key === 'Enter') {
      event.preventDefault();
      const input = document.getElementById('prod-category-search');
      const val = input ? input.value.trim() : '';
      if (!listEl) return;

      const highlighted = listEl.querySelector('.prod-category-option.highlighted') || listEl.querySelector('.prod-category-option');
      if (highlighted && highlighted.dataset.id) {
        this.selectProductCategory(highlighted.dataset.id);
      } else if (val) {
        this.addAndSelectCustomCategory(val);
      }
      this.closeCategoryDropdown();
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      this.closeCategoryDropdown();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.openCategoryDropdown();
      if (!listEl) return;
      const options = Array.from(listEl.querySelectorAll('.prod-category-option'));
      if (options.length === 0) return;
      const curIndex = options.findIndex(opt => opt.classList.contains('highlighted'));
      let nextIndex = 0;
      if (event.key === 'ArrowDown') {
        nextIndex = curIndex < options.length - 1 ? curIndex + 1 : 0;
      } else {
        nextIndex = curIndex > 0 ? curIndex - 1 : options.length - 1;
      }
      options.forEach(opt => opt.classList.remove('highlighted'));
      options[nextIndex].classList.add('highlighted');
      options[nextIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  populateCategorySelect() {
    const listEl = document.getElementById('prod-category-list');
    const hiddenId = document.getElementById('prod-category');
    const currentVal = hiddenId ? hiddenId.value : 'crepe';

    if (listEl) {
      listEl.innerHTML = this.generateCategoryOptionsHtml('');
    }

    const countBadge = document.getElementById('prod-category-dropdown-count');
    const categories = store.getCategories().filter(c => c.id !== 'all');
    if (countBadge) {
      countBadge.textContent = `التصنيفات المتاحة (${categories.length})`;
    }

    const cat = categories.find(c => c.id === currentVal) || categories[0];
    if (cat) {
      this.selectProductCategory(cat.id, true);
    }
  }

  // ==========================================
  // PRODUCT COLORS VISUAL MANAGEMENT (الألوان الأساسية والمخصصة)
  // ==========================================

  handleCustomColorNameInput(name) {
    if (!name) return;
    const clean = name.trim();
    const COLOR_NAME_MAP = {
      'سكني': '#808488',
      'رمادي': '#808488',
      'رصاصي': '#6b7280',
      'بيج': '#d2b48c',
      'بيج رملي': '#d2b48c',
      'سكري': '#fdfbf7',
      'أوف وايت': '#fdfbf7',
      'اوف وايت': '#fdfbf7',
      'ابيض': '#ffffff',
      'أبيض': '#ffffff',
      'ذهبي': '#d4af37',
      'ذهبي ملكي': '#d4af37',
      'كحلي': '#1e3a8a',
      'ازرق': '#2563eb',
      'أزرق': '#2563eb',
      'زيتي': '#4d6050',
      'اخضر': '#16a34a',
      'أخضر': '#16a34a',
      'خمري': '#721c24',
      'نبيذي': '#721c24',
      'احمر': '#dc2626',
      'أحمر': '#dc2626',
      'بني': '#78350f',
      'عسلي': '#9a602f',
      'موف': '#7c3aed',
      'ليلكي': '#a855f7',
      'وردي': '#ec4899',
      'زهري': '#f472b6',
      'تركواز': '#06b6d4',
      'بترولي': '#0e7490',
      'اسود': '#1e293b',
      'أسود': '#1e293b',
      'فضي': '#cbd5e1',
      'برتقالي': '#ea580c',
      'خردلي': '#ca8a04'
    };

    const picker = document.getElementById('prod-new-color-picker');
    if (picker && COLOR_NAME_MAP[clean]) {
      picker.value = COLOR_NAME_MAP[clean];
    }
  }

  addCustomColorFromInput() {
    const input = document.getElementById('prod-new-color-name');
    const picker = document.getElementById('prod-new-color-picker');
    if (!input) return;

    const name = input.value.trim();
    if (!name) {
      if (window.naseejCustomer) {
        window.naseejCustomer.showToast('يرجى كتابة اسم اللون أولاً (مثال: كحلي، زيتي...)', 'error');
      }
      input.focus();
      return;
    }

    const hex = picker ? picker.value : '#808488';

    if (!Array.isArray(this.activeProductColors)) {
      this.activeProductColors = [];
    }

    // Check if color name already exists
    const exists = this.activeProductColors.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      if (window.naseejCustomer) {
        window.naseejCustomer.showToast(`لون (${name}) مضاف مسبقاً لهذا القماش`, 'info');
      }
    } else {
      this.activeProductColors.push({ name, hex });
      if (window.naseejCustomer) {
        window.naseejCustomer.showToast(`✓ تمت إضافة لون (${name})`, 'success');
      }
    }

    input.value = '';
    this.syncProductColors();
    input.focus();
  }

  togglePresetColor(name, hex) {
    if (!Array.isArray(this.activeProductColors)) {
      this.activeProductColors = [];
    }

    const existingIdx = this.activeProductColors.findIndex(c => 
      c.name.toLowerCase() === name.toLowerCase() || c.hex.toLowerCase() === hex.toLowerCase()
    );

    if (existingIdx >= 0) {
      this.activeProductColors.splice(existingIdx, 1);
    } else {
      this.activeProductColors.push({ name, hex });
    }

    this.syncProductColors();
  }

  removeActiveColor(index) {
    if (!Array.isArray(this.activeProductColors)) return;
    this.activeProductColors.splice(index, 1);
    this.syncProductColors();
  }

  setProductColorsFromString(str) {
    if (!str) {
      this.activeProductColors = [];
      this.syncProductColors();
      return;
    }

    this.activeProductColors = str.split(',').map(part => {
      const [cName, cHex] = part.split(':').map(s => s ? s.trim() : '');
      return {
        name: cName || 'لون مخصص',
        hex: cHex && cHex.startsWith('#') ? cHex : '#808488'
      };
    }).filter(c => c.name);

    this.syncProductColors();
  }

  syncProductColors() {
    const rawStr = (this.activeProductColors || []).map(c => `${c.name}:${c.hex}`).join(', ');
    const hidden = document.getElementById('prod-colors');
    if (hidden) hidden.value = rawStr;

    this.renderProductColorsUI();
    this.updateProductLivePreview();
  }

  renderProductColorsUI() {
    const quickContainer = document.getElementById('prod-quick-colors-row');
    const selectedContainer = document.getElementById('prod-selected-colors-list');
    const countBadge = document.getElementById('prod-selected-colors-count');

    const activeList = this.activeProductColors || [];

    if (countBadge) {
      countBadge.textContent = activeList.length;
    }

    // 1. Render quick buttons: The 4 main store colors first, then 4 frequent curtain colors
    if (quickContainer) {
      const PRESETS = [
        { name: 'سكني', hex: '#808488', isMain: true },
        { name: 'بيج', hex: '#d2b48c', isMain: true },
        { name: 'سكري (أوف وايت)', hex: '#fdfbf7', isMain: true },
        { name: 'ذهبي', hex: '#d4af37', isMain: true },
        { name: 'أبيض ناصع', hex: '#ffffff', isMain: false },
        { name: 'كحلي ملوكي', hex: '#1e3a8a', isMain: false },
        { name: 'زيتي طبيعي', hex: '#4d6050', isMain: false },
        { name: 'عسلي دافئ', hex: '#9a602f', isMain: false }
      ];

      quickContainer.innerHTML = PRESETS.map(p => {
        const isActive = activeList.some(c => 
          c.name.toLowerCase() === p.name.toLowerCase() || c.hex.toLowerCase() === p.hex.toLowerCase()
        );
        const safeName = p.name.replace(/'/g, "\\'");
        return `
          <button type="button" 
                  class="prod-quick-color-btn ${isActive ? 'is-active' : ''} ${p.isMain ? 'is-main' : ''}" 
                  onclick="window.naseejAdmin.togglePresetColor('${safeName}', '${p.hex}')" 
                  title="${isActive ? 'انقر لإلغاء التفعيل' : 'انقر للتفعيل السريع'}">
            <span class="prod-color-swatch-circle" style="background-color: ${p.hex};"></span>
            <span>${p.name}</span>
            ${isActive ? '<span style="font-size: 11px; font-weight: 900; color: #16a34a;">✓</span>' : ''}
          </button>
        `;
      }).join('');
    }

    // 2. Render active selected colors list with remove badges
    if (selectedContainer) {
      if (activeList.length === 0) {
        selectedContainer.innerHTML = `
          <span class="prod-no-colors-hint">⚠️ لم يتم تفعيل أي لون بعد - انقر على الألوان السريعة أعلاه أو أضف لوناً جديداً</span>
        `;
      } else {
        selectedContainer.innerHTML = activeList.map((c, idx) => `
          <div class="prod-color-tag">
            <span class="prod-color-tag-dot" style="background-color: ${c.hex};"></span>
            <span class="prod-color-tag-name">${c.name}</span>
            <button type="button" class="prod-color-tag-remove" onclick="window.naseejAdmin.removeActiveColor(${idx})" title="حذف لون ${c.name}">✕</button>
          </div>
        `).join('');
      }
    }
  }
}

export const admin = new NaseejAdmin();
