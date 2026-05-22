import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Package, Wallet, Bike, Phone, Loader2, CheckCircle2, Clock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LiveMap } from "@/components/live-map";
import { formatCop } from "@/lib/fare";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Courier = Database["public"]["Tables"]["couriers"]["Row"];

export const Route = createFileRoute("/pedido/$id")({
  head: () => ({ meta: [{ title: "MotoYa · Pedido" }] }),
  component: OrderTrackingPage,
});

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Buscando repartidor", color: "text-warning", icon: <Clock className="h-4 w-4" /> },
  accepted: { label: "Repartidor en camino al origen", color: "text-primary", icon: <Bike className="h-4 w-4" /> },
  picked_up: { label: "En ruta al destino", color: "text-accent", icon: <Bike className="h-4 w-4" /> },
  delivered: { label: "Entregado", color: "text-success", icon: <CheckCircle2 className="h-4 w-4" /> },
  cancelled: { label: "Cancelado", color: "text-destructive", icon: <Clock className="h-4 w-4" /> },
};

function OrderTrackingPage() {
  const { id } = Route.useParams();
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [courier, setCourier] = useState<Pick<Courier, "user_id" | "license_plate" | "current_lat" | "current_lng"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const isCourier = roles.includes("courier");
  const requireRole = isCourier ? "courier" : "customer";

  // Initial load + subscriptions
  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (!active) return;
      if (error || !data) { toast.error("Pedido no encontrado"); setLoading(false); return; }
      setOrder(data);
      setLoading(false);
      if (data.courier_id) loadCourier(data.courier_id);
    };
    const loadCourier = async (cid: string) => {
      const { data } = await supabase.from("couriers").select("user_id, license_plate, current_lat, current_lng").eq("user_id", cid).maybeSingle();
      if (data && active) setCourier(data);
    };

    load();

    const orderCh = supabase.channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload) => {
          const next = payload.new as Order;
          setOrder(next);
          if (next.courier_id && next.courier_id !== courier?.user_id) loadCourier(next.courier_id);
        })
      .subscribe();

    return () => { active = false; supabase.removeChannel(orderCh); };
  }, [id, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to courier location updates
  useEffect(() => {
    if (!order?.courier_id) return;
    const ch = supabase.channel(`courier-${order.courier_id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "couriers", filter: `user_id=eq.${order.courier_id}` },
        (payload) => {
          const c = payload.new as Courier;
          setCourier((prev) => prev ? { ...prev, current_lat: c.current_lat, current_lng: c.current_lng } : prev);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [order?.courier_id]);

  // Courier-only: publish own location every 8s while order is active
  useEffect(() => {
    if (!isCourier || !user || !order || !["accepted", "picked_up"].includes(order.status)) return;
    if (!navigator.geolocation) return;
    const push = () => navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await supabase.from("couriers").update({
          current_lat: pos.coords.latitude, current_lng: pos.coords.longitude,
          last_seen: new Date().toISOString(),
        }).eq("user_id", user.id);
      },
      () => {}, { enableHighAccuracy: true, timeout: 8000 });
    push();
    const i = setInterval(push, 8000);
    return () => clearInterval(i);
  }, [isCourier, user, order]);

  const cancel = async () => {
    if (!order) return;
    setActing(true);
    const { error } = await supabase.from("orders").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", order.id);
    setActing(false);
    if (error) toast.error(error.message); else toast.success("Pedido cancelado");
  };

  const pickup = async () => {
    setActing(true);
    const { error } = await supabase.rpc("mark_picked_up", { _order_id: id });
    setActing(false);
    if (error) toast.error(error.message); else toast.success("Marcaste como recogido");
  };

  const complete = async () => {
    setActing(true);
    const { error } = await supabase.rpc("complete_order", { _order_id: id });
    setActing(false);
    if (error) toast.error(error.message); else { toast.success("¡Pedido entregado!"); navigate({ to: "/repartidor" }); }
  };

  if (loading) return <AppShell requireRole={requireRole} title="Pedido"><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;
  if (!order) return <AppShell requireRole={requireRole} title="Pedido"><p>Pedido no encontrado.</p></AppShell>;

  const meta = STATUS_META[order.status];
  const courierLoc = courier?.current_lat && courier?.current_lng ? { lat: courier.current_lat, lng: courier.current_lng } : null;

  return (
    <AppShell requireRole={requireRole} title="Pedido en curso">
      <Link to={isCourier ? "/repartidor" : "/cliente"} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <div className={`mb-4 inline-flex items-center gap-2 rounded-full border border-current/30 bg-current/10 px-3 py-1 text-xs font-bold ${meta.color}`}>
        {meta.icon} {meta.label}
      </div>

      <LiveMap
        pickup={{ lat: order.pickup_lat, lng: order.pickup_lng }}
        dropoff={{ lat: order.dropoff_lat, lng: order.dropoff_lng }}
        courier={courierLoc}
        className="h-72 w-full rounded-3xl border border-border shadow-card"
      />

      <div className="mt-4 space-y-3 rounded-3xl border border-border bg-surface p-5 shadow-card">
        <Row icon={<MapPin className="text-primary" />} label="Recoge" value={order.pickup_address} />
        <Row icon={<MapPin className="text-accent" />} label="Entrega" value={order.dropoff_address} />
        {order.description && <Row icon={<Package />} label="Detalle" value={order.description} />}
        {order.recipient_name && <Row icon={<Phone />} label="Recibe" value={`${order.recipient_name}${order.recipient_phone ? ` · ${order.recipient_phone}` : ""}`} />}
        <Row icon={<Package />} label="Distancia" value={`${Number(order.distance_km).toFixed(1)} km`} />
        <Row icon={<Wallet />} label={isCourier ? "Tu ganancia" : "Total"} value={isCourier ? formatCop(order.courier_earnings_cop) : `${formatCop(order.fare_cop)} · ${order.payment_method === "cash" ? "Efectivo" : "Nequi"}`} />
        {courier && (
          <Row icon={<Bike />} label="Repartidor" value={`Placa ${courier.license_plate}`} />
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {!isCourier && order.status === "pending" && (
          <Button variant="destructive" disabled={acting} onClick={cancel} className="flex-1">Cancelar pedido</Button>
        )}
        {isCourier && order.status === "accepted" && (
          <Button onClick={pickup} disabled={acting} className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow font-bold">
            {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Recogí el pedido"}
          </Button>
        )}
        {isCourier && order.status === "picked_up" && (
          <Button onClick={complete} disabled={acting} className="flex-1 bg-success text-success-foreground font-bold">
            {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Marcar como entregado"}
          </Button>
        )}
      </div>
    </AppShell>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}
