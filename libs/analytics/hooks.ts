"use client";

import { useEffect, useRef } from "react";

// Ejecuta callback como mucho una vez por instancia de componente,
// protegido con un ref (no con el array de dependencias de useEffect),
// para ser robusto frente al doble montaje de React StrictMode en
// desarrollo (VEGA Sprint 1, seccion 15 "idempotencia").
export function useFireOnce(callback: () => void): void {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    callback();
    // callback se ejecuta solo una vez por diseño: no se añade como
    // dependencia a proposito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
