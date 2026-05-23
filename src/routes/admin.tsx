import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Bike, Package, TrendingUp, Check, Wallet, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCop } from "@/lib/fare";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "YESPAL · Administración" }] }),
  component: AdminPage,
});

interface Stats { customers: number; couriers: number; orders: number; revenue: number; pending: number }
interface CourierItem {
  user_id: string; license_plate: string; status: "pending_approval" | "approved" | "suspended";
  is_online: boolean; balance_owed_cop: number;
  profile?: { full_name: string; phone: string | null };
}

function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [couriers, setCouriers] = useState<CourierItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [customers, couriersCount, ordersCount, revenue, pendingCount, cList, oList] = await Promise.all([
      supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "customer"),
      supabase.from("couriers").select("user_id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("platform_fee_cop").eq("status", "delivered"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("couriers").select("user_id, license_plate, status, is_online, balance_owed_cop").order("created_at", { ascending: false }),
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    const totalRev = (revenue.data ?? []).reduce((s, r) => s + (r.platform_fee_cop ?? 0), 0);
    setStats({
      customers: customers.count ?? 0, couriers: couriersCount.count ?? 0,
      orders: ordersCount.count ?? 0, revenue: totalRev, pending: pendingCount.count ?? 0,
    });

    const list = (cList.data ?? []) as CourierItem[];
    if (list.length > 0) {
      const ids = list.map((c) => c.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, full_name, phone").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      setCouriers(list.map((c) => ({ ...c, profile: map.get(c.user_id) as { full_name: string; phone: string | null } | undefined })));
    } else setCouriers([]);
    setOrders((oList.data as Order[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.from("couriers").update({ status: "approved" }).eq("user_id", id);
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Repartidor aprobado"); load(); }
  };
  const suspend = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.from("couriers").update({ status: "suspended" }).eq("user_id", id);
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Repartidor suspendido"); load(); }
  };
  const settle = async (id: string, amount: number) => {
    if (amount <= 0) return;
    setBusy(id);
    const { error } = await supabase.rpc("settle_courier_balance", { _courier_id: id, _amount: amount, _notes: "Pago recibido" });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Balance saldado"); load(); }
  };

  return (
    <AppShell requireRole="admin" title="Admin">
      <div className="mb-6">
        <h1 className="text-3xl font-black">Panel administrativo</h1>
        <p className="text-sm text-muted-foreground">Operación en tiempo real</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric icon={<Users />} label="Clientes" value={stats?.customers ?? "—"} />
        <Metric icon={<Bike />} label="Repartidores" value={stats?.couriers ?? "—"} />
        <Metric icon={<Package />} label="Pedidos" value={stats?.orders ?? "—"} />
        <Metric icon={<Package />} label="Pendientes" value={stats?.pending ?? "—"} highlight />
        <Metric icon={<TrendingUp />} label="Ingresos" value={stats ? formatCop(stats.revenue) : "—"} />
      </div>

      <Tabs defaultValue="couriers" className="mt-8">
        <TabsList>
          <TabsTrigger value="couriers">Repartidores</TabsTrigger>
          <TabsTrigger value="orders">Pedidos recientes</TabsTrigger>
        </TabsList>

        <TabsContent value="couriers" className="mt-4">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            {couriers.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No hay repartidores registrados.</p>
            ) : couriers.map((c) => (
              <div key={c.user_id} className="flex flex-wrap items-center gap-3 border-b border-border p-4 last:border-0">
                <div className="flex-1 min-w-[180px]">
                  <p className="font-bold">{c.profile?.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Placa {c.license_plate} · {c.profile?.phone ?? "sin teléfono"}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${c.status === "approved" ? "bg-success/15 text-success" : c.status === "suspended" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
                  {c.status === "approved" ? "Activo" : c.status === "suspended" ? "Suspendido" : "Pendiente"}
                </span>
                {c.is_online && <span className="rounded-full bg-success/15 px-2 py-1 text-xs font-bold text-success">En línea</span>}
                <span className="rounded-full bg-warning/10 px-2 py-1 text-xs font-semibold text-warning flex items-center gap-1"><Wallet className="h-3 w-3" /> {formatCop(c.balance_owed_cop)}</span>
                <div className="flex gap-2">
                  {c.status !== "approved" && (
                    <Button size="sm" disabled={busy === c.user_id} onClick={() => approve(c.user_id)} className="bg-gradient-primary text-primary-foreground">
                      {busy === c.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3" /> Aprobar</>}
                    </Button>
                  )}
                  {c.status === "approved" && (
                    <Button size="sm" variant="outline" disabled={busy === c.user_id} onClick={() => suspend(c.user_id)}>Suspender</Button>
                  )}
                  {c.balance_owed_cop > 0 && (
                    <Button size="sm" variant="outline" disabled={busy === c.user_id} onClick={() => settle(c.user_id, c.balance_owed_cop)}>
                      Saldar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            {orders.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No hay pedidos aún.</p>
            ) : orders.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 border-b border-border p-4 last:border-0 text-sm">
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusColor(o.status)}`}>{o.status}</span>
                <div className="flex-1 min-w-[200px]">
                  <p className="truncate">{o.pickup_address} → {o.dropoff_address}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("es-CO")}</p>
                </div>
                <span className="font-bold">{formatCop(o.fare_cop)}</span>
                <span className="text-xs text-muted-foreground">{o.payment_method}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function statusColor(s: string) {
  switch (s) {
    case "delivered": return "bg-success/15 text-success";
    case "cancelled": return "bg-destructive/15 text-destructive";
    case "pending": return "bg-warning/15 text-warning";
    default: return "bg-primary/15 text-primary";
  }
}

function Metric({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-surface p-5 shadow-card ${highlight ? "border-warning/40" : "border-border"}`}>
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${highlight ? "bg-warning text-warning-foreground" : "bg-gradient-primary text-primary-foreground"}`}>{icon}</div>
      <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
