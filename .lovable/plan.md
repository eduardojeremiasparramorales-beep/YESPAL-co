# MotoYa — App de domicilios (PWA + Backend)

App web instalable (PWA) que cubre las 3 interfaces, con backend completo sobre Lovable Cloud. Lista para operar en Bucaramanga y escalar a otras ciudades.

## Por qué PWA en vez de Android nativo

Lovable construye web apps (React + TanStack Start). No genera APK ni código Kotlin. Una PWA bien hecha:
- Se instala desde el navegador como app
- Usa GPS, notificaciones push, sonidos, funciona en segundo plano
- Cubre 100% del MVP que describes
- El backend queda con APIs documentadas para que después un dev Android pueda envolverlo o reescribir el cliente en Kotlin

## Stack técnico

- **Frontend**: React 19 + TanStack Start + Tailwind v4 + Shadcn (PWA con service worker, instalable)
- **Backend**: Lovable Cloud (PostgreSQL + Auth + Realtime + Storage) — equivalente Supabase
- **Realtime**: Supabase Realtime (WebSockets) para broadcast de órdenes a repartidores
- **Mapas**: Google Maps Platform (Maps JS, Routes, Geocoding) vía conector
- **Push**: Web Push API (FCM-compatible) + sonido de alerta
- **Pagos**: Efectivo funcional desde día 1; capa de pagos abstracta con stub Nequi (TODOs claros)

## Modelo de datos (MVP)

```text
profiles            (id, role: customer|courier|admin, name, phone, city, created_at)
couriers            (user_id, license_plate, document_url, is_online, current_lat, current_lng, last_seen, balance_owed)
addresses           (id, user_id, label, address, lat, lng)
orders              (id, customer_id, courier_id NULL, status, pickup_addr, pickup_lat/lng,
                     dropoff_addr, dropoff_lat/lng, description, distance_km, fare_cop,
                     courier_earnings, platform_fee, payment_method, created_at, accepted_at, delivered_at)
order_events        (id, order_id, type, courier_id, payload, created_at)  -- auditoría
courier_ledger      (id, courier_id, order_id, type: cash_collected|fee_owed|payout, amount, created_at)
```

**Concurrencia**: la aceptación usa un `UPDATE orders SET courier_id=$1, status='accepted' WHERE id=$2 AND courier_id IS NULL RETURNING *`. Si retorna 0 filas → ya fue tomada. RLS y RPC garantizan que solo un repartidor se quede con la orden.

## Lógica de tarifas

- Tarifa base: $6.000 COP (hasta 2 km)
- $1.500 COP por km adicional
- Comisión plataforma: 20% — repartidor: 80%
- Cálculo automático con Google Routes (distancia real)

## Flujo de orden en tiempo real

1. Cliente crea orden → INSERT con `status='pending'`, `courier_id=NULL`
2. Supabase Realtime emite el INSERT a todos los repartidores online del city
3. Apps de repartidores filtran por distancia (≤ 5 km) → muestran modal + sonido + push
4. Primer repartidor en aceptar gana la "carrera" (UPDATE atómico)
5. Los demás reciben el UPDATE → cierran modal automáticamente
6. Cliente y repartidor ven mapa en vivo (courier publica ubicación cada 5s)

## Pantallas MVP

**App Cliente** (`/`, `/order/new`, `/order/[id]`, `/history`, `/profile`)
- Landing con CTA, login/registro (teléfono + OTP o email)
- Crear pedido: origen (auto-GPS), destino (autocomplete Places), descripción, método de pago
- Tracking en vivo con mapa, ETA, datos del repartidor

**App Repartidor** (`/courier`, `/courier/active`, `/courier/earnings`)
- Toggle online/offline (publica ubicación)
- Feed de órdenes entrantes con modal + sonido
- Navegación al pickup → al dropoff
- Ganancias del día, balance pendiente a entregar

**Panel Admin** (`/admin`, `/admin/orders`, `/admin/couriers`, `/admin/finances`)
- Mapa en vivo de repartidores
- Tabla de órdenes activas/completadas
- Gestión de repartidores (aprobar, suspender)
- Finanzas: ingresos plataforma, balances pendientes por repartidor

## Roles y seguridad

- Tabla `user_roles` separada (nunca en profiles) + función `has_role()` security definer
- RLS estricto: cliente ve solo sus órdenes, repartidor ve pendientes de su ciudad + las suyas, admin todo
- Server functions con `requireSupabaseAuth` para mutaciones críticas
- Acceso admin solo vía rol verificado server-side

## Plan de entrega por iteraciones

Voy a empezar por las bases sólidas y luego ir capa por capa. **Esta primera entrega** incluye:

1. Habilitar Lovable Cloud
2. Design system (oscuro, naranja/amarillo motoYa-style, mobile-first)
3. Landing pública con propuesta de valor
4. Auth (email/password + Google) con elección de rol al registrarse
5. Schema completo de DB + RLS + función de aceptación atómica
6. Shells de las 3 apps (cliente, repartidor, admin) navegables
7. Configurar PWA (manifest + service worker básico)

**Siguiente iteración** (cuando confirmes la base):
- Integrar Google Maps (conector) — necesitarás conectarlo
- Flujo completo de crear orden + cálculo de tarifa
- Realtime de aceptación + sonido + push
- Mapa en vivo del repartidor

**Tercera iteración**:
- Panel admin completo con métricas
- Balances de efectivo y ledger
- Capa de pagos abstracta + stub Nequi

## Lo que necesitaré de ti más adelante

- **Conector Google Maps** (te guío cuando llegue el momento — un click)
- **Logo o nombre definitivo** (uso "MotoYa" como placeholder)
- **Credenciales Nequi** cuando las tengas (la estructura queda lista)

## Importante

No voy a intentar entregar todo en un solo turno — eso garantiza bugs. Construyo iterativamente, verificando cada capa. ¿Procedo con la iteración 1?
