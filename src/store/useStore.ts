import { create } from 'zustand';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
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
}

interface AppState {
  user: { name: string; role: UserRole } | null;
  categories: Category[];
  products: Product[];
  customers: Customer[];
  orders: Order[];
  nextOrderId: number;
  deliveryFee: number;
  tableCount: number;

  login: (role: UserRole) => void;
  logout: () => void;

  addOrder: (order: Omit<Order, 'id' | 'createdAt'>) => number;
  updateOrderStatus: (id: number, status: OrderStatus) => void;

  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: number, data: Partial<Product>) => void;
  toggleProductAvailability: (id: number) => void;

  addCustomer: (customer: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'lastOrder' | 'tag'>) => void;
  findCustomerByPhone: (phone: string) => Customer | undefined;
}

const initialCategories: Category[] = [
  { id: 1, name: "Perros Calientes", emoji: "🌭", color: "#F59E0B" },
  { id: 2, name: "Hamburguesas", emoji: "🍔", color: "#EF4444" },
  { id: 3, name: "Asados Especiales", emoji: "🥩", color: "#B45309" },
  { id: 4, name: "Patacones", emoji: "🫓", color: "#D97706" },
  { id: 5, name: "Picadas", emoji: "🍟", color: "#DC2626" },
  { id: 6, name: "Salchipapas", emoji: "🍟", color: "#EA580C" },
  { id: 7, name: "Adiciones", emoji: "➕", color: "#6B7280" },
  { id: 8, name: "Bebidas", emoji: "🥤", color: "#3B82F6" },
];

