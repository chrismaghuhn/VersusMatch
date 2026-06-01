"use client";

import { useEffect, useState } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";

export function usePartyDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    function sync() {
      setDesktop(mq.matches);
    }
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return desktop;
}

export const PARTY_DESKTOP_MEDIA = DESKTOP_QUERY;
