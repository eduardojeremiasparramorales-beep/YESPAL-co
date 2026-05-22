import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, TrendingUp, Wallet, Package } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatCop } from "@/lib/fare";

export const Route = createFileRoute("/repartidor/ganancias")({
  head: () => ({ meta: [{ title: "MotoYa · Mis ganancias" }] }),
  component: EarningsPage,
});

interface Entry {
  id: string;
  type: "earning" | "fee_owed" | "payout";
  amount_cop: number;
  notes: string | null;
  created_at: string;
  order_id: string | null;
}

function EarningsPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [balance, setBalance] = useState(0);
  const [deliveredCount, setDeliveredCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [l, c, o] = await Promise.all([
        supabase.from("courier_ledger").select("id, type, amount_cop, notes, created_at, order_id").eq("courier_id", user.id).order("created_at", { ascending: false }).limit(100),
        supabase.from("couriers").select("balance_owed_cop").eq("user_id", user.id).maybeSingle(),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("courier_id", user.id).eq("status", "delivered"),
      ]);
      setEntries((l.data as Entry[]) ?? []);
      setBalance(c.data?.balance_owed_cop ?? 0);
      setDeliveredCount(o.count ?? 0);
    })();
  }, [user]);

  const totalEarnings = entries.filter((e) => e.type === "earning").reduce((s, e) => s + e.amount_cop, 0);

  return (
    <AppShell requireRole="courier" title="Mis ganancias">
      <Link to="/repartidor" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card icon={<TrendingUp />} label="Ganado" value={formatCop(totalEarnings)} accent="success" />
        <Card icon={<Wallet />} label="Debes" value={formatCop(balance)} accent="warning" />
        <Card icon={<Package />} label="Entregas" value={String(deliveredCount)} accent="primary" />
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-surface p-5">
        <h2 className="text-sm font-bold uppercase text-muted-foreground mb-3">Movimientos</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay movimientos.</p>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold">{e.notes ?? e.type}</p>
                  <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("es-CO")}</p>
                </div>
                <p className={`font-bold ${e.type === "earning" ? "text-success" : e.type === "fee_owed" ? "text-warning" : "text-muted-foreground"}`}>
                  {e.type === "fee_owed" ? "-" : e.type === "payout" ? "↓" : "+"}{formatCop(e.amount_cop)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Card({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: "success" | "warning" | "primary" }) {
  const color = accent === "success" ? "text-success bg-success/10" : accent === "warning" ? "text-warning bg-warning/10" : "text-primary bg-primary/10";
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}>{icon}</div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}
