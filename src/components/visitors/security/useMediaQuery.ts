import { useEffect, useState } from "react";

/** Tracks a CSS media query; used to swap panel placement between phone, tablet and wide layouts. */
export function useMediaQuery(query: string): boolean {
  const get = () => (typeof window === "undefined" ? false : window.matchMedia(query).matches);
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
