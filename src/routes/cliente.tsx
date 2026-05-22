import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, History, MapPin, Wallet } from "lucide-react";
import { formatCop } from "@/lib/fare";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export const Route = createFileRoute("/cliente")({
  head: () => ({ meta: [{ title: "MotoYa · Mis pedidos" }] }),
  component: ClientePage,
});

function ClientePage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => setOrders((data as Order[]) ?? []));
  }, [user]);

  const active = orders.find((o) => ["pending", "accepted", "picked_up"].includes(o.status));

  return (
    <AppShell requireRole="customer" title="Cliente">
      <section className="rounded-3xl border border-border bg-gradient-surface p-6 shadow-card">
        <p className="text-sm text-muted-foreground">Hola,</p>
        <h1 className="mt-1 text-2xl font-black">
          {user?.user_metadata?.full_name || "Bienvenido"} 👋
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Pide un domicilio en moto y recíbelo en minutos.</p>

        <Link
          to="/nuevo-pedido"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-4 text-base font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
        >
          <Plus className="h-5 w-5" /> Crear pedido
        </Link>
      </section>

      {active && (
        <section className="mt-6 rounded-3xl border border-primary/40 bg-primary/5 p-5 shadow-card">
          <p className="text-xs font-bold uppercase text-primary">Pedido en curso</p>
          <p className="mt-1 text-sm truncate">{active.pickup_address} → {active.dropoff_address}</p>
          <Link to="/pedido/$id" params={{ id: active.id }}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-gradient-primary py-2.5 text-sm font-bold text-primary-foreground shadow-glow">
            Ver en vivo
          </Link>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
          <History className="inline h-4 w-4 mr-1" /> Mis pedidos
        </h2>
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
            Aún no tienes pedidos. ¡Crea el primero!
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <Link key={o.id} to="/pedido/$id" params={{ id: o.id }} className="block rounded-2xl border border-border bg-surface p-4 hover:border-primary/40 transition">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${o.status === "delivered" ? "bg-success/15 text-success" : o.status === "cancelled" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
                    {o.status}
                  </span>
                  <span className="font-bold">{formatCop(o.fare_cop)}</span>
                </div>
                <p className="mt-2 flex items-center gap-1 text-sm truncate"><MapPin className="h-3 w-3 text-primary shrink-0" /> {o.pickup_address}</p>
                <p className="flex items-center gap-1 text-sm truncate text-muted-foreground"><MapPin className="h-3 w-3 text-accent shrink-0" /> {o.dropoff_address}</p>
                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <Wallet className="h-3 w-3" /> {o.payment_method === "cash" ? "Efectivo" : "Nequi"} · {new Date(o.created_at).toLocaleDateString("es-CO")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
