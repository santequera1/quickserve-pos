import { useState } from 'react';
import { Search, Plus, Grid3X3, List, X, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

const ProductsPage = () => {
  const { categories, products, toggleProductAvailability, addProduct, updateProduct, deleteProduct } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', categoryId: 1, available: true });

  const filtered = products.filter(p => {
    if (selectedCategory && p.categoryId !== selectedCategory) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openEdit = (id: number) => {
    const p = products.find(pr => pr.id === id)!;
    setFormData({ name: p.name, description: p.description || '', price: String(p.price), categoryId: p.categoryId, available: p.available });
    setEditingId(id);
    setShowForm(true);
  };

  const handleSave = () => {
    const data = { name: formData.name, description: formData.description, price: Number(formData.price), categoryId: formData.categoryId, available: formData.available, image: null };
    if (editingId) {
      updateProduct(editingId, data);
    } else {
      addProduct(data);
    }
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', description: '', price: '', categoryId: 1, available: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="w-10 h-10 rounded-lg border border-border bg-card flex items-center justify-center">
          {viewMode === 'grid' ? <List size={18} /> : <Grid3X3 size={18} />}
        </button>
        <button onClick={() => { setEditingId(null); setFormData({ name: '', description: '', price: '', categoryId: 1, available: true }); setShowForm(true); }}
          className="h-10 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 shadow-fab">
          <Plus size={16} /> Agregar
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setSelectedCategory(null)} className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap', !selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>Todas</button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setSelectedCategory(c.id)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap', selectedCategory === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {filtered.map(p => {
            const cat = categories.find(c => c.id === p.categoryId);
            return (
              <div key={p.id} className={cn('bg-card rounded-xl border border-border shadow-card p-3', !p.available && 'opacity-50')}>
                <div className="w-full h-16 rounded-lg mb-2 flex items-center justify-center text-3xl" style={{ backgroundColor: (cat?.color || '#6B7280') + '15' }}>
                  {cat?.emoji}
                </div>
                <p className="text-xs font-medium truncate">{p.name}</p>
                <p className="text-sm font-display font-bold text-primary">{formatPrice(p.price)}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p.id)} className="text-xs text-primary font-medium">Editar</button>
                    <button onClick={() => { if (window.confirm(`¿Eliminar "${p.name}"?`)) deleteProduct(p.id); }}
                      className="text-xs text-destructive font-medium">Eliminar</button>
                  </div>
                  <button onClick={() => toggleProductAvailability(p.id)}
                    className={cn('w-8 h-4 rounded-full relative transition-colors', p.available ? 'bg-success' : 'bg-muted')}>
                    <div className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-card shadow transition-transform', p.available ? 'left-4' : 'left-0.5')} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const cat = categories.find(c => c.id === p.categoryId);
            return (
              <div key={p.id} className={cn('bg-card rounded-xl border border-border shadow-card p-3 flex items-center gap-3', !p.available && 'opacity-50')}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: (cat?.color || '#6B7280') + '15' }}>
                  {cat?.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{cat?.name}</p>
                </div>
                <span className="font-display font-bold text-sm">{formatPrice(p.price)}</span>
                <button onClick={() => openEdit(p.id)} className="text-xs text-primary font-medium">Editar</button>
                <button onClick={() => { if (window.confirm(`¿Eliminar "${p.name}"?`)) deleteProduct(p.id); }}
                  className="text-destructive"><Trash2 size={14} /></button>
                <button onClick={() => toggleProductAvailability(p.id)}
                  className={cn('w-8 h-4 rounded-full relative transition-colors shrink-0', p.available ? 'bg-success' : 'bg-muted')}>
                  <div className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-card shadow transition-transform', p.available ? 'left-4' : 'left-0.5')} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 z-50 flex items-end md:items-center justify-center" onClick={() => setShowForm(false)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="bg-card rounded-t-2xl md:rounded-2xl w-full max-w-md p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg">{editingId ? 'Editar' : 'Nuevo'} Producto</h2>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X size={16} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nombre</label>
                  <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Descripción</label>
                  <input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Precio</label>
                  <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Categoría</label>
                  <select value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                  </select>
                </div>
                <button onClick={handleSave} disabled={!formData.name || !formData.price}
                  className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground font-display font-semibold text-sm disabled:opacity-40">
                  {editingId ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductsPage;
