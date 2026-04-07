import logoImg from "@/assets/logo.png";

export const Logo = ({ size = "default" }: { size?: "sm" | "default" | "lg" }) => {
  const sizes = {
    sm: { text: "text-[15px]", img: "w-6 h-6" },
    default: { text: "text-[18px]", img: "w-7 h-7" },
    lg: { text: "text-[22px]", img: "w-9 h-9" },
  };

  return (
    <div className={`flex items-center gap-2 ${sizes[size].text}`}>
      <img src={logoImg} alt="Nevorai Flow" className={`${sizes[size].img} object-contain`} />
      <span className="font-heading font-bold text-foreground tracking-tight" style={{ letterSpacing: "-0.02em" }}>
        Nevorai
      </span>
      <span
        className="font-heading font-extrabold text-primary"
        style={{
          letterSpacing: "-0.03em",
          fontStyle: "italic",
          transform: "skewX(-4deg)",
          display: "inline-block",
          marginLeft: "-2px",
        }}
      >
        Flow
      </span>
    </div>
  );
};