const initialProducts: Product[] = [
  // Perros Calientes
  { id: 1, name: "Perro Súper", categoryId: 1, price: 12000, available: true, image: null },
  { id: 2, name: "Perro Americano", categoryId: 1, price: 16000, available: true, image: null },
  { id: 3, name: "Perro Suizo", categoryId: 1, price: 18000, available: true, image: null },
  { id: 4, name: "Choriperro", categoryId: 1, price: 18000, available: true, image: null },
  { id: 5, name: "Perro Ranchero", categoryId: 1, price: 20000, available: true, image: null },
  { id: 6, name: "Chori Ranchero", categoryId: 1, price: 28000, available: true, image: null },
  { id: 7, name: "Chori Gaviotero", categoryId: 1, price: 32000, available: true, image: null },
  // Hamburguesas
  { id: 8, name: "Hamburguesa Sencilla", categoryId: 2, price: 18000, available: true, image: null },
  { id: 9, name: "Hamburguesa Doble Carne", categoryId: 2, price: 28000, available: true, image: null },
  { id: 10, name: "Hamburguesa Ranchera", categoryId: 2, price: 28000, available: true, image: null },
  { id: 11, name: "Hamburguesa de Pollo", categoryId: 2, price: 20000, available: true, image: null },
  { id: 12, name: "Hamburguesa Mixta", categoryId: 2, price: 29000, available: true, image: null },
  { id: 13, name: "Hamburguesa Gaviota", categoryId: 2, price: 32000, available: true, image: null },
  { id: 14, name: "Rancho Burgue Deluxe", categoryId: 2, price: 28000, available: true, image: null, description: "⭐ Nuevo" },
  // Asados
  { id: 15, name: "Costilla BBQ (300gr)", categoryId: 3, price: 27000, available: true, image: null },
  { id: 16, name: "Pechuga Asada (300gr)", categoryId: 3, price: 26000, available: true, image: null },
  { id: 17, name: "Punta de Anca (300gr)", categoryId: 3, price: 28000, available: true, image: null },
  { id: 18, name: "Punta Gorda (300gr)", categoryId: 3, price: 35000, available: true, image: null },
  { id: 19, name: "Chorizo Artesanal", categoryId: 3, price: 17000, available: true, image: null },
  // Patacones
  { id: 20, name: "Patacón Sencillo", categoryId: 4, price: 17000, available: true, image: null },
  { id: 21, name: "Patacón Choributy", categoryId: 4, price: 20000, available: true, image: null },
  { id: 22, name: "Patacón Especial", categoryId: 4, price: 27000, available: true, image: null },
  { id: 23, name: "Patacón Ranchero", categoryId: 4, price: 32000, available: true, image: null },
  // Picadas
  { id: 24, name: "Picada Personal", categoryId: 5, price: 27000, available: true, image: null },
  { id: 25, name: "Picada para Dos", categoryId: 5, price: 40000, available: true, image: null },
  { id: 26, name: "Picada Gaviotera (3-4)", categoryId: 5, price: 58000, available: true, image: null },
  { id: 27, name: "Picada Extra-Familiar (5-6)", categoryId: 5, price: 80000, available: true, image: null },
  // Salchipapas
  { id: 28, name: "Papas Bacon", categoryId: 6, price: 12000, available: true, image: null },
  { id: 29, name: "Salchipapa Gratinada", categoryId: 6, price: 17000, available: true, image: null },
  { id: 30, name: "Salchisuiza", categoryId: 6, price: 20000, available: true, image: null },
  { id: 31, name: "Salchiranchera", categoryId: 6, price: 20000, available: true, image: null },
  { id: 32, name: "Choributy", categoryId: 6, price: 20000, available: true, image: null },
  // Adiciones
  { id: 33, name: "Papa Francesa", categoryId: 7, price: 6000, available: true, image: null },
  { id: 34, name: "Yuca Frita", categoryId: 7, price: 6000, available: true, image: null },
  { id: 35, name: "Queso Mozarella", categoryId: 7, price: 6000, available: true, image: null },
  { id: 36, name: "Tocino", categoryId: 7, price: 5000, available: true, image: null },
  { id: 37, name: "Ranchera", categoryId: 7, price: 8000, available: true, image: null },
  { id: 38, name: "Costilla BBQ Adición", categoryId: 7, price: 20000, available: true, image: null },
  { id: 39, name: "Gratinado adicional", categoryId: 7, price: 6000, available: true, image: null },
  // Bebidas
  { id: 40, name: "Coca Cola Personal", categoryId: 8, price: 4000, available: true, image: null },
  { id: 41, name: "Coca Cola 1.5L", categoryId: 8, price: 8000, available: true, image: null },
  { id: 42, name: "Kola Román Personal", categoryId: 8, price: 4000, available: true, image: null },
  { id: 43, name: "Kola Román 1.5L", categoryId: 8, price: 7000, available: true, image: null },
  { id: 44, name: "Cuatro Personal", categoryId: 8, price: 4000, available: true, image: null },
  { id: 45, name: "Cuatro 1.5L", categoryId: 8, price: 7000, available: true, image: null },
  { id: 46, name: "Agua", categoryId: 8, price: 3000, available: true, image: null },
];

const initialCustomers: Customer[] = [
  { id: 1, name: "Ana García", phone: "3001234567", address: "Cl 45 #12-34, Cartagena", notes: "Sin cebolla en todo", totalOrders: 12, totalSpent: 480000, lastOrder: "2024-01-15", tag: "frequent" },
  { id: 2, name: "Carlos Rodríguez", phone: "3109876543", address: "Cra 8 #32-21", notes: "", totalOrders: 2, totalSpent: 72000, lastOrder: "2024-01-13", tag: "new" },
  { id: 3, name: "María López", phone: "3205551234", address: "Av Consulado #45", notes: "Alérgica al gluten", totalOrders: 8, totalSpent: 320000, lastOrder: "2024-01-14", tag: "frequent" },
];

