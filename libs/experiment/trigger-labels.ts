import type { TriggerA, TriggerB } from "@/types/experiment";

// Copy aprobado en VEGA_Fase_4C, pantallas A1/B1.
export const TRIGGER_LABELS_A: Record<TriggerA, string> = {
  career: "Trabajo o carrera",
  blocked: "Me siento bloqueado/a",
  major_change: "Estoy viviendo un cambio importante",
  identity: "Identidad / quién soy",
  family: "Familia",
  repeating_pattern: "Hay un patrón que se repite",
  relationship_spillover: "Una relación está afectando a otras áreas de mi vida",
  other: "Otro",
};

export const TRIGGER_LABELS_B: Record<TriggerB, string> = {
  new_connection: "Nueva conexión",
  relationship: "Estamos en una relación",
  conflict: "Conflicto",
  distance: "Distanciamiento",
  breakup: "Ruptura",
  ex: "Es mi ex",
  on_off: "Relación on/off",
  other: "Otro",
};
