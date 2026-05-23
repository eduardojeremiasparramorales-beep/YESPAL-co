import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bike, Zap, MapPin, ShieldCheck, Wallet, Bell } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth, homeForRoles } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "YESPAL — Domicilios al instante en moto" },
      { name: "description", content: "Pide un domicilio y recíbelo en minutos. Cobertura en Acacías, pagos en efectivo y pronto Nequi." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: homeForRoles(roles) });
    }
  }, [user, roles, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-surface">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <BrandLogo />
        <Link
          to="/auth"
          className="rounded-xl border border-border bg-surface/60 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-surface"
        >
          Entrar
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 md:pt-16">
        <section className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Zap className="h-3.5 w-3.5" /> En vivo · Acacías
            </div>
            <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
              Tu domicilio,<br />
              <span className="text-gradient-primary">en minutos.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Solicita un mensajero en moto y recíbelo donde quieras. Rápido, transparente y seguro.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup", role: "customer" }}
                className="rounded-xl bg-gradient-primary px-6 py-3 text-base font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]"
              >
                Pedir un domicilio
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup", role: "courier" }}
                className="rounded-xl border border-border bg-surface px-6 py-3 text-base font-bold transition hover:bg-surface-elevated"
              >
                Soy repartidor
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Tarifa desde <strong className="text-foreground">$6.000 COP</strong> · El repartidor recibe el 80%.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-primary opacity-20 blur-3xl" />
            <div className="relative rounded-3xl border border-border bg-surface p-6 shadow-card">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="h-10 w-10 rounded-full bg-gradient-primary grid place-items-center">
                  <Bike className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Repartidor cerca</p>
                  <p className="font-bold">Llega en 6 min</p>
                </div>
                <span className="ml-auto rounded-full bg-success/15 px-2 py-1 text-xs font-bold text-success">
                  En camino
                </span>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <Row icon={<MapPin className="h-4 w-4 text-primary" />} label="Recoge" value="Cra 27 #45-12" />
                <Row icon={<MapPin className="h-4 w-4 text-accent" />} label="Entrega" value="Cl 56 #34-08" />
                <Row icon={<Wallet className="h-4 w-4" />} label="Total" value="$8.500 COP · Efectivo" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-24 grid gap-5 md:grid-cols-3">
          <Feature
            icon={<Zap className="h-5 w-5" />}
            title="Asignación instantánea"
            desc="Tu pedido llega en tiempo real a todos los repartidores cercanos. El primero en aceptar se la lleva."
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Repartidores verificados"
            desc="Cada repartidor pasa por un proceso de validación de documento y placa."
          />
          <Feature
            icon={<Bell className="h-5 w-5" />}
            title="Seguimiento en vivo"
            desc="Mira en el mapa dónde está tu pedido y recibe alertas en cada paso."
          />
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} YESPAL · Hecho en Colombia
      </footer>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-card transition hover:border-primary/40">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
