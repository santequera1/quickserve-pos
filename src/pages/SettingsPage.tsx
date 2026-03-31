import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { formatPrice } from '@/lib/format';
import { api } from '@/lib/api';
import { Save, Check } from 'lucide-react';

const SettingsPage = () => {
  const { deliveryFee, tableCount, categories, user } = useStore();
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [editDeliveryFee, setEditDeliveryFee] = useState('');
  const [editTableCount, setEditTableCount] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getSettings().then(s => {
      setBusinessName(s.businessName || 'Las Gaviotas');
      setBusinessPhone(s.businessPhone || '');
      setBusinessAddress(s.businessAddress || '');
      setEditDeliveryFee(String(s.deliveryFee || deliveryFee));
      setEditTableCount(String(s.tableCount || tableCount));
    }).catch(() => {
      setEditDeliveryFee(String(deliveryFee));
      setEditTableCount(String(tableCount));
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.updateSettings({
        businessName,
        businessPhone,
        businessAddress,
        deliveryFee: Number(editDeliveryFee),
        tableCount: Number(editTableCount),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving settings:', err);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Business */}
      <section className="bg-card rounded-xl border border-border p-4 shadow-card space-y-3">
        <h3 className="font-display font-semibold text-sm">🏪 Negocio</h3>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre del restaurante</label>
          <input value={businessName} onChange={e => setBusinessName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Teléfono</label>
          <input value={businessPhone} onChange={e => setBusinessPhone(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Dirección</label>
          <input value={businessAddress} onChange={e => setBusinessAddress(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
      </section>

      {/* Delivery */}
      <section className="bg-card rounded-xl border border-border p-4 shadow-card space-y-3">
        <h3 className="font-display font-semibold text-sm">🛵 Domicilio</h3>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Precio base domicilio</label>
          <input type="number" value={editDeliveryFee} onChange={e => setEditDeliveryFee(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 font-display" />
          <p className="text-[10px] text-muted-foreground mt-1">Este valor se puede cambiar en cada pedido</p>
        </div>
      </section>

      {/* Tables */}
      <section className="bg-card rounded-xl border border-border p-4 shadow-card space-y-3">
        <h3 className="font-display font-semibold text-sm">🍽️ Mesas</h3>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Número de mesas</label>
          <input type="number" value={editTableCount} onChange={e => setEditTableCount(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 font-display" />
        </div>
      </section>

      {/* Categories */}
      <section className="bg-card rounded-xl border border-border p-4 shadow-card">
        <h3 className="font-display font-semibold text-sm mb-2">📂 Categorías</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <span key={c.id} className="px-3 py-1.5 rounded-full bg-muted text-sm font-medium">
              {c.emoji} {c.name}
            </span>
          ))}
        </div>
      </section>

      {/* User */}
      <section className="bg-card rounded-xl border border-border p-4 shadow-card">
        <h3 className="font-display font-semibold text-sm mb-2">👤 Usuario actual</h3>
        <p className="text-sm">{user?.name} <span className="text-xs text-muted-foreground capitalize">({user?.role})</span></p>
      </section>

      {/* Save button */}
      <button onClick={handleSave} disabled={loading}
        className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-display font-semibold text-sm shadow-fab hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
        {saved ? <><Check size={16} /> Guardado</> : loading ? 'Guardando...' : <><Save size={16} /> Guardar configuración</>}
      </button>

      <p className="text-center text-xs text-muted-foreground">Las Gaviotas POS v1.0</p>
    </div>
  );
};

export default SettingsPage;
