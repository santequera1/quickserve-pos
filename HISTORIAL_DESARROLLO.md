# Comidas Rápidas Las Gaviotas - Historial de Desarrollo

## Resumen del Proyecto
Sistema POS (Point of Sale) para el restaurante **Comidas Rápidas Las Gaviotas** en Cartagena, Colombia.
Permite gestionar pedidos, clientes, productos, personal, mesas, reportes y configuración del negocio.

**Frontend original**: Generado con Lovable (React + Vite + TypeScript + Tailwind + Zustand). Solo tenía datos mock en memoria.
**Backend construido**: Express.js + SQLite (better-sqlite3) + JWT + Socket.IO para tiempo real.

---

## Stack Tecnológico

### Frontend
- React 18 + TypeScript + Vite (puerto 8080)
- Zustand (estado global)
- Tailwind CSS + shadcn/ui
- Recharts (gráficas)
- Framer Motion (animaciones)
- Socket.IO Client (tiempo real)
- React Router v6

### Backend
- Express.js (puerto 3001)
- SQLite con better-sqlite3 (archivo: `server/data.db`)
- JWT para autenticación
- bcryptjs para hash de contraseñas
- Socket.IO para WebSockets
- CORS habilitado

---

## Estructura de Archivos

```
comidas rapidas/
├── index.html                    # Entry HTML (favicon = logo.webp)
├── public/logo.webp              # Logo del negocio
├── src/
│   ├── App.tsx                   # Rutas principales
│   ├── store/useStore.ts         # Estado global Zustand + API calls
│   ├── lib/
│   │   ├── api.ts                # Cliente HTTP para el backend
│   │   └── format.ts             # Formateo de precios, fechas
│   ├── components/
│   │   ├── AppLayout.tsx         # Layout con sidebar colapsable
│   │   ├── StatusBadge.tsx       # Badge de estado (context-aware por tipo)
│   │   └── OrderTypeBadge.tsx    # Badge de tipo de pedido
│   └── pages/
│       ├── LoginPage.tsx         # Login con credenciales reales
│       ├── DashboardPage.tsx     # KPIs, resumen pagos, mesas, pedidos recientes
│       ├── OrdersPage.tsx        # Lista pedidos (cards/lista/tabla), filtros fecha/tipo/estado
│       ├── NewOrderPage.tsx      # Wizard 4 pasos para crear pedido
│       ├── OrderDetailPage.tsx   # Detalle con pipeline visual, cambio estado, recibo
│       ├── KitchenPage.tsx       # Vista cocina con timers
│       ├── TablesPage.tsx        # Vista de mesas clickables con pedidos
│       ├── ProductsPage.tsx      # CRUD productos
│       ├── CustomersPage.tsx     # CRUD clientes
│       ├── CustomerDetailPage.tsx
│       ├── StaffPage.tsx         # Personal (meseros, cocineros, domiciliarios, admin, ayudantes)
│       ├── ReportsPage.tsx       # Reportes completos con 8 secciones
│       └── SettingsPage.tsx      # Configuración del negocio (guarda en DB)
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── index.js              # Entry (Express + Socket.IO)
│   │   ├── db.js                 # SQLite schema + seed
│   │   ├── auth.js               # JWT middleware
│   │   └── routes/
│   │       ├── auth.js           # POST /api/auth/login
│   │       ├── orders.js         # CRUD pedidos + assign driver
│   │       ├── products.js       # CRUD productos
│   │       ├── categories.js     # CRUD categorías
│   │       ├── customers.js      # CRUD clientes
│   │       ├── drivers.js        # CRUD personal/drivers
│   │       ├── reports.js        # Queries de reportes
│   │       └── settings.js       # Config key-value
│   └── data.db                   # Base de datos SQLite (auto-generada)
```

---

## Modelo de Datos

### Estados de pedido (OrderStatus)
```
'pending' | 'preparing' | 'ready' | 'shipped' | 'delivered' | 'cancelled'
```

### Flujos por tipo de pedido:
- **Domicilio**: Pendiente → En preparación → Listo para enviar → Enviado (🛵) → Entregado
- **Para llevar**: Pendiente → En preparación → Listo para recoger → Recogido por cliente
- **Comer aquí**: Pendiente → En preparación → Listo para servir → Entregado en mesa

### Tipos de personal (StaffPage)
Se almacenan en la tabla `drivers` con formato de nombre `"rol:nombre"`:
- mesero, cocinero, domiciliario, administrador, ayudante

### Tablas de la DB
- `users` - Usuarios de login (admin, cajero, cocina)
- `categories` - 8 categorías del menú
- `products` - 46 productos con precios en COP
- `customers` - Clientes con teléfono, dirección, notas
- `orders` - Pedidos con tipo, estado, pago, driver_id
- `order_items` - Items de cada pedido
- `drivers` - Personal del negocio (todos los roles)
- `settings` - Configuración clave-valor

---

## Credenciales de Acceso
```
Usuario: admin    Contraseña: admin123    Rol: Administrador (acceso total)
Usuario: cajero   Contraseña: cajero123   Rol: Cajero
Usuario: cocina   Contraseña: cocina123   Rol: Cocina
```

---

## Cómo Ejecutar

