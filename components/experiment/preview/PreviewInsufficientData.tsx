interface PreviewInsufficientDataProps {
  onEditPartner?: () => void;
}

// Uno de los cuatro estados obligatorios de PreviewStep para el segmento
// B (encargo Sprint 3B, seccion 9): los datos disponibles no permiten
// construir una sinastria fiable (participante "minimal", o menos de 2
// evidencias robustas). Nunca se presenta como un fallo de OpenAI ni se
// muestra una preview generica basada solo en las dos cartas natales por
// separado (VEGA_Fase_4C, bloque E "Nivel no viable").
export default function PreviewInsufficientData({ onEditPartner }: PreviewInsufficientDataProps) {
  return (
    <div className="flex flex-col gap-4 items-center text-center max-w-md">
      <h2 className="text-xl font-bold">Necesitamos algo más de información</h2>
      <p className="opacity-70">
        Con los datos disponibles no podemos construir una comparación suficientemente fiable entre las dos
        cartas. Si añades el lugar o la hora de nacimiento de la otra persona, podremos intentarlo de nuevo sin
        perder lo que ya nos has contado.
      </p>
      {onEditPartner && (
        <button type="button" className="btn btn-primary" onClick={onEditPartner}>
          Volver y añadir más información
        </button>
      )}
    </div>
  );
}
