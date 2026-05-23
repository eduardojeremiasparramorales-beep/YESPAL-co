import logoIcon from "@/assets/yespal-icon.png";

export function BrandLogo({ size = "md", showTagline = false }: { size?: "sm" | "md" | "lg"; showTagline?: boolean }) {
  const dims = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const text = size === "lg" ? "text-4xl" : size === "sm" ? "text-xl" : "text-2xl";
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={logoIcon}
        alt="YESPAL"
        className={`${dims} rounded-2xl object-cover shadow-glow`}
      />
      <div className="flex flex-col leading-none">
        <span className={`${text} font-black tracking-tight text-foreground`}>
          YESP<span className="text-primary">AL</span>
        </span>
        {showTagline && (
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Tu pedido, en buenas manos
          </span>
        )}
      </div>
    </div>
  );
}
