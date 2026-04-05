import { brand } from "@/config/brand";
import logoImg from "@/assets/logo.png";

export const Logo = ({ size = "default" }: { size?: "sm" | "default" | "lg" }) => {
  const sizes = {
    sm: { text: "text-lg", img: "w-9 h-9" },
    default: { text: "text-xl", img: "w-11 h-11" },
    lg: { text: "text-2xl", img: "w-14 h-14" },
  };

  return (
    <div className={`flex items-center gap-2 font-heading font-bold ${sizes[size].text}`}>
      <img src={logoImg} alt="Nevorai Flow" className={`${sizes[size].img} object-contain`} />
      <span className="text-foreground">{brand.nameShort}</span>
      <span className="gradient-text font-bold">{brand.nameAccent}</span>
    </div>
  );
};
