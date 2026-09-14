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

    // Showroom Walk-in Multi-Window Items State
    this.walkinItems = [];

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
      this.renderWeeklySchedule();
      this.renderInstallationSchedule();
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
      const itemsList = (order.items || []).map(i => `
        <div class="admin-order-item-row">
          • ${i.roomName ? `<span style="background: #e0f2fe; color: #0369a1; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-left: 4px;">🪟 ${i.roomName}</span>` : ''}
          <strong>${i.productName}</strong> (${i.color}) ${i.sewingType ? `<span style="color:#b45309; font-weight:700; font-size:11.5px;">[${i.sewingType}]</span>` : ''} - <span class="badge-meters-count">${i.meters} ${i.unitLabel || 'متر'}</span>
          ${i.notes ? `<small class="text-muted d-block">${i.notes}</small>` : ''}
        </div>
      `).join('');

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
    if (monthSelect && monthSelect.value != start.monthNum) {
      this.currentScheduleMonth = start.monthNum;
      monthSelect.value = start.monthNum;
    }
  }

  handleMonthChange(monthNum) {
    this.currentScheduleMonth = parseInt(monthNum);
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
    const btnWeekly = document.getElementById('btn-mode-weekly');
    const btnMonthly = document.getElementById('btn-mode-monthly');
    const weeklyTailoring = document.getElementById('admin-subview-tailoring');
    const weeklyInstall = document.getElementById('admin-subview-installation');
    const monthlyView = document.getElementById('admin-view-monthly-calendar');

    if (btnWeekly) btnWeekly.classList.toggle('active', mode === 'weekly');
    if (btnMonthly) btnMonthly.classList.toggle('active', mode === 'monthly');

    if (mode === 'monthly') {
      if (weeklyTailoring) weeklyTailoring.style.display = 'none';
      if (weeklyInstall) weeklyInstall.style.display = 'none';
      if (monthlyView) {
        monthlyView.style.display = 'block';
        this.renderMonthlyCalendar();
      }
    } else {
      if (monthlyView) monthlyView.style.display = 'none';
      this.switchScheduleSubTab(this.currentScheduleSubTab);
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
        const fabricsSummary = (order.items || []).map(i => `${i.roomName ? `[${i.roomName}] ` : ''}${i.productName} (${i.color}) ${i.meters}${i.unitLabel || 'م'}`).join(' + ');

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

  // Switch Schedule Sub-Tab (Tailoring Workshop vs Installation Board)
  switchScheduleSubTab(subTab) {
    this.currentScheduleSubTab = subTab;
    const btnTailoring = document.getElementById('btn-schedule-tailoring');
    const btnInstallation = document.getElementById('btn-schedule-installation');
    const viewTailoring = document.getElementById('admin-subview-tailoring');
    const viewInstallation = document.getElementById('admin-subview-installation');
    const monthlyView = document.getElementById('admin-view-monthly-calendar');

    if (monthlyView) monthlyView.style.display = 'none';
    const btnWeekly = document.getElementById('btn-mode-weekly');
    const btnMonthly = document.getElementById('btn-mode-monthly');
    if (btnWeekly) btnWeekly.classList.add('active');
    if (btnMonthly) btnMonthly.classList.remove('active');
    this.calendarViewMode = 'weekly';

    if (btnTailoring) btnTailoring.classList.toggle('active', subTab === 'tailoring');
    if (btnInstallation) btnInstallation.classList.toggle('active', subTab === 'installation');
    if (viewTailoring) viewTailoring.style.display = subTab === 'tailoring' ? 'block' : 'none';
    if (viewInstallation) viewInstallation.style.display = subTab === 'installation' ? 'block' : 'none';

    if (subTab === 'tailoring') this.renderWeeklySchedule();
    if (subTab === 'installation') this.renderInstallationSchedule();
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
      const statusLabel = newStatus === 'completed' ? 'تم التركيب بنجاح ✅' : 'مجدول ⏳';
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
              <span class="badge-install-status ${isCompleted ? 'completed' : 'scheduled'}">
                ${isCompleted ? 'تم التركيب ✓' : 'مجدول ⏳'}
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
    return {
      id: 'w_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      roomName: roomName,
      productId: defaultProduct.id,
      productName: defaultProduct.name,
      color: defaultColor,
      meters: 8,
      unitPrice: defaultProduct.pricePerMeter || 65,
      unitLabel: defaultProduct.category === 'tarsoon' ? 'م²' : 'متر',
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
        item.unitLabel = product.category === 'tarsoon' ? 'م²' : 'متر';
        if (product.colors && product.colors[0]) {
          item.color = product.colors[0].name;
        }
        // Update DOM inputs directly without losing focus
        const priceInput = document.getElementById(`walkin-item-price-${index}`);
        const colorInput = document.getElementById(`walkin-item-color-${index}`);
        const unitBadge = document.getElementById(`walkin-item-unit-${index}`);
        if (priceInput) priceInput.value = item.unitPrice;
        if (colorInput) colorInput.value = item.color;
        if (unitBadge) unitBadge.textContent = item.unitLabel;
      }
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
    const itemSubtotal = Math.round((item.meters || 0) * (item.unitPrice || 0));
    const subtotalEl = document.getElementById(`walkin-item-subtotal-${index}`);
    if (subtotalEl) {
      subtotalEl.innerHTML = `المجموع: <strong>${itemSubtotal.toLocaleString()} ₪</strong> (${item.meters} ${item.unitLabel} × ${item.unitPrice} ₪)`;
    }

    this.recalcWalkinTotal();
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
      const itemSubtotal = Math.round((item.meters || 0) * (item.unitPrice || 0));

      const fabricOptions = products.map(p => `
        <option value="${p.id}" ${p.id === item.productId ? 'selected' : ''}>
          ${p.name} (${p.pricePerMeter} ₪ / ${p.category === 'tarsoon' ? 'م²' : 'متر'})
        </option>
      `).join('');

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
              <label class="form-label" style="font-size: 11.5px; margin-bottom: 4px;">نوع قماش الشباك *</label>
              <select class="form-control" style="font-size: 12.5px; height: 36px; padding: 4px 8px;" onchange="window.naseejAdmin.updateWalkinItem(${idx}, 'productId', this.value)">
                ${fabricOptions}
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 11.5px; margin-bottom: 4px;">اللون المختار</label>
              <input type="text" id="walkin-item-color-${idx}" class="form-control" style="font-size: 12.5px; height: 36px; padding: 4px 8px;" value="${item.color}" placeholder="مثال: بيج / أوف وايت" oninput="window.naseejAdmin.updateWalkinItem(${idx}, 'color', this.value)">
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 11.5px; margin-bottom: 4px; display: flex; justify-content: space-between;">
                <span>الأمتار المطلوبة *</span>
                <span id="walkin-item-unit-${idx}" style="color: #64748b; font-weight: normal;">${item.unitLabel}</span>
              </label>
              <input type="number" class="form-control" style="font-size: 13px; height: 36px; padding: 4px 8px; font-weight: 700;" value="${item.meters}" step="0.5" min="0.5" required oninput="window.naseejAdmin.updateWalkinItem(${idx}, 'meters', this.value)">
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 11.5px; margin-bottom: 4px;">سعر المتر (₪) *</label>
              <input type="number" id="walkin-item-price-${idx}" class="form-control" style="font-size: 13px; height: 36px; padding: 4px 8px; font-weight: 700;" value="${item.unitPrice}" min="1" required oninput="window.naseejAdmin.updateWalkinItem(${idx}, 'unitPrice', this.value)">
            </div>
          </div>

          <div class="walkin-item-footer">
            <input type="text" class="form-control walkin-item-notes-input" value="${item.notes}" placeholder="ملاحظة خاصة بهذا الشباك (ارتفاع، تفصيل كسرات، إضافات...)" oninput="window.naseejAdmin.updateWalkinItem(${idx}, 'notes', this.value)">
            
            <div class="walkin-item-total-badge" id="walkin-item-subtotal-${idx}">
              المجموع: <strong>${itemSubtotal.toLocaleString()} ₪</strong> (${item.meters} ${item.unitLabel} × ${item.unitPrice} ₪)
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

      return {
        productId: item.productId,
        productName: product.name,
        roomName: item.roomName || `شباك ${index + 1}`,
        color: item.color || 'بيج رملي',
        sewingType: 'تفصيل وخياطة متقنة',
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
            <strong>رقم الطلب:</strong> ${order.id}<br>
            <strong>تاريخ ويوم القص بالورشة:</strong> <span style="color:#b45309; font-weight:bold;">يوم ${order.scheduledDay || 'السبت'} ${order.scheduledDate ? `(${order.scheduledDate})` : ''}</span><br>
            ${order.requiresInstallation ? `<strong>موعد وفني التركيب:</strong> <span style="color:#2563eb; font-weight:bold;">${order.installerName || 'فني معتمد'} - يوم ${order.installationDay || ''} ${order.installationDate ? `(${order.installationDate})` : ''}</span><br>` : ''}
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
            ${(order.items || []).map(i => `
              <tr>
                <td>
                  <strong>${i.productName}</strong>
                  ${i.roomName ? `<div style="color: #0284c7; font-size: 12px; font-weight: bold; margin-top: 2px;">🪟 الغرفة: ${i.roomName}</div>` : ''}
                  ${i.sewingType ? `<div style="color:#b45309; font-size:12px; font-weight:bold; margin-top: 2px;">[${i.sewingType}]</div>` : ''}
                  <small style="color:#475569;">${i.notes || ''}</small>
                </td>
                <td>${i.color}</td>
                <td><strong>${i.meters} ${i.unitLabel || 'متر'}</strong></td>
                <td>${i.pricePerMeter} شيكل</td>
                <td>${i.total.toLocaleString()} شيكل</td>
              </tr>
            `).join('')}
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
    if (el('prod-category')) el('prod-category').value = preset.category;
    if (el('prod-price')) el('prod-price').value = preset.price;
    if (el('prod-width')) el('prod-width').value = preset.width;
    if (el('prod-stock')) el('prod-stock').value = preset.stock;
    if (el('prod-origin')) el('prod-origin').value = preset.origin;
    if (el('prod-composition')) el('prod-composition').value = preset.composition;
    if (el('prod-light')) el('prod-light').value = preset.light;
    if (el('prod-colors')) el('prod-colors').value = preset.colors;
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

    if (previewColors && colors) {
      const parts = colors.split(',').slice(0, 4);
      previewColors.innerHTML = parts.map(p => {
        const [cName, cHex] = p.split(':').map(s => s ? s.trim() : '');
        return `<span class="preview-color-dot" style="background-color: ${cHex && cHex.startsWith('#') ? cHex : '#d4af37'};" title="${cName || ''}"></span>`;
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
    document.getElementById('prod-category').value = product.category;
    document.getElementById('prod-price').value = product.pricePerMeter;
    document.getElementById('prod-width').value = product.rollWidth;
    document.getElementById('prod-stock').value = product.stockMeters;
    document.getElementById('prod-origin').value = product.origin;
    document.getElementById('prod-composition').value = product.composition;
    document.getElementById('prod-light').value = product.lightBlockage;
    document.getElementById('prod-desc').value = product.description;
    document.getElementById('prod-image-url').value = product.image;
    document.getElementById('prod-image-preview').src = product.image;

    const colorsStr = (product.colors || []).map(c => `${c.name}:${c.hex}`).join(', ');
    document.getElementById('prod-colors').value = colorsStr;

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
    const category = document.getElementById('prod-category').value;
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
    const categoryName = foundCat ? foundCat.name : (categoryNames[category] || 'أقمشة ستائر ومفروشات');

    // Parse colors string e.g. "بيج:#d2b48c, أبيض:#ffffff"
    let parsedColors = [];
    if (colorsInput) {
      parsedColors = colorsInput.split(',').map(part => {
        const [cName, cHex] = part.split(':').map(s => s ? s.trim() : '');
        return {
          name: cName || 'لون مخصص',
          hex: cHex && cHex.startsWith('#') ? cHex : '#b58b4c'
        };
      });
    }
    if (parsedColors.length === 0) {
      parsedColors = [{ name: 'بيج رملي', hex: '#d2b48c' }, { name: 'أوف وايت', hex: '#fdfbf7' }];
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

  populateCategorySelect() {
    const select = document.getElementById('prod-category');
    if (!select) return;

    const currentVal = select.value;
    const categories = store.getCategories().filter(c => c.id !== 'all');

    select.innerHTML = categories.map(c => `
      <option value="${c.id}">${c.icon ? c.icon + ' ' : ''}${c.name}</option>
    `).join('');

    if (currentVal && categories.some(c => c.id === currentVal)) {
      select.value = currentVal;
    }
  }
}

export const admin = new NaseejAdmin();
