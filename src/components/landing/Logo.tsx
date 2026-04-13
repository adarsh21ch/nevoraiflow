import logoImg from "@/assets/nflow-logo.png";

export const Logo = ({ size = "default" }: { size?: "sm" | "default" | "lg" }) => {
  const sizes = {
    sm: { img: "w-6 h-6", text: "text-[15px]" },
    default: { img: "w-7 h-7", text: "text-[18px]" },
    lg: { img: "w-9 h-9", text: "text-[24px]" },
  };

  return (
    <div className="flex items-center gap-2">
      <img src={logoImg} alt="nFlow" className={`${sizes[size].img} object-contain`} />
      <div className={`flex items-baseline ${sizes[size].text}`} style={{ lineHeight: 1 }}>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            fontWeight: 400,
            fontStyle: "italic",
            color: "hsl(var(--foreground))",
            letterSpacing: "-0.02em",
          }}
        >
          n
        </span>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            fontWeight: 800,
            color: "hsl(var(--foreground))",
            letterSpacing: "-0.03em",
          }}
        >
          Flow
        </span>
      </div>
    </div>
  );
};
