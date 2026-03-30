import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, MapPin } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const CustomersPage = () => {
  const navigate = useNavigate();
  const { customers } = useStore();
  const [search, setSearch] = useState('');

  const filtered = customers.filter(c =>
    !search || `${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o teléfono..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
      </div>

      <div className="space-y-2">
        {filtered.map(c => (
          <button key={c.id} onClick={() => navigate(`/customers/${c.id}`)}
            className="w-full bg-card rounded-xl border border-border shadow-card p-4 text-left hover:shadow-elevated transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-display font-bold text-primary">
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display font-semibold text-sm">{c.name}</p>
                  {c.tag === 'frequent' && <span className="px-2 py-0.5 rounded-full bg-warning/15 text-warning text-[10px] font-semibold">⭐ FRECUENTE</span>}
                  {c.tag === 'new' && <span className="px-2 py-0.5 rounded-full bg-info/15 text-info text-[10px] font-semibold">🆕 NUEVO</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><Phone size={12} />{c.phone}</span>
                  {c.address && <span className="flex items-center gap-1 truncate"><MapPin size={12} />{c.address}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">{c.totalOrders} pedidos</p>
                <p className="font-display font-semibold text-sm">{formatPrice(c.totalSpent)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CustomersPage;
