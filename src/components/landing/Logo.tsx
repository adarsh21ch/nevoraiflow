import logoImg from "@/assets/logo.png";

export const Logo = ({ size = "default" }: { size?: "sm" | "default" | "lg" }) => {
  const sizes = {
    sm: { img: "w-5 h-5", nevorai: "text-[14px]", flow: "text-[14px]" },
    default: { img: "w-6 h-6", nevorai: "text-[17px]", flow: "text-[17px]" },
    lg: { img: "w-8 h-8", nevorai: "text-[22px]", flow: "text-[22px]" },
  };

  return (
    <div className="flex items-center gap-2">
      <img src={logoImg} alt="Nevorai Flow" className={`${sizes[size].img} object-contain`} />
      <div className="flex items-baseline gap-[3px]">
        {/* "Nevorai" — clean, stable, trustworthy */}
        <span
          className={sizes[size].nevorai}
          style={{
            fontFamily: "'Plus Jakarta Sans', 'Sora', system-ui, sans-serif",
            fontWeight: 700,
            color: "hsl(var(--foreground))",
            letterSpacing: "-0.025em",
            lineHeight: 1,
          }}
        >
          Nevorai
        </span>
        {/* "Flow" — dynamic, forward-leaning, fluid */}
        <span
          className={sizes[size].flow}
          style={{
            fontFamily: "'Plus Jakarta Sans', 'Sora', system-ui, sans-serif",
            fontWeight: 800,
            fontStyle: "italic",
            color: "hsl(var(--primary))",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            transform: "skewX(-6deg) translateX(1px)",
            display: "inline-block",
          }}
        >
          Flow
        </span>
      </div>
    </div>
  );
};
