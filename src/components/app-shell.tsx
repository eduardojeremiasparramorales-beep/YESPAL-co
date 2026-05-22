import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth, homeForRoles, type AppRole } from "@/hooks/use-auth";
import { BrandLogo } from "@/components/brand-logo";
import { LogOut, Loader2 } from "lucide-react";

interface AppShellProps {
  requireRole: AppRole;
  title: string;
  children: ReactNode;
}

export function AppShell({ requireRole, title, children }: AppShellProps) {
  const { user, roles, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!roles.includes(requireRole)) {
      navigate({ to: homeForRoles(roles) });
    }
  }, [user, roles, loading, requireRole, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/"><BrandLogo size="sm" /></Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">{title}</span>
            <button
              onClick={() => signOut()}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-surface-elevated hover:text-foreground"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
