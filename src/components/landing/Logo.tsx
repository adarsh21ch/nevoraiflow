import { brand } from "@/config/brand";
import logoImg from "@/assets/logo.png";

export const Logo = ({ size = "default" }: { size?: "sm" | "default" | "lg" }) => {
  const sizes = {
    sm: { text: "text-lg", img: "w-7 h-7" },
    default: { text: "text-xl", img: "w-8 h-8" },
    lg: { text: "text-2xl", img: "w-10 h-10" },
  };

  return (
    <div className={`flex items-center gap-2 font-heading font-bold ${sizes[size].text}`}>
      <img src={logoImg} alt="Nevorai Flow" className={`${sizes[size].img} object-contain`} />
      <span className="text-foreground">{brand.nameShort}</span>
      <span className="gradient-text font-bold">{brand.nameAccent}</span>
    </div>
  );
};
