import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth, homeForRoles } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional().default("login"),
  role: z.enum(["customer", "courier"]).optional().default("customer"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Entrar a MotoYa" },
      { name: "description", content: "Inicia sesión o crea tu cuenta en MotoYa." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, role } = Route.useSearch();
  const navigate = useNavigate();
  const { user, roles, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">(mode);
  const [signupRole, setSignupRole] = useState<"customer" | "courier">(role);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: homeForRoles(roles) });
    }
  }, [user, roles, authLoading, navigate]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bienvenido de vuelta");
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La contraseña debe tener mínimo 8 caracteres");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name, phone, role: signupRole, city: "Bucaramanga" },
      },
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }

    // Si es repartidor, crear courier row
    if (signupRole === "courier" && data.user) {
      const { error: cErr } = await supabase
        .from("couriers")
        .insert({ user_id: data.user.id, license_plate: plate.toUpperCase() });
      if (cErr) console.error(cErr);
    }
    setSubmitting(false);
    toast.success("¡Cuenta creada! Bienvenido a MotoYa");
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error("No se pudo iniciar sesión con Google");
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-surface">
      <header className="mx-auto w-full max-w-md px-4 py-5">
        <Link to="/"><BrandLogo /></Link>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-8">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-card">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            <button
              onClick={() => setTab("login")}
              className={`rounded-lg py-2 text-sm font-bold transition ${
                tab === "login" ? "bg-surface-elevated text-foreground shadow" : "text-muted-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`rounded-lg py-2 text-sm font-bold transition ${
                tab === "signup" ? "bg-surface-elevated text-foreground shadow" : "text-muted-foreground"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input label="Correo" type="email" value={email} onChange={setEmail} required />
              <Input label="Contraseña" type="password" value={password} onChange={setPassword} required />
              <Submit busy={submitting}>Entrar</Submit>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <RoleButton active={signupRole === "customer"} onClick={() => setSignupRole("customer")}>
                  Soy cliente
                </RoleButton>
                <RoleButton active={signupRole === "courier"} onClick={() => setSignupRole("courier")}>
                  Soy repartidor
                </RoleButton>
              </div>
              <Input label="Nombre completo" value={name} onChange={setName} required />
              <Input label="Teléfono" type="tel" value={phone} onChange={setPhone} required placeholder="3001234567" />
              <Input label="Correo" type="email" value={email} onChange={setEmail} required />
              <Input label="Contraseña" type="password" value={password} onChange={setPassword} required placeholder="Mínimo 8 caracteres" />
              {signupRole === "courier" && (
                <Input label="Placa de la moto" value={plate} onChange={setPlate} required placeholder="ABC12D" />
              )}
              <Submit busy={submitting}>
                {signupRole === "courier" ? "Registrar repartidor" : "Crear cuenta"}
              </Submit>
              {signupRole === "courier" && (
                <p className="text-center text-xs text-muted-foreground">
                  Tu cuenta quedará pendiente de aprobación por un administrador.
                </p>
              )}
            </form>
          )}

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> O <div className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={handleGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-elevated py-2.5 text-sm font-bold transition hover:bg-muted"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Continuar con Google
          </button>
        </div>
      </main>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}

function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-60"
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

function RoleButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 py-2.5 text-sm font-bold transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-surface-elevated text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
