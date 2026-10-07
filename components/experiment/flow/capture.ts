import type { ImplementedEventName } from "@/libs/experiment/constants";
import type { Sprint1EventProperties } from "@/libs/analytics/events";

// Firma compartida por todos los pasos del flow: cada paso solo aporta
// las propiedades especificas de su evento (trigger, partnerPrecision,
// etc.); las propiedades comunes (anonymousUserId, adquisicion...) las
// resuelve una sola vez app/flow/page.tsx (ver buildBaseEventProps),
// para no repetir ese boilerplate en cada componente de paso.
export type CaptureEventFn = (
  eventName: ImplementedEventName,
  extra?: Partial<Sprint1EventProperties>
) => void;
