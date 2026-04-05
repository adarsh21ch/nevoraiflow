import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/[0.06]">
      <div className="container flex items-center justify-between h-16">
        <Link to="/">
          <Logo />
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          <Link to="/auth">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link to="/auth?tab=signup">
            <Button variant="hero" size="sm">Start Free</Button>
          </Link>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden glass-card border-t border-white/[0.06] p-4 flex flex-col gap-3">
          <a href="#features" className="text-sm text-muted-foreground py-2" onClick={() => setOpen(false)}>Features</a>
          <a href="#pricing" className="text-sm text-muted-foreground py-2" onClick={() => setOpen(false)}>Pricing</a>
          <a href="#faq" className="text-sm text-muted-foreground py-2" onClick={() => setOpen(false)}>FAQ</a>
          <Link to="/auth" onClick={() => setOpen(false)}>
            <Button variant="outline" className="w-full">Log in</Button>
          </Link>
          <Link to="/auth?tab=signup" onClick={() => setOpen(false)}>
            <Button variant="hero" className="w-full">Start Free</Button>
          </Link>
        </div>
      )}
    </nav>
  );
};
