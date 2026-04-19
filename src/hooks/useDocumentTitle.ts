import { useEffect } from "react";

/**
 * Sets document.title to "<title> — nFlow" while mounted.
 * Restores previous title on unmount.
 */
export function useDocumentTitle(title: string, suffix = "nFlow") {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} — ${suffix}` : suffix;
    return () => {
      document.title = previous;
    };
  }, [title, suffix]);
}
