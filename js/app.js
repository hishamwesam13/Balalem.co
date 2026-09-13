/**
 * BALALEM CO & NASEEJ LUXURY CURTAIN FABRICS - MAIN APPLICATION CONTROLLER
 * Connects Store, Auth, Customer Storefront, and Admin Dashboard with strict RBAC.
 */
import { store } from './store.js';
import { auth, MASTER_ADMIN } from './auth.js';
import { customer } from './customer.js';
import { admin } from './admin.js';

// Expose globals for intuitive inline HTML event triggers
window.naseejStore = store;
window.naseejAuth = auth;
window.naseejCustomer = customer;
window.naseejAdmin = admin;

class NaseejApp {
  constructor() {
    this.currentView = 'storefront'; // 'storefront' or 'admin'
  }

  init() {
    console.log('Initializing Balalem Co Luxury Curtain Fabrics Platform...');

    // Render Initial Catalog & UI
    customer.renderCatalog();
    customer.updateCartBadges();
    customer.updateUserUI();

    // Bind Event Listeners
    this.bindEvents();

    // Check if URL or storage requests admin view
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') === 'admin') {
      if (auth.isAdmin()) {
        this.switchView('admin');
      } else {
        // Block unauthorized access attempt
        customer.showToast('عذراً! منطقة الإدارة مخصصة لمدير النظام فقط. يرجى تسجيل الدخول بحساب الإدارة', 'warning');
        this.switchView('storefront');
        customer.openAuthModal('login');
      }
    } else {
      this.switchView('storefront');
    }
  }

  /**
   * Switch between Storefront and Admin views with strict RBAC guard
   * @param {string} viewName - 'storefront' or 'admin'
   */
  switchView(viewName) {
    const storeSection = document.getElementById('storefront-view');
    const adminSection = document.getElementById('admin-view');

    if (viewName === 'admin') {
      // SECURITY GUARD: Check if current authenticated user is Master Admin
      if (!auth.isAdmin()) {
        customer.showToast('عذراً! لوحة تحكم المسؤول محمية وتتطلب تسجيل الدخول بحساب مدير النظام', 'error');
        customer.openAuthModal('login');
        return false;
      }

      this.currentView = 'admin';
      if (storeSection) storeSection.style.display = 'none';
      if (adminSection) adminSection.style.display = 'block';

      // Update admin header bar user info
      const adminNameEl = document.getElementById('admin-profile-name');
      if (adminNameEl) {
        adminNameEl.textContent = auth.getCurrentUser()?.name || 'مدير النظام';
      }

      admin.init();
      admin.renderAll();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    } else {
      this.currentView = 'storefront';
      if (storeSection) storeSection.style.display = 'block';
      if (adminSection) adminSection.style.display = 'none';

      customer.renderCatalog();
      customer.updateUserUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    }
  }

  // Helper method to open Admin view
  openAdminView() {
    this.switchView('admin');
  }

  // Helper method to return to Storefront
  openStorefrontView() {
    this.switchView('storefront');
  }

  // User logout from any view
  logoutUser() {
    const wasAdmin = auth.isAdmin();
    auth.logout();
    customer.showToast(wasAdmin ? 'تم تسجيل الخروج من حساب الإدارة بنجاح' : 'تم تسجيل الخروج بنجاح، نتطلع لزيارتكم مجدداً', 'info');
    this.switchView('storefront');
  }

  bindEvents() {
    // Header Live Search Input
    const headerSearch = document.getElementById('header-search-input');
    if (headerSearch) {
      headerSearch.addEventListener('input', (e) => {
        customer.searchQuery = e.target.value;
        customer.renderCatalog();
        const catalogEl = document.getElementById('fabrics-catalog-section');
        if (catalogEl && e.target.value.trim().length > 1) {
          catalogEl.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Modal background click to close
    document.querySelectorAll('.naseej-modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });

    // ESC key closes any open modal, drawer, or dropdown
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.naseej-modal.active').forEach(m => m.classList.remove('active'));
        customer.closeCartDrawer();
        customer.closeAccountDropdown();
        document.body.style.overflow = '';
      }
    });

    // Close account dropdown on outside click
    document.addEventListener('click', (e) => {
      const dropdownWrap = document.getElementById('header-account-wrap');
      if (dropdownWrap && !dropdownWrap.contains(e.target)) {
        customer.closeAccountDropdown();
      }
    });

    // Reactive Updates
    window.addEventListener('naseej:products_updated', () => {
      customer.renderCatalog();
      if (auth.isAdmin() && this.currentView === 'admin') {
        admin.renderAll();
      }
    });

    window.addEventListener('naseej:auth_changed', () => {
      customer.updateUserUI();
    });
  }
}

export const app = new NaseejApp();
window.naseejApp = app;

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
