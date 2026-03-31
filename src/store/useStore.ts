import { create } from 'zustand';
import { api, setToken } from '@/lib/api';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'shipped' | 'delivered' | 'cancelled';
export type OrderType = 'delivery' | 'pickup' | 'dine-in';
export type PaymentMethod = 'cash' | 'transfer' | 'card';
export type UserRole = 'admin' | 'cashier' | 'kitchen';

export interface Category {
  id: number;
  name: string;
  emoji: string;
  color: string;
}

export interface Product {
  id: number;
  name: string;
  categoryId: number;
  price: number;
  available: boolean;
  image: string | null;
  description?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
  notes: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string;
  tag: 'frequent' | 'new' | 'regular';
}

export interface OrderItem {
  productId: number;
  name: string;
  quantity: number;
  price: number;
  notes: string;
}

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  customer: { name: string; phone?: string; address?: string };
  tableNumber?: number;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
  driverId?: number;
  receiptImage?: string;
  notes?: string;
}

export interface Driver {
  id: number;
  name: string;
  phone: string;
  available: boolean;
}

interface AppState {
  user: { name: string; role: UserRole } | null;
  restoring: boolean;
  categories: Category[];
  products: Product[];
  customers: Customer[];
  orders: Order[];
  drivers: Driver[];
  deliveryFee: number;
  tableCount: number;
  initialized: boolean;
  sidebarCollapsed: boolean;

  // Auth
  loginWithCredentials: (username: string, password: string) => Promise<void>;
  login: (role: UserRole) => void;
  logout: () => void;
  restoreSession: () => Promise<void>;

  // Data loading
  initialize: () => Promise<void>;
  refreshOrders: () => Promise<void>;

  // Orders
  addOrder: (order: Omit<Order, 'id' | 'createdAt'>) => Promise<number>;
  updateOrderStatus: (id: number, status: OrderStatus) => void;
  updatePaymentStatus: (id: number, paymentStatus: 'pending' | 'paid', paymentMethod?: PaymentMethod) => void;
  updateOrderCustomer: (id: number, data: { name?: string; phone?: string; address?: string }) => void;
  updateOrderNotes: (id: number, notes: string) => void;
  uploadReceipt: (id: number, receiptImage: string) => void;
  assignDriver: (orderId: number, driverId: number) => void;
  deleteOrder: (id: number) => void;
  deleteOrders: (ids: number[]) => void;
  updateOrdersStatus: (ids: number[], status: OrderStatus) => void;

