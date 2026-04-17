import logoImg from "@/assets/nevorai-mark.png";

export const Logo = ({ size = "default" }: { size?: "sm" | "default" | "lg" }) => {
  const sizes = {
    sm: { img: "w-8 h-8", text: "text-[15px]" },
    default: { img: "w-10 h-10", text: "text-[18px]" },
    lg: { img: "w-14 h-14", text: "text-[24px]" },
  };

  return (
    <div className="flex items-center gap-2">
      <img src={logoImg} alt="Nevorai Flow" className={`${sizes[size].img} object-contain`} />
      <div className={`flex items-baseline ${sizes[size].text}`} style={{ lineHeight: 1 }}>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            fontWeight: 600,
            color: "hsl(var(--foreground))",
            letterSpacing: "-0.02em",
          }}
        >
          Nevorai
        </span>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            fontWeight: 800,
            color: "hsl(var(--foreground))",
            letterSpacing: "-0.03em",
            marginLeft: "4px",
          }}
        >
          Flow
        </span>
      </div>
    </div>
  );
};
