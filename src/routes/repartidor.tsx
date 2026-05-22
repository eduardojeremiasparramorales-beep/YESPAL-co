import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Power, Wallet, Inbox, ShieldAlert, MapPin, Package, Loader2, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatCop, haversineKm } from "@/lib/fare";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

interface CourierRow {
  status: "pending_approval" | "approved" | "suspended";
  is_online: boolean;
  license_plate: string;
  balance_owed_cop: number;
  current_lat: number | null;
  current_lng: number | null;
}

export const Route = createFileRoute("/repartidor")({
  head: () => ({ meta: [{ title: "MotoYa · Repartidor" }] }),
  component: CourierPage,
});

function CourierPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courier, setCourier] = useState<CourierRow | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [pending, setPending] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initial fetch
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [c, a, p] = await Promise.all([
        supabase.from("couriers").select("status, is_online, license_plate, balance_owed_cop, current_lat, current_lng").eq("user_id", user.id).maybeSingle(),
        supabase.from("orders").select("*").eq("courier_id", user.id).in("status", ["accepted", "picked_up"]).maybeSingle(),
        supabase.from("orders").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      ]);
      if (c.error) toast.error(c.error.message);
      setCourier(c.data as CourierRow | null);
      setActiveOrder((a.data as Order) ?? null);
      setPending((p.data as Order[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  // Realtime: new pending orders + status changes
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("courier-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const o = payload.new as Order;
        if (o.status === "pending") {
          setPending((prev) => [o, ...prev]);
          try { audioRef.current?.play().catch(() => {}); } catch {}
          toast.success("¡Nuevo pedido disponible!");
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const o = payload.new as Order;
        setPending((prev) => prev.filter((x) => x.id !== o.id || o.status === "pending"));
        if (o.courier_id === user.id && ["accepted", "picked_up"].includes(o.status)) setActiveOrder(o);
        if (o.status === "delivered" || o.status === "cancelled") {
          setActiveOrder((cur) => (cur?.id === o.id ? null : cur));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Periodic location publish when online
  useEffect(() => {
    if (!user || !courier?.is_online) return;
    if (!navigator.geolocation) return;
    const push = () => navigator.geolocation.getCurrentPosition(async (pos) => {
      await supabase.from("couriers").update({
        current_lat: pos.coords.latitude, current_lng: pos.coords.longitude,
        last_seen: new Date().toISOString(),
      }).eq("user_id", user.id);
      setCourier((c) => c ? { ...c, current_lat: pos.coords.latitude, current_lng: pos.coords.longitude } : c);
    }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
    push();
    const i = setInterval(push, 15000);
    return () => clearInterval(i);
  }, [user, courier?.is_online]);

  const toggleOnline = async () => {
    if (!user || !courier) return;
    setToggling(true);
    const next = !courier.is_online;
    const { error } = await supabase.from("couriers").update({ is_online: next, last_seen: new Date().toISOString() }).eq("user_id", user.id);
    setToggling(false);
    if (error) return toast.error(error.message);
    setCourier({ ...courier, is_online: next });
    toast.success(next ? "Estás en línea" : "Estás fuera de línea");
  };

  const accept = async (orderId: string) => {
    setAcceptingId(orderId);
    const { data, error } = await supabase.rpc("accept_order", { _order_id: orderId });
    setAcceptingId(null);
    if (error) return toast.error(error.message);
    toast.success("¡Pedido aceptado!");
    navigate({ to: "/pedido/$id", params: { id: (data as Order).id } });
  };

  if (loading) return <AppShell requireRole="courier" title="Repartidor"><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;

  if (!courier) return <AppShell requireRole="courier" title="Repartidor"><p>No encontramos tus datos.</p></AppShell>;

  if (courier.status !== "approved") {
    return (
      <AppShell requireRole="courier" title="Repartidor">
        <div className="rounded-3xl border border-warning/40 bg-warning/10 p-6 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-warning" />
          <h2 className="mt-3 text-xl font-bold">Cuenta pendiente de aprobación</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Un administrador revisará tu placa <strong>{courier.license_plate}</strong> y activará tu cuenta.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell requireRole="courier" title="Repartidor">
      <audio ref={audioRef} preload="auto" src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=" />

      <section className="rounded-3xl border border-border bg-gradient-surface p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Estado</p>
            <p className="mt-1 text-2xl font-black">
              {courier.is_online ? <span className="text-success">En línea</span> : <span className="text-muted-foreground">Fuera de línea</span>}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Placa · {courier.license_plate}</p>
          </div>
          <button onClick={toggleOnline} disabled={toggling}
            className={`grid h-16 w-16 place-items-center rounded-full text-primary-foreground shadow-glow transition disabled:opacity-60 ${courier.is_online ? "bg-success" : "bg-gradient-primary"}`}>
            <Power className="h-7 w-7" />
          </button>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link to="/repartidor/ganancias" className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><TrendingUp /></div>
          <p className="mt-3 text-xs text-muted-foreground">Mis ganancias</p>
          <p className="text-lg font-bold">Ver detalle</p>
        </Link>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-warning/15 text-warning"><Wallet /></div>
          <p className="mt-3 text-xs text-muted-foreground">Debes a la plataforma</p>
          <p className="text-lg font-bold">{formatCop(courier.balance_owed_cop)}</p>
        </div>
      </section>

      {activeOrder && (
        <section className="mt-6 rounded-3xl border border-primary/40 bg-primary/5 p-5 shadow-card">
          <p className="text-xs font-bold uppercase text-primary">Pedido activo</p>
          <p className="mt-1 text-sm">{activeOrder.pickup_address} → {activeOrder.dropoff_address}</p>
          <Button asChild className="mt-3 w-full bg-gradient-primary text-primary-foreground shadow-glow font-bold">
            <Link to="/pedido/$id" params={{ id: activeOrder.id }}>Continuar pedido</Link>
          </Button>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
          <Inbox className="inline h-4 w-4 mr-1" /> Pedidos disponibles ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
            {courier.is_online ? "Esperando pedidos cercanos…" : "Activa el estado en línea para recibir pedidos."}
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((o) => {
              const dist = courier.current_lat && courier.current_lng
                ? haversineKm({ lat: courier.current_lat, lng: courier.current_lng }, { lat: o.pickup_lat, lng: o.pickup_lng })
                : null;
              return (
                <div key={o.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-black text-success">{formatCop(o.courier_earnings_cop)}</p>
                      <p className="text-xs text-muted-foreground">Tu ganancia · {Number(o.distance_km).toFixed(1)} km</p>
                    </div>
                    {dist !== null && (
                      <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">
                        {dist.toFixed(1)} km de ti
                      </span>
                    )}
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="flex items-start gap-2"><MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" /> <span className="truncate">{o.pickup_address}</span></p>
                    <p className="flex items-start gap-2"><MapPin className="h-4 w-4 text-accent mt-0.5 shrink-0" /> <span className="truncate">{o.dropoff_address}</span></p>
                    {o.description && <p className="flex items-start gap-2 text-muted-foreground"><Package className="h-4 w-4 mt-0.5 shrink-0" /> <span className="truncate">{o.description}</span></p>}
                  </div>
                  <Button onClick={() => accept(o.id)} disabled={acceptingId === o.id || !!activeOrder}
                    className="mt-3 w-full bg-gradient-primary text-primary-foreground shadow-glow font-bold">
                    {acceptingId === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aceptar pedido"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
