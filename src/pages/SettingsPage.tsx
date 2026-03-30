import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { formatPrice } from '@/lib/format';

const SettingsPage = () => {
  const { deliveryFee, tableCount, categories, user } = useStore();
  const [businessName, setBusinessName] = useState('Las Gaviotas');
  const [businessPhone, setBusinessPhone] = useState('300 555 1234');
  const [businessAddress, setBusinessAddress] = useState('Cartagena de Indias');

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
        <div className="flex items-center justify-between">
          <span className="text-sm">Precio domicilio</span>
          <span className="font-display font-bold text-primary">{formatPrice(deliveryFee)}</span>
        </div>
      </section>

      {/* Tables */}
      <section className="bg-card rounded-xl border border-border p-4 shadow-card">
        <h3 className="font-display font-semibold text-sm mb-2">🍽️ Mesas</h3>
        <p className="text-sm text-muted-foreground">{tableCount} mesas configuradas</p>
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

      <p className="text-center text-xs text-muted-foreground">RÁPIDO POS v1.0 • Comidas Rápidas Las Gaviotas</p>
    </div>
  );
};

export default SettingsPage;
