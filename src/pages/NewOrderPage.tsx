import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Minus, Plus, X, ShoppingCart, Check } from 'lucide-react';
import { useStore, type OrderType, type OrderItem, type PaymentMethod } from '@/store/useStore';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type Step = 'type' | 'customer' | 'products' | 'summary';

const NewOrderPage = () => {
  const navigate = useNavigate();
  const { categories, products, customers, addOrder, findCustomerByPhone, addCustomer, deliveryFee, tableCount } = useStore();

  const [step, setStep] = useState<Step>('type');
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [showProductModal, setShowProductModal] = useState<number | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalNotes, setModalNotes] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<number | null>(null);

  const foundCustomer = phone.length >= 7 ? findCustomerByPhone(phone) : undefined;

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.available);
    if (selectedCategory) list = list.filter(p => p.categoryId === selectedCategory);
    if (searchQuery) list = list.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return list;
  }, [products, selectedCategory, searchQuery]);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const isDelivery = orderType === 'delivery';
  const fee = isDelivery ? deliveryFee : 0;
  const grandTotal = cartTotal + fee;
  const change = paymentMethod === 'cash' && cashReceived ? Number(cashReceived) - grandTotal : 0;

  const addToCart = (productId: number) => {
    const p = products.find(pr => pr.id === productId)!;
    setCart(prev => {
      const existing = prev.find(i => i.productId === productId && i.notes === modalNotes);
      if (existing) {
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + modalQty } : i);
      }
      return [...prev, { productId, name: p.name, quantity: modalQty, price: p.price, notes: modalNotes }];
    });
    setShowProductModal(null);
    setModalQty(1);
    setModalNotes('');
  };

  const removeFromCart = (index: number) => setCart(c => c.filter((_, i) => i !== index));
  const updateCartQty = (index: number, delta: number) => {
    setCart(c => c.map((item, i) => {
      if (i !== index) return item;
      const newQty = item.quantity + delta;
      return newQty > 0 ? { ...item, quantity: newQty } : item;
    }).filter(item => item.quantity > 0));
  };

  const confirmOrder = () => {
    let customer = { name: customerName, phone, address };
    if (orderType === 'dine-in') {
      customer = { name: `Mesa ${selectedTable}`, phone: '', address: '' };
    }
    if (orderType === 'pickup') {
      customer = { name: customerName, phone, address: '' };
    }

    // Add customer if new delivery customer
    if (orderType === 'delivery' && !foundCustomer && phone) {
      addCustomer({ name: customerName, phone, address, notes: customerNotes });
    }

    const id = addOrder({
      type: orderType!,
      status: 'pending',
      customer,
      tableNumber: selectedTable || undefined,
      items: cart,
      subtotal: cartTotal,
      deliveryFee: fee,
      total: grandTotal,
      paymentMethod,
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'paid',
    });
    setOrderSuccess(id);
  };

  if (orderSuccess) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <Check size={40} className="text-success" />
          </div>
        </motion.div>
        <h2 className="font-display text-2xl font-bold mb-1">¡Pedido creado!</h2>
        <p className="text-muted-foreground mb-1">Pedido #{orderSuccess}</p>
        <p className="font-display font-bold text-xl text-primary mb-6">{formatPrice(grandTotal)}</p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/orders')} className="px-6 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            Ver pedidos
          </button>
          <button onClick={() => { setOrderSuccess(null); setStep('type'); setCart([]); setOrderType(null); }}
            className="px-6 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-fab hover:opacity-90 transition-opacity">
            Nuevo pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => step === 'type' ? navigate(-1) : setStep(step === 'customer' ? 'type' : step === 'products' ? 'customer' : 'products')}
          className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-display font-bold text-lg">Nuevo Pedido</h1>
          <p className="text-xs text-muted-foreground">
            {step === 'type' ? 'Paso 1: Tipo' : step === 'customer' ? 'Paso 2: Cliente' : step === 'products' ? 'Paso 3: Productos' : 'Paso 4: Confirmar'}
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex gap-1 mb-6">
        {(['type', 'customer', 'products', 'summary'] as Step[]).map((s, i) => (
          <div key={s} className={cn('h-1 flex-1 rounded-full transition-colors', i <= ['type', 'customer', 'products', 'summary'].indexOf(step) ? 'bg-primary' : 'bg-muted')} />
        ))}
      </div>

      {/* STEP: TYPE */}
      {step === 'type' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { type: 'delivery' as OrderType, emoji: '🏠', label: 'Domicilio', desc: 'Envío a dirección', color: 'border-destructive bg-destructive/5' },
            { type: 'pickup' as OrderType, emoji: '🛍️', label: 'Recoger', desc: 'Cliente recoge', color: 'border-warning bg-warning/5' },
            { type: 'dine-in' as OrderType, emoji: '🍽️', label: 'Mesa', desc: 'Comer en local', color: 'border-success bg-success/5' },
          ]).map(opt => (
            <button key={opt.type}
              onClick={() => { setOrderType(opt.type); setStep('customer'); }}
              className={cn('p-6 rounded-xl border-2 text-center transition-all hover:shadow-elevated', opt.color)}>
              <span className="text-4xl block mb-2">{opt.emoji}</span>
              <p className="font-display font-bold text-lg">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* STEP: CUSTOMER */}
      {step === 'customer' && (
        <div className="space-y-4 max-w-md">
          {orderType === 'delivery' && (
            <>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Teléfono</label>
                <input value={phone} onChange={e => {
                  setPhone(e.target.value);
                  const c = e.target.value.length >= 7 ? findCustomerByPhone(e.target.value) : undefined;
                  if (c) { setCustomerName(c.name); setAddress(c.address); setCustomerNotes(c.notes); }
                }}
                  placeholder="300 123 4567" className="w-full px-4 py-3 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              </div>
              {foundCustomer && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-sm">
                  <span className="text-success font-medium">✅ Cliente encontrado: </span>{foundCustomer.name}
                  {foundCustomer.tag === 'frequent' && <span className="ml-2 px-2 py-0.5 rounded-full bg-warning/15 text-warning text-xs font-semibold">⭐ Frecuente</span>}
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nombre</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nombre del cliente"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Dirección</label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Dirección de entrega"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              </div>
            </>
          )}
          {orderType === 'pickup' && (
            <>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nombre del cliente</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nombre"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Teléfono (opcional)</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Teléfono"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              </div>
            </>
          )}
          {orderType === 'dine-in' && (
            <div>
              <label className="text-sm font-medium mb-3 block">Selecciona la mesa</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {Array.from({ length: tableCount }, (_, i) => i + 1).map(n => (
                  <button key={n}
                    onClick={() => setSelectedTable(n)}
                    className={cn('h-12 rounded-lg border-2 font-display font-bold text-sm transition-all',
                      selectedTable === n ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/50')}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => setStep('products')}
            disabled={(orderType === 'delivery' && (!customerName || !address || !phone)) ||
              (orderType === 'pickup' && !customerName) ||
              (orderType === 'dine-in' && !selectedTable)}
            className="w-full py-3 rounded-lg gradient-primary text-primary-foreground font-display font-semibold text-sm shadow-fab disabled:opacity-40 hover:opacity-90 transition-opacity">
            Continuar
          </button>
        </div>
      )}

      {/* STEP: PRODUCTS */}
      {step === 'products' && (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            {/* Search */}
            <div className="relative mb-3">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar producto..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
              <button onClick={() => setSelectedCategory(null)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                  !selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                Todas
              </button>
              {categories.map(c => (
                <button key={c.id} onClick={() => setSelectedCategory(c.id)}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                    selectedCategory === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredProducts.map(p => {
                const inCart = cart.find(i => i.productId === p.id);
                return (
                  <button key={p.id} onClick={() => { setShowProductModal(p.id); setModalQty(1); setModalNotes(''); }}
                    className="bg-card rounded-xl p-3 border border-border shadow-card text-left hover:shadow-elevated transition-shadow relative">
                    <div className="w-full h-16 rounded-lg mb-2 flex items-center justify-center text-3xl" style={{ backgroundColor: categories.find(c => c.id === p.categoryId)?.color + '15' }}>
                      {categories.find(c => c.id === p.categoryId)?.emoji}
                    </div>
                    <p className="text-xs font-medium truncate">{p.name}</p>
                    <p className="text-sm font-display font-bold text-primary">{formatPrice(p.price)}</p>
                    {p.description && <p className="text-[10px] text-muted-foreground">{p.description}</p>}
                    {inCart && (
                      <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop cart sidebar */}
          <div className="hidden lg:block w-72 shrink-0">
            <CartPanel cart={cart} fee={fee} cartTotal={cartTotal} grandTotal={grandTotal}
              onRemove={removeFromCart} onUpdateQty={updateCartQty}
              onConfirm={() => setStep('summary')} orderType={orderType!} customerName={customerName} />
          </div>

          {/* Mobile cart button */}
          {cartCount > 0 && (
            <button onClick={() => setShowCart(true)}
              className="lg:hidden fixed bottom-20 left-4 right-4 md:bottom-6 py-3 rounded-xl gradient-primary text-primary-foreground font-display font-semibold text-sm shadow-fab z-30 flex items-center justify-center gap-2">
              <ShoppingCart size={18} />
              Ver pedido ({cartCount} items • {formatPrice(grandTotal)})
            </button>
          )}
        </div>
      )}

      {/* STEP: SUMMARY */}
      {step === 'summary' && (
        <div className="max-w-md mx-auto space-y-4">
          <CartPanel cart={cart} fee={fee} cartTotal={cartTotal} grandTotal={grandTotal}
            onRemove={removeFromCart} onUpdateQty={updateCartQty}
            orderType={orderType!} customerName={orderType === 'dine-in' ? `Mesa ${selectedTable}` : customerName} />

          <div>
            <label className="text-sm font-medium mb-2 block">Método de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { method: 'cash' as PaymentMethod, emoji: '💵', label: 'Efectivo' },
                { method: 'transfer' as PaymentMethod, emoji: '📱', label: 'Transfer' },
                { method: 'card' as PaymentMethod, emoji: '💳', label: 'Tarjeta' },
              ]).map(pm => (
                <button key={pm.method} onClick={() => setPaymentMethod(pm.method)}
                  className={cn('p-3 rounded-lg border-2 text-center text-sm font-medium transition-all',
                    paymentMethod === pm.method ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30')}>
                  <span className="text-xl block">{pm.emoji}</span>
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'cash' && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Recibido</label>
              <input type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value)}
                placeholder="0" className="w-full px-4 py-3 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 font-display text-lg" />
              {Number(cashReceived) >= grandTotal && (
                <p className="text-sm text-success font-display font-bold mt-1">Cambio: {formatPrice(change)}</p>
              )}
            </div>
          )}

          <button onClick={confirmOrder} disabled={cart.length === 0}
            className="w-full py-3.5 rounded-xl gradient-primary text-primary-foreground font-display font-bold text-base shadow-fab disabled:opacity-40 hover:opacity-90 transition-opacity">
            ✅ Confirmar Pedido • {formatPrice(grandTotal)}
          </button>
        </div>
      )}

      {/* Product modal */}
      <AnimatePresence>
        {showProductModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 z-50 flex items-end md:items-center justify-center" onClick={() => setShowProductModal(null)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="bg-card rounded-t-2xl md:rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
              {(() => {
                const p = products.find(pr => pr.id === showProductModal)!;
                const cat = categories.find(c => c.id === p.categoryId);
                return (
                  <>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-display font-bold text-lg">{p.name}</p>
                        <p className="text-primary font-display font-bold">{formatPrice(p.price)}</p>
                        {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                      </div>
                      <button onClick={() => setShowProductModal(null)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="w-full h-24 rounded-xl mb-4 flex items-center justify-center text-5xl" style={{ backgroundColor: (cat?.color || '#6B7280') + '15' }}>
                      {cat?.emoji}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Cantidad</label>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setModalQty(q => Math.max(1, q - 1))}
                            className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted"><Minus size={16} /></button>
                          <span className="font-display font-bold text-xl w-8 text-center">{modalQty}</span>
                          <button onClick={() => setModalQty(q => q + 1)}
                            className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted"><Plus size={16} /></button>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Notas</label>
                        <input value={modalNotes} onChange={e => setModalNotes(e.target.value)}
                          placeholder="Ej: sin cebolla" className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                      <button onClick={() => addToCart(p.id)}
                        className="w-full py-3 rounded-lg gradient-primary text-primary-foreground font-display font-semibold text-sm shadow-fab hover:opacity-90 transition-opacity">
                        Agregar al pedido • {formatPrice(p.price * modalQty)}
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile cart drawer */}
      <AnimatePresence>
        {showCart && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 z-50 flex items-end" onClick={() => setShowCart(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="bg-card rounded-t-2xl w-full max-h-[80vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
              <CartPanel cart={cart} fee={fee} cartTotal={cartTotal} grandTotal={grandTotal}
                onRemove={removeFromCart} onUpdateQty={updateCartQty}
                onConfirm={() => { setShowCart(false); setStep('summary'); }}
                orderType={orderType!} customerName={customerName} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CartPanel = ({ cart, fee, cartTotal, grandTotal, onRemove, onUpdateQty, onConfirm, orderType, customerName }: {
  cart: OrderItem[]; fee: number; cartTotal: number; grandTotal: number;
  onRemove: (i: number) => void; onUpdateQty: (i: number, d: number) => void;
  onConfirm?: () => void; orderType: string; customerName: string;
}) => (
  <div className="bg-card rounded-xl border border-border p-4 shadow-card">
    <div className="flex items-center gap-2 mb-3">
      <ShoppingCart size={16} className="text-primary" />
      <span className="font-display font-semibold text-sm">Pedido</span>
      <span className="text-xs text-muted-foreground">• {customerName}</span>
    </div>
    {cart.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-4">Sin productos aún</p>
    ) : (
      <div className="space-y-2 mb-3">
        {cart.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <button onClick={() => onUpdateQty(i, -1)} className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs"><Minus size={12} /></button>
              <span className="w-5 text-center font-display font-semibold text-xs">{item.quantity}</span>
              <button onClick={() => onUpdateQty(i, 1)} className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs"><Plus size={12} /></button>
            </div>
            <span className="flex-1 truncate text-xs">{item.name}{item.notes ? ` (${item.notes})` : ''}</span>
            <span className="text-xs font-display font-semibold">{formatPrice(item.price * item.quantity)}</span>
            <button onClick={() => onRemove(i)} className="text-muted-foreground hover:text-destructive"><X size={14} /></button>
          </div>
        ))}
      </div>
    )}
    <div className="border-t border-border pt-2 space-y-1 text-sm">
      <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-display">{formatPrice(cartTotal)}</span></div>
      {fee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Domicilio</span><span className="font-display">{formatPrice(fee)}</span></div>}
      <div className="flex justify-between font-display font-bold text-base pt-1"><span>Total</span><span className="text-primary">{formatPrice(grandTotal)}</span></div>
    </div>
    {onConfirm && cart.length > 0 && (
      <button onClick={onConfirm} className="w-full mt-3 py-2.5 rounded-lg gradient-primary text-primary-foreground font-display font-semibold text-sm shadow-fab hover:opacity-90 transition-opacity">
        Continuar →
      </button>
    )}
  </div>
);

export default NewOrderPage;
