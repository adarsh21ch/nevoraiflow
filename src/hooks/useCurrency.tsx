import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Currency = "INR" | "USD";
export type Gateway = "razorpay" | "stripe";

interface CurrencyCtx {
  currency: Currency;
  gateway: Gateway;
  symbol: string;
  setCurrency: (c: Currency) => void;
  isAutoDetected: boolean;
}

const Ctx = createContext<CurrencyCtx | null>(null);
const STORAGE_KEY = "nflow_currency_pref";

function detectFromTimezone(): Currency {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.includes("Kolkata") || tz.includes("Calcutta") || tz.startsWith("Asia/Kol")) {
      return "INR";
    }
    // Anything else -> USD
    return "USD";
  } catch {
    return "INR";
  }
}

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<Currency>("INR");
  const [isAutoDetected, setIsAutoDetected] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Currency | null;
    if (stored === "INR" || stored === "USD") {
      setCurrencyState(stored);
      setIsAutoDetected(false);
    } else {
      setCurrencyState(detectFromTimezone());
      setIsAutoDetected(true);
    }
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    setIsAutoDetected(false);
    localStorage.setItem(STORAGE_KEY, c);
  };

  const value: CurrencyCtx = {
    currency,
    gateway: currency === "INR" ? "razorpay" : "stripe",
    symbol: currency === "INR" ? "₹" : "$",
    setCurrency,
    isAutoDetected,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useCurrency(): CurrencyCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCurrency must be used inside CurrencyProvider");
  return v;
}

export function formatPrice(amount: number, currency: Currency): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}
