/**
 * BALALEM CO & NASEEJ LUXURY CURTAIN FABRICS - AUTHENTICATION & RBAC MODULE
 * Handles secure authentication, distinct Admin & Customer roles, and session persistence.
 */
import { store } from './store.js';

const SESSION_KEY = 'balalem_auth_session';
const CUSTOMERS_DB_KEY = 'balalem_registered_users_db';

// Hardcoded Master Admin Credentials
export const MASTER_ADMIN = {
  username: 'admin',
  email: 'admin@balalem.com',
  password: 'Balalem@2026',
  role: 'admin',
  name: 'مدير النظام (Balalem Co)',
  phone: '0599842231',
  title: 'مدير العمليات والمخزون'
};

class BalalemAuth {
  constructor() {
    this.session = this.loadSession();
    this.initUsersDatabase();
  }

  // Load current active session from localStorage
  loadSession() {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data);
      // Validate session structure
      if (parsed && parsed.userId && parsed.role) {
        return parsed;
      }
      return null;
    } catch (e) {
      console.error('Error loading auth session:', e);
      return null;
    }
  }

  // Save active session
  saveSession(sessionData) {
    this.session = sessionData;
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    window.dispatchEvent(new CustomEvent('naseej:auth_changed', { detail: sessionData }));
  }

  // Initialize customer users database
  initUsersDatabase() {
    try {
      if (!localStorage.getItem(CUSTOMERS_DB_KEY)) {
        // Seed an initial demo customer account
        const initialUsers = [
          {
            id: 'cust-demo-1',
            name: 'أحمد ناصر التميمي',
            phone: '0599123456',
            email: 'ahmad@example.com',
            password: 'User@1234',
            city: 'نابلس',
            points: 350,
            role: 'customer',
            createdAt: new Date().toISOString()
          }
        ];
        localStorage.setItem(CUSTOMERS_DB_KEY, JSON.stringify(initialUsers));
      }
    } catch (e) {
      console.error('Error initializing users db:', e);
    }
  }

  getRegisteredUsers() {
    try {
      const data = localStorage.getItem(CUSTOMERS_DB_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveRegisteredUsers(users) {
    localStorage.setItem(CUSTOMERS_DB_KEY, JSON.stringify(users));
  }

  getUserPoints(identifier) {
    if (!identifier) return 0;
    const users = this.getRegisteredUsers();
    const cleanId = identifier.toString().replace(/[^0-9]/g, '');
    const user = users.find(u => 
      u.id === identifier || 
      (u.phone && u.phone.replace(/[^0-9]/g, '') === cleanId) ||
      (u.email && u.email.toLowerCase() === identifier.toLowerCase())
    );
    return user ? (user.points || 0) : 0;
  }

  updateUserPoints(identifier, deltaPoints) {
    if (!identifier) return 0;
    const users = this.getRegisteredUsers();
    const cleanId = identifier.toString().replace(/[^0-9]/g, '');
    const user = users.find(u => 
      u.id === identifier || 
      (u.phone && u.phone.replace(/[^0-9]/g, '') === cleanId) ||
      (u.email && u.email.toLowerCase() === identifier.toLowerCase())
    );
    if (!user) return 0;
    user.points = Math.max(0, (user.points || 0) + deltaPoints);
    this.saveRegisteredUsers(users);

    if (this.session && (this.session.userId === user.id || this.session.phone === user.phone)) {
      this.session.points = user.points;
      this.saveSession(this.session);
    }
    return user.points;
  }

  /**
   * Unified Login: Checks if Admin or Customer
   * @param {string} identifier - Email, Username, or Phone
   * @param {string} password - User password
   * @returns {Object} session data
   */
  login(identifier, password) {
    if (!identifier || !identifier.trim()) {
      throw new Error('يرجى إدخال البريد الإلكتروني، اسم المستخدم، أو رقم الهاتف');
    }
    if (!password || !password.trim()) {
      throw new Error('يرجى إدخال كلمة المرور');
    }

    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Check if Master Admin
    const isAdminMatch = (cleanId === MASTER_ADMIN.username.toLowerCase() || cleanId === MASTER_ADMIN.email.toLowerCase()) && 
                         cleanPass === MASTER_ADMIN.password;

    if (isAdminMatch) {
      const adminSession = {
        userId: 'admin-master',
        name: MASTER_ADMIN.name,
        email: MASTER_ADMIN.email,
        phone: MASTER_ADMIN.phone,
        role: 'admin',
        title: MASTER_ADMIN.title,
        token: 'adm_sec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        loginTime: new Date().toISOString()
      };
      this.saveSession(adminSession);
      return adminSession;
    }

    // 2. Check Customer Users Database
    const users = this.getRegisteredUsers();
    const customer = users.find(u => 
      (u.email && u.email.toLowerCase() === cleanId) || 
      (u.phone && u.phone.replace(/[^0-9]/g, '') === cleanId.replace(/[^0-9]/g, ''))
    );

    if (customer) {
      if (customer.password !== cleanPass) {
        throw new Error('كلمة المرور غير صحيحة، يرجى التحقق وإعادة المحاولة');
      }

      const customerSession = {
        userId: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        city: customer.city || 'نابلس',
        points: customer.points || 0,
        role: 'customer',
        token: 'cust_sec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        loginTime: new Date().toISOString()
      };

      this.saveSession(customerSession);
      // Ensure customer is registered in store
      store.registerCustomer(customerSession);
      return customerSession;
    }

    // If identifier looks like admin attempt with wrong password
    if (cleanId === MASTER_ADMIN.username.toLowerCase() || cleanId === MASTER_ADMIN.email.toLowerCase()) {
      throw new Error('بيانات مدير النظام غير متطابقة، يرجى التأكد من كلمة المرور');
    }

    throw new Error('الحساب غير موجود، يرجى التحقق من البيانات أو إنشاء حساب عميل جديد');
  }

  /**
   * Register a new Customer (Role is strictly 'customer')
   * @param {Object} data { name, phone, email, password, city }
   * @returns {Object} session data
   */
  registerCustomer({ name, phone, email, password, city = 'نابلس' }) {
    if (!name || !name.trim()) {
      throw new Error('يرجى إدخال اسم العميل الكريم');
    }
    if (!phone || !phone.trim() || phone.trim().length < 8) {
      throw new Error('يرجى إدخال رقم هاتف صحيح للتواصل (مثال: 0599842231)');
    }
    if (!email || !email.trim() || !email.includes('@')) {
      throw new Error('يرجى إدخال بريد إلكتروني صحيح');
    }
    if (!password || password.trim().length < 5) {
      throw new Error('يجب ألا تقل كلمة المرور عن 5 أحرف أو أرقام');
    }

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    const cleanCity = city.trim();

    // Prevent registering with admin email/username
    if (cleanEmail === MASTER_ADMIN.email.toLowerCase() || cleanEmail === MASTER_ADMIN.username.toLowerCase()) {
      throw new Error('هذا البريد مخصص لإدارة النظام ولا يمكن استخدامه لإنشاء حساب عميل');
    }

    const users = this.getRegisteredUsers();

    // Check existing
    const existing = users.find(u => 
      u.email.toLowerCase() === cleanEmail || 
      u.phone.replace(/[^0-9]/g, '') === cleanPhone.replace(/[^0-9]/g, '')
    );

    if (existing) {
      throw new Error('يوجد حساب مسجل مسبقاً بهذا البريد أو رقم الهاتف، يمكنك تسجيل الدخول مباشرة');
    }

    const newUser = {
      id: 'cust-' + cleanPhone.replace(/[^0-9]/g, '') + '-' + Date.now().toString(36),
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      password: cleanPass,
      city: cleanCity,
      points: 0,
      role: 'customer',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveRegisteredUsers(users);

    // Automatically log in the newly registered customer
    const session = {
      userId: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      city: newUser.city,
      points: 0,
      role: 'customer',
      token: 'cust_sec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      loginTime: new Date().toISOString()
    };

    this.saveSession(session);
    store.registerCustomer(session);
    return session;
  }

  // Logout current user (Admin or Customer)
  logout() {
    localStorage.removeItem(SESSION_KEY);
    this.session = null;
    window.dispatchEvent(new CustomEvent('naseej:auth_changed', { detail: null }));
    window.dispatchEvent(new CustomEvent('naseej:view_mode_changed', { detail: { isAdmin: false } }));
  }

  getCurrentUser() {
    return this.session;
  }

  isAuthenticated() {
    return Boolean(this.session && this.session.userId);
  }

  isAdmin() {
    return Boolean(this.session && this.session.role === 'admin');
  }

  isCustomer() {
    return Boolean(this.session && this.session.role === 'customer');
  }

  // Backward compatibility methods for store & admin modules
  isAdminMode() {
    return this.isAdmin();
  }

  setAdminMode(status) {
    if (status && !this.isAdmin()) {
      console.warn('Unauthorized attempt to set admin mode');
      return false;
    }
    return true;
  }
}

export const auth = new BalalemAuth();
