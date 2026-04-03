import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useStore } from '@/store/useStore';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const loginWithCredentials = useStore(s => s.loginWithCredentials);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithCredentials(username.toLowerCase(), password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Usuario o contraseña incorrectos');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#3B1A08' }}>
      {/* Animated particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="absolute rounded-full opacity-20 animate-float"
          style={{
            width: `${12 + i * 8}px`, height: `${12 + i * 8}px`,
            background: i % 2 === 0 ? '#B71515' : '#D4620A',
            left: `${10 + i * 12}%`, top: `${15 + (i % 3) * 25}%`,
            animationDelay: `${i * 0.8}s`, animationDuration: `${5 + i}s`,
          }}
        />
      ))}

      <div className="w-full max-w-sm relative z-10">
        <div className="rounded-2xl p-8 backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="text-center mb-8">
            <img src="/logo.png" alt="Pizza Pizza" className="w-28 h-28 mx-auto mb-3 rounded-2xl object-contain" />
            <h1 className="font-display text-2xl font-bold" style={{ color: 'white' }}>Pizza Pizza</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Sistema de pedidos</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.7)' }}>Usuario</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <input
                  value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', caretColor: 'white' }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.7)' }}>Contraseña</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="w-full pl-10 pr-10 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-center" style={{ color: '#EF4444' }}>{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg font-display font-semibold text-sm gradient-primary text-primary-foreground shadow-fab transition-all hover:opacity-90 disabled:opacity-60">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : 'Ingresar'}
            </button>
          </form>

        </div>

        <p className="text-center text-[11px] mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
          🔒 Acceso seguro • v1.0
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