```bash
# 1. Instalar dependencias (solo la primera vez)
npm install
cd server && npm install && cd ..

# 2. Si necesitas reiniciar la DB (borra todos los datos)
rm server/data.db

# 3. Iniciar backend (Terminal 1)
cd server && npm start

# 4. Iniciar frontend (Terminal 2)
npm run dev

# 5. Abrir en navegador
http://localhost:8080

# 6. Desde celular (misma red WiFi)
http://192.168.1.24:8080
```

---

## Funcionalidades Implementadas

### Pedidos
- Wizard de 4 pasos: Tipo → Cliente → Productos → Confirmar
- 3 tipos: Domicilio, Para llevar, Comer aquí
- Precio de domicilio variable por pedido
- Asignación de domiciliario al crear
- Estado seleccionable al crear (para pedidos ya preparados)
- Métodos de pago: Efectivo, Transferencia (Bancolombia/Nequi/Daviplata), Tarjeta
- "Marcar después" para pedidos en mesa (pago diferido)
- Upload de comprobante de transferencia
- Filtro por fecha (hoy, ayer, semana, mes, todos)
- Filtro por tipo y estado
- 3 vistas: Cards, Lista, Tabla
- Vista por defecto: Cards

### Detalle de Pedido
- Pipeline visual del flujo de estados
- Botón principal claro para siguiente paso
- Cambio manual de estado (override)
- Asignar/cambiar domiciliario
- Marcar como pagado + elegir método
- Subir comprobante de pago
- Novedades/notas
- Generar e imprimir recibo

### Mesas (página dedicada)
- Grid de mesas con estado visual (libre/ocupada)
- Click en mesa ocupada → ver pedido activo con items y total
- Acciones rápidas por mesa
- Historial de pedidos por mesa

### Cocina
- Pedidos pending y preparing con timer en tiempo real
- Botones para avanzar estado
- Actualización vía Socket.IO

### Productos
- CRUD completo
- Toggle disponibilidad
- Filtro por categoría y búsqueda

### Clientes
- CRUD completo (agregar, editar, eliminar)
- Búsqueda por nombre y teléfono
- Autocompletado en nuevo pedido
- Campos calculados: total pedidos, total gastado, tag

### Personal
- 5 roles: Mesero, Cocinero, Domiciliario, Administrador, Ayudante
- CRUD completo por rol
- Toggle activo/inactivo
- Filtro por rol
- Cards de resumen

### Reportes
- 8 secciones: Filtros, Resumen, Gráficas, Top productos, Pedidos, Clientes, Desglose tipo, Exportar
- Filtros: período, tipo, pago, estado
- Gráfica de barras (por hora) o líneas (por día)
- Exportar CSV + Imprimir
- Rango de fechas personalizado

### Dashboard
- KPIs: Ventas, Pedidos activos, Ticket promedio, Más vendido
- Resumen por método de pago
- Enlace a vista de mesas
- Tabla de pedidos recientes

### Configuración
- Nombre del negocio, teléfono, dirección
- Precio base domicilio, número de mesas
- Guarda en base de datos

### UX
- Sidebar colapsable
- Mobile nav con drawer "Más"
- Logo del negocio en login, sidebar, favicon
- Nombres claros (sin solo emojis): "Domicilio", "Para llevar", "Comer aquí"
- Socket.IO para actualizaciones en tiempo real

---

## Datos de Prueba (Seed)

### Clientes
1. Ana García - 3001234567 - Cl 45 #12-34, Cartagena - Sin cebolla en todo
2. Carlos Rodríguez - 3109876543 - Cra 8 #32-21
3. María López - 3205551234 - Av Consulado #45 - Alérgica al gluten
4. **Stiven Antequera** - 3026444564 - Olaya Herrera Sector Progreso Calle Líbano - Siempre pide salchiranchera y coca cola personal

### Personal
- Mesero 1, Mesero 2
- Domiciliario 1, Domiciliario 2
- Cocinero 1, Cocinero 2
- Administrador 1, Administrador 2
- Ayudante 1, Ayudante 2

### Categorías (8)
Perros Calientes, Hamburguesas, Asados Especiales, Patacones, Picadas, Salchipapas, Adiciones, Bebidas

### Productos: 46 items con precios reales en COP

### Pedidos de ejemplo: 5 pedidos en distintos estados

---

## Pendiente / Ideas Futuras
- Impresión real de tickets de cocina (impresora térmica)
- Sonido/alerta cuando llega pedido nuevo a cocina
- Verificación real de comprobantes de transferencia
- Historial de cambios en pedidos (auditoría)
- Control de inventario/stock
- GPS tracking de domiciliarios
- Notificaciones push
- Modo oscuro/claro
- Confirmación antes de cerrar sesión
- Validación de teléfonos
- Múltiples usuarios simultáneos con roles diferenciados
- Backup automático de base de datos

---

## Notas Técnicas
- La moneda es COP (pesos colombianos, sin decimales)
- El frontend Vite corre en puerto 8080, el backend Express en 3001
- Socket.IO se conecta automáticamente al backend para tiempo real
- El JWT tiene expiración de 24 horas
- La DB SQLite se crea automáticamente con seed al primer arranque
- Para reiniciar datos: `rm server/data.db` y reiniciar el backend