  // Products
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: number, data: Partial<Product>) => void;
  toggleProductAvailability: (id: number) => void;

  // Customers
  addCustomer: (customer: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'lastOrder' | 'tag'>) => void;
  updateCustomer: (id: number, data: Partial<Customer>) => void;
  deleteCustomer: (id: number) => void;
  findCustomerByPhone: (phone: string) => Customer | undefined;

  // Drivers
  addDriver: (driver: Omit<Driver, 'id'>) => void;
  updateDriver: (id: number, data: Partial<Driver>) => void;
  deleteDriver: (id: number) => void;

  // UI
  toggleSidebar: () => void;

  // Socket handler
  handleOrderEvent: (order: Order) => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  restoring: true,
  categories: [],
  products: [],
  customers: [],
  orders: [],
  drivers: [],
  deliveryFee: 3000,
  tableCount: 12,
  initialized: false,
  sidebarCollapsed: false,

  loginWithCredentials: async (username, password) => {
    const { token, user } = await api.login(username, password);
    setToken(token);
    set({ user: { name: user.name, role: user.role as UserRole } });
    await get().initialize();
  },

  login: (role) => {
    const creds: Record<string, [string, string]> = {
      admin: ['admin', 'admin123'],
      cashier: ['cajero', 'cajero123'],
      kitchen: ['cocina', 'cocina123'],
    };
    const [u, p] = creds[role];
    get().loginWithCredentials(u, p).catch(console.error);
  },

  logout: () => {
    setToken(null);
    set({ user: null, restoring: false, initialized: false, categories: [], products: [], customers: [], orders: [], drivers: [] });
  },

  restoreSession: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ restoring: false });
      return;
    }
    try {
      // Decode JWT payload (base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        setToken(null);
        set({ restoring: false });
        return;
      }
      set({ user: { name: payload.name, role: payload.role as UserRole }, restoring: false });
      await get().initialize();
    } catch {
      setToken(null);
      set({ restoring: false });
    }
  },

  initialize: async () => {
    try {
      const [categories, products, customers, orders, settings, drivers] = await Promise.all([
        api.getCategories(),
        api.getProducts(),
        api.getCustomers(),
        api.getOrders(),
        api.getSettings(),
        api.getDrivers(),
      ]);
      set({
        categories,
        products,
        customers,
        orders,
        drivers,
        deliveryFee: settings.deliveryFee || 3000,
        tableCount: settings.tableCount || 12,
        initialized: true,
      });
    } catch (err) {
      console.error('Error initializing data:', err);
    }
  },

  refreshOrders: async () => {
    try {
      const orders = await api.getOrders();
      set({ orders });
    } catch (err) {
      console.error('Error refreshing orders:', err);
    }
  },

  addOrder: async (order) => {
    try {
      const created = await api.addOrder(order);
      // Add only if not already present (socket may have added it)
      set(s => {
        if (s.orders.some(o => o.id === created.id)) return s;
        return { orders: [created, ...s.orders] };
      });
      return created.id;
    } catch (err) {
      console.error('Error creating order:', err);
      return -1;
    }
  },

  updateOrderStatus: (id, status) => {
    set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, status } : o) }));
    api.updateOrderStatus(id, status).catch(err => {
      console.error('Error updating order status:', err);
      get().refreshOrders();
    });
  },

  updatePaymentStatus: (id, paymentStatus, paymentMethod) => {
    set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, paymentStatus, ...(paymentMethod ? { paymentMethod } : {}) } : o) }));
    api.updatePaymentStatus(id, paymentStatus, paymentMethod).catch(err => {
      console.error('Error updating payment status:', err);
      get().refreshOrders();
    });
  },

  updateOrderCustomer: (id, data) => {
    set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, customer: { ...o.customer, ...data } } : o) }));
    api.updateOrderCustomer(id, data).catch(err => {
      console.error('Error updating order customer:', err);
      get().refreshOrders();
    });
  },

  uploadReceipt: (id, receiptImage) => {
    set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, receiptImage } : o) }));
    api.uploadReceipt(id, receiptImage).catch(err => {
      console.error('Error uploading receipt:', err);
    });
  },

  updateOrderNotes: (id, notes) => {
    set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, notes } : o) }));
    api.updateOrderNotes(id, notes).catch(err => {
      console.error('Error updating order notes:', err);
    });
  },

  assignDriver: (orderId, driverId) => {
    set(s => ({ orders: s.orders.map(o => o.id === orderId ? { ...o, driverId } : o) }));
    api.assignDriver(orderId, driverId).catch(console.error);
  },

  deleteOrder: (id) => {
    set(s => ({ orders: s.orders.filter(o => o.id !== id) }));
    api.deleteOrder(id).catch(err => {
      console.error('Error deleting order:', err);
      get().refreshOrders();
    });
  },

  deleteOrders: (ids) => {
    set(s => ({ orders: s.orders.filter(o => !ids.includes(o.id)) }));
    Promise.all(ids.map(id => api.deleteOrder(id))).catch(err => {
      console.error('Error deleting orders:', err);
      get().refreshOrders();
    });
  },

  updateOrdersStatus: (ids, status) => {
    set(s => ({ orders: s.orders.map(o => ids.includes(o.id) ? { ...o, status } : o) }));
    Promise.all(ids.map(id => api.updateOrderStatus(id, status))).catch(err => {
      console.error('Error updating orders status:', err);
      get().refreshOrders();
    });
  },

  addProduct: (product) => {
    api.addProduct(product).then(created => {
      set(s => ({ products: [...s.products, created] }));
    }).catch(console.error);
  },

  updateProduct: (id, data) => {
    set(s => ({ products: s.products.map(p => p.id === id ? { ...p, ...data } : p) }));
    api.updateProduct(id, data).catch(console.error);
  },

  toggleProductAvailability: (id) => {
    set(s => ({ products: s.products.map(p => p.id === id ? { ...p, available: !p.available } : p) }));
    api.toggleAvailability(id).catch(console.error);
  },

  addCustomer: (customer) => {
    api.addCustomer(customer).then(created => {
      set(s => ({ customers: [...s.customers, created] }));
    }).catch(console.error);
  },

  updateCustomer: (id, data) => {
    set(s => ({ customers: s.customers.map(c => c.id === id ? { ...c, ...data } : c) }));
    api.updateCustomer(id, data).catch(console.error);
  },

  deleteCustomer: (id) => {
    set(s => ({ customers: s.customers.filter(c => c.id !== id) }));
    api.deleteCustomer(id).catch(console.error);
  },

  findCustomerByPhone: (phone) => {
    return get().customers.find(c => c.phone === phone);
  },

  // Drivers
  addDriver: (driver) => {
    api.addDriver(driver).then(created => {
      set(s => ({ drivers: [...s.drivers, created] }));
    }).catch(console.error);
  },

  updateDriver: (id, data) => {
    set(s => ({ drivers: s.drivers.map(d => d.id === id ? { ...d, ...data } : d) }));
    api.updateDriver(id, data).catch(console.error);
  },

  deleteDriver: (id) => {
    set(s => ({ drivers: s.drivers.filter(d => d.id !== id) }));
    api.deleteDriver(id).catch(console.error);
  },

  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  handleOrderEvent: (order) => {
    set(s => {
      // Always deduplicate: replace if exists, add only if truly new
      const idx = s.orders.findIndex(o => o.id === order.id);
      if (idx >= 0) {
        const updated = [...s.orders];
        updated[idx] = order;
        return { orders: updated };
      }
      return { orders: [order, ...s.orders] };
    });
  },
}));
