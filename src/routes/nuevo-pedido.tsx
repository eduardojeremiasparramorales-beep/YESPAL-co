import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Crosshair, Loader2, Wallet, Package } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { geocodeAddress, computeRouteDistance } from "@/lib/maps.functions";
import { calculateFare, formatCop, type FareBreakdown } from "@/lib/fare";

export const Route = createFileRoute("/nuevo-pedido")({
  head: () => ({ meta: [{ title: "MotoYa · Nuevo pedido" }] }),
  component: NewOrderPage,
});

interface Point { lat: number; lng: number; address: string }

function NewOrderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const geocode = useServerFn(geocodeAddress);
  const route = useServerFn(computeRouteDistance);

  const [pickupRaw, setPickupRaw] = useState("");
  const [dropoffRaw, setDropoffRaw] = useState("");
  const [description, setDescription] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "nequi">("cash");
  const [pickup, setPickup] = useState<Point | null>(null);
  const [dropoff, setDropoff] = useState<Point | null>(null);
  const [fare, setFare] = useState<FareBreakdown | null>(null);
  const [step, setStep] = useState<"form" | "preview">("form");
  const [busy, setBusy] = useState(false);

  const useGps = () => {
    if (!navigator.geolocation) return toast.error("Tu navegador no soporta GPS");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setPickup({ lat, lng, address: `Mi ubicación (${lat.toFixed(4)}, ${lng.toFixed(4)})` });
        setPickupRaw("Mi ubicación actual");
        toast.success("Ubicación detectada");
      },
      () => toast.error("No pudimos obtener tu ubicación"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const calculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupRaw.trim() || !dropoffRaw.trim()) return toast.error("Ingresa origen y destino");
    setBusy(true);
    try {
      let pickupPt: Point;
      if (pickup) {
        pickupPt = pickup;
      } else {
        const p = await geocode({ data: { address: pickupRaw, city: "Bucaramanga" } });
        pickupPt = { lat: p.lat, lng: p.lng, address: p.formatted };
      }
      const d = await geocode({ data: { address: dropoffRaw, city: "Bucaramanga" } });
      const dropoffPt: Point = { lat: d.lat, lng: d.lng, address: d.formatted };
      const r = await route({ data: { origin: { lat: pickupPt.lat, lng: pickupPt.lng }, destination: { lat: dropoffPt.lat, lng: dropoffPt.lng } } });
      const f = calculateFare(r.distance_km);
      setPickup(pickupPt);
      setDropoff(dropoffPt);
      setFare(f);
      setStep("preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al calcular");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!user || !pickup || !dropoff || !fare) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        city: "Bucaramanga",
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: dropoff.address,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        description: description || null,
        recipient_name: recipientName || null,
        recipient_phone: recipientPhone || null,
        distance_km: fare.distance_km,
        fare_cop: fare.fare_cop,
        platform_fee_cop: fare.platform_fee_cop,
        courier_earnings_cop: fare.courier_earnings_cop,
        payment_method: paymentMethod,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("¡Pedido creado! Buscando repartidor…");
    navigate({ to: "/pedido/$id", params: { id: data.id } });
  };

  return (
    <AppShell requireRole="customer" title="Nuevo pedido">
      <Link to="/cliente" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      {step === "form" ? (
        <form onSubmit={calculate} className="space-y-5 rounded-3xl border border-border bg-surface p-6 shadow-card">
          <h1 className="text-2xl font-black">¿A dónde vamos?</h1>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Recoger en</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <Input
                  className="pl-9"
                  placeholder="Cra 27 #45-12"
                  value={pickupRaw}
                  onChange={(e) => { setPickupRaw(e.target.value); setPickup(null); }}
                />
              </div>
              <Button type="button" variant="outline" size="icon" onClick={useGps} title="Usar GPS">
                <Crosshair className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Entregar en</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
              <Input className="pl-9" placeholder="Cl 56 #34-08" value={dropoffRaw} onChange={(e) => setDropoffRaw(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Nombre de quien recibe</label>
              <Input placeholder="Opcional" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Teléfono</label>
              <Input placeholder="Opcional" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Detalles del pedido</label>
            <Input placeholder="Ej: Caja mediana, recoger en portería" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Método de pago</label>
            <div className="grid grid-cols-2 gap-2">
              <PayBtn active={paymentMethod === "cash"} onClick={() => setPaymentMethod("cash")} label="Efectivo" />
              <PayBtn active={paymentMethod === "nequi"} onClick={() => setPaymentMethod("nequi")} label="Nequi · pronto" disabled />
            </div>
          </div>

          <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground shadow-glow h-12 text-base font-bold">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular tarifa"}
          </Button>
        </form>
      ) : (
        <div className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-card">
          <h2 className="text-xl font-black">Resumen del pedido</h2>
          <Row icon={<MapPin className="text-primary" />} label="Recoge" value={pickup!.address} />
          <Row icon={<MapPin className="text-accent" />} label="Entrega" value={dropoff!.address} />
          <Row icon={<Package />} label="Distancia" value={`${fare!.distance_km.toFixed(1)} km`} />
          <Row icon={<Wallet />} label="Total a pagar" value={`${formatCop(fare!.fare_cop)} · ${paymentMethod === "cash" ? "Efectivo" : "Nequi"}`} />

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("form")} disabled={busy}>Editar</Button>
            <Button onClick={confirm} disabled={busy} className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow font-bold">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar pedido"}
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function PayBtn({ active, onClick, label, disabled }: { active: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface-elevated text-muted-foreground hover:text-foreground"}`}>
      {label}
    </button>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-border pb-3 last:border-0">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
