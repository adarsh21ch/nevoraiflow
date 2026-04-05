import { brand } from "@/config/brand";

export const Logo = ({ size = "default" }: { size?: "sm" | "default" | "lg" }) => {
  const sizes = {
    sm: "text-lg",
    default: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-2 font-heading font-bold ${sizes[size]}`}>
      <div className="gradient-primary w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm">
        N
      </div>
      <span className="text-foreground">{brand.nameShort}</span>
      <span className="gradient-text">{brand.nameAccent}</span>
    </div>
  );
};