const initialOrders: Order[] = [
  {
    id: 1042, type: "delivery", status: "pending",
    customer: { name: "Ana García", phone: "3001234567", address: "Cl 45 #12-34" },
    items: [
      { productId: 8, name: "Hamburguesa Sencilla", quantity: 1, price: 18000, notes: "Sin cebolla" },
      { productId: 40, name: "Coca Cola Personal", quantity: 2, price: 4000, notes: "" },
    ],
    subtotal: 26000, deliveryFee: 3000, total: 29000,
    paymentMethod: "cash", paymentStatus: "pending", createdAt: new Date().toISOString(),
  },
  {
    id: 1043, type: "dine-in", status: "preparing", tableNumber: 4,
    customer: { name: "Mesa 4" },
    items: [
      { productId: 9, name: "Hamburguesa Doble Carne", quantity: 2, price: 28000, notes: "" },
      { productId: 33, name: "Papa Francesa", quantity: 2, price: 6000, notes: "" },
    ],
    subtotal: 68000, deliveryFee: 0, total: 68000,
    paymentMethod: "transfer", paymentStatus: "paid", createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 1044, type: "pickup", status: "ready",
    customer: { name: "Carlos Rodríguez", phone: "3109876543" },
    items: [
      { productId: 15, name: "Costilla BBQ (300gr)", quantity: 1, price: 27000, notes: "" },
      { productId: 44, name: "Cuatro Personal", quantity: 1, price: 4000, notes: "" },
    ],
    subtotal: 31000, deliveryFee: 0, total: 31000,
    paymentMethod: "cash", paymentStatus: "paid", createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 1041, type: "delivery", status: "delivered",
    customer: { name: "María López", phone: "3205551234", address: "Av Consulado #45" },
    items: [
      { productId: 20, name: "Patacón Sencillo", quantity: 1, price: 17000, notes: "" },
      { productId: 42, name: "Kola Román Personal", quantity: 2, price: 4000, notes: "" },
    ],
    subtotal: 25000, deliveryFee: 3000, total: 28000,
    paymentMethod: "transfer", paymentStatus: "paid", createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: 1040, type: "dine-in", status: "delivered", tableNumber: 2,
    customer: { name: "Mesa 2" },
    items: [
      { productId: 26, name: "Picada Gaviotera (3-4)", quantity: 1, price: 58000, notes: "" },
      { productId: 41, name: "Coca Cola 1.5L", quantity: 2, price: 8000, notes: "" },
    ],
    subtotal: 74000, deliveryFee: 0, total: 74000,
    paymentMethod: "card", paymentStatus: "paid", createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
  },
];

export const useStore = create<AppState>((set, get) => ({
  user: null,
  categories: initialCategories,
  products: initialProducts,
  customers: initialCustomers,
  orders: initialOrders,
  nextOrderId: 1045,
  deliveryFee: 3000,
  tableCount: 12,

  login: (role) => {
    const names = { admin: 'Administrador', cashier: 'Cajero', kitchen: 'Cocina' };
    set({ user: { name: names[role], role } });
  },
  logout: () => set({ user: null }),

  addOrder: (order) => {
    const id = get().nextOrderId;
    set(s => ({
      orders: [{ ...order, id, createdAt: new Date().toISOString() }, ...s.orders],
      nextOrderId: s.nextOrderId + 1,
    }));
    return id;
  },

  updateOrderStatus: (id, status) => {
    set(s => ({
      orders: s.orders.map(o => o.id === id ? { ...o, status } : o),
    }));
  },

  addProduct: (product) => {
    set(s => ({
      products: [...s.products, { ...product, id: Math.max(...s.products.map(p => p.id)) + 1 }],
    }));
  },

  updateProduct: (id, data) => {
    set(s => ({
      products: s.products.map(p => p.id === id ? { ...p, ...data } : p),
    }));
  },

  toggleProductAvailability: (id) => {
    set(s => ({
      products: s.products.map(p => p.id === id ? { ...p, available: !p.available } : p),
    }));
  },

  addCustomer: (customer) => {
    set(s => ({
      customers: [...s.customers, {
        ...customer, id: Math.max(...s.customers.map(c => c.id)) + 1,
        totalOrders: 0, totalSpent: 0, lastOrder: new Date().toISOString().split('T')[0], tag: 'new',
      }],
    }));
  },

  findCustomerByPhone: (phone) => get().customers.find(c => c.phone === phone),
}));
