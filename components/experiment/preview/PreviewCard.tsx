import type { PreviewV1Output } from "@/types/preview";

interface PreviewCardProps {
  preview: PreviewV1Output;
  onContinue: () => void;
  // Sprint 4: "Continuar explorando" ahora espera la confirmacion de
  // POST /api/preview/complete antes de navegar al paywall (checkpoint de
  // flujo, no analytics -- ver PreviewStep). continuing deshabilita el
  // boton mientras esa llamada esta en curso, para evitar doble clic.
  continuing?: boolean;
}

// Renderiza preview_v1 siguiendo el schema obligatorio (VEGA_Fase_4C,
// bloque G): insight principal, exactamente dos evidencias ("Vega esta
// teniendo en cuenta:"), interpretacion contextual, limitacion y
// pregunta abierta. Componente puro: toda la validacion ya ocurrio en el
// backend (preview-service.ts) antes de que esto se renderice.
export default function PreviewCard({ preview, onContinue, continuing = false }: PreviewCardProps) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-xl">
      <p className="text-lg leading-relaxed">{preview.mainInsight}</p>

      <div className="flex flex-col gap-2">
        <p className="font-semibold">Vega está teniendo en cuenta:</p>
        <ol className="list-decimal list-inside flex flex-col gap-1 opacity-90">
          {preview.evidence.map((item) => (
            <li key={item.id}>{item.label}</li>
          ))}
        </ol>
      </div>

      <p className="leading-relaxed">{preview.contextualInterpretation}</p>

      <p className="text-sm opacity-70 italic">{preview.limitation}</p>

      <p className="font-medium">{preview.openQuestion}</p>

      <button type="button" className="btn btn-primary" onClick={onContinue} disabled={continuing}>
        {continuing ? "Continuando..." : "Continuar explorando"}
      </button>
    </div>
  );
}
