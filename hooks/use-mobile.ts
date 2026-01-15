import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;

// Stable subscribe function for useSyncExternalStore
function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", callback);
  window.addEventListener("resize", callback);
  return () => {
    mql.removeEventListener("change", callback);
    window.removeEventListener("resize", callback);
  };
}

// Get current mobile state
function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

// Server snapshot - assume not mobile for SSR
function getServerSnapshot() {
  return false;
}

/**
 * Hook to detect mobile viewport with flicker-free hydration.
 * Uses useSyncExternalStore for consistent SSR/client behavior.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
