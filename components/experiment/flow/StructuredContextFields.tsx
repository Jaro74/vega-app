"use client";

import { RELATIONSHIP_FOCUS_OPTIONS, USER_EMOTIONAL_STATE_OPTIONS } from "@/types/experiment";
import type { ImpactIntensity, RelationshipFocus, UserEmotionalState } from "@/types/experiment";
import { RELATIONSHIP_FOCUS_LABELS, USER_EMOTIONAL_STATE_LABELS } from "@/libs/experiment/structured-context-labels";

// Contexto estructurado de Segmento B (sustituye al texto libre, encargo
// "eliminar free_text de Segmento B"). Las 3 preguntas son opcionales,
// sin "Other" ni textarea -- cada opcion es una pulsacion que alterna
// seleccionado/no seleccionado (nunca un campo de texto).
interface StructuredContextFieldsProps {
  relationshipFocus: RelationshipFocus | null;
  onRelationshipFocusChange: (value: RelationshipFocus | null) => void;
  userEmotionalState: UserEmotionalState | null;
  onUserEmotionalStateChange: (value: UserEmotionalState | null) => void;
  impactIntensity: ImpactIntensity | null;
  onImpactIntensityChange: (value: ImpactIntensity | null) => void;
}

const IMPACT_INTENSITY_VALUES: ImpactIntensity[] = [1, 2, 3, 4, 5];

export default function StructuredContextFields({
  relationshipFocus,
  onRelationshipFocusChange,
  userEmotionalState,
  onUserEmotionalStateChange,
  impactIntensity,
  onImpactIntensityChange,
}: StructuredContextFieldsProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">¿Qué quieres comprender mejor de esta relación? (opcional)</p>
        <div className="flex flex-col gap-2">
          {RELATIONSHIP_FOCUS_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              className={`btn btn-outline justify-start ${relationshipFocus === value ? "btn-active" : ""}`}
              onClick={() => onRelationshipFocusChange(relationshipFocus === value ? null : value)}
            >
              {RELATIONSHIP_FOCUS_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">¿Cómo te sientes respecto a esta relación? (opcional)</p>
        <div className="flex flex-wrap gap-2">
          {USER_EMOTIONAL_STATE_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              className={`btn btn-sm btn-outline ${userEmotionalState === value ? "btn-active" : ""}`}
              onClick={() => onUserEmotionalStateChange(userEmotionalState === value ? null : value)}
            >
              {USER_EMOTIONAL_STATE_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">¿Cuánto te está afectando esta situación ahora mismo? (opcional)</p>
        <div className="flex gap-2">
          {IMPACT_INTENSITY_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              className={`btn btn-sm btn-outline ${impactIntensity === value ? "btn-active" : ""}`}
              onClick={() => onImpactIntensityChange(impactIntensity === value ? null : value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
