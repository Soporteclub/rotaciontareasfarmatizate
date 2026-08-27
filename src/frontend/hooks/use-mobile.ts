import * as React from "react"

const MOBILE_BREAKPOINT = 768

// FIX (LINT): reemplazado useEffect + setState síncrono por useSyncExternalStore.
// Leer el ancho del viewport es una suscripción a un sistema externo; el patrón
// anterior (setIsMobile dentro del cuerpo del effect) disparaba la regla
// react-hooks/set-state-in-effect.
function subscribeToViewport(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribeToViewport,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  )
}
