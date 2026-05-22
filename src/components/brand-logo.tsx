import { Bike } from "lucide-react";

export function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-7 w-7" : "h-10 w-10";
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl";
  return (
    <div className="flex items-center gap-2">
      <div className={`${dims} grid place-items-center rounded-xl bg-gradient-primary shadow-glow`}>
        <Bike className="h-1/2 w-1/2 text-primary-foreground" strokeWidth={2.5} />
      </div>
      <span className={`${text} font-black tracking-tight`}>
        Moto<span className="text-gradient-primary">Ya</span>
      </span>
    </div>
  );
}
