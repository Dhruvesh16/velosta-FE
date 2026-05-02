"use client";

import { useEffect, useState } from "react";

/** True at maxWidthPx and below (matches Tailwind `md`). SSR-safe initial false → correct after hydration. */
export function useNarrowViewport(maxWidthPx = 767) {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [maxWidthPx]);

  return narrow;
}
