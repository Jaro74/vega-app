import type { FlowStep, Segment } from "@/types/experiment";

// Deriva en que paso debe continuar el usuario tras un refresh/vuelta,
// a partir del ultimo paso que el backend confirmo como completado
// (VEGA_Plan_Tecnico, seccion 6). FLOW_STEPS es una unica lista lineal
// (types/experiment.ts) porque A y B comparten la mayoria de pasos, pero
// la transicion real SI depende del segmento: A no tiene partner_intro/
// partner_data (termina en "birth_place"), B si los tiene. Por eso esta
// funcion existe en vez de solo avanzar al siguiente indice del array.
export function resolveNextStep(segment: Segment, lastCompletedStep: FlowStep | null): FlowStep {
  if (lastCompletedStep === null) return "problem";

  if (lastCompletedStep === "problem" || lastCompletedStep === "problem_text") {
    return "own_profile_intro";
  }

  if (lastCompletedStep === "birth_place") {
    return segment === "B" ? "partner_intro" : "preview";
  }

  if (lastCompletedStep === "partner_data") {
    return "preview";
  }

  // Sprint 4: "preview" pasa a escribirse de verdad (POST
  // /api/preview/complete, tras "Continuar explorando" sobre una preview
  // valida) y avanza al paywall. "paywall" en si nunca se escribe como
  // currentStep (los sub-pasos offer/confirm son estado de React puro,
  // igual que own_profile_intro/birth_date/birth_time no se escriben
  // nunca): solo es un valor que esta funcion devuelve, exactamente como
  // "preview" ya funcionaba antes de Sprint 4.
  if (lastCompletedStep === "preview") {
    return "paywall";
  }

  if (lastCompletedStep === "access_intent") {
    return "waitlist";
  }

  if (lastCompletedStep === "waitlist") {
    // Terminal: pantalla final "beta". Se devuelve a si mismo, mismo
    // patron que el resto de pasos terminales de este archivo.
    return "waitlist";
  }

  // own_profile_intro, birth_date, birth_time, partner_intro, paywall:
  // pasos sin persistencia propia (los sub-pasos locales de cada Step, o
  // valores que esta funcion solo devuelve pero nunca lee como
  // lastCompletedStep real). No deberian llegar aqui como
  // lastCompletedStep persistido, pero se devuelven identicos para no
  // romper la navegacion si ocurriera.
  return lastCompletedStep;
}

// Sprint 2 termina el onboarding en "birth_place" (segmento A) o
// "partner_data" (segmento B): a partir de ahi el siguiente paso real es
// "preview", que todavia no existe (Sprint 3). Se usa para decidir si
// mostrar la pantalla placeholder de fin de onboarding.
export function isOnboardingComplete(segment: Segment, lastCompletedStep: FlowStep | null): boolean {
  if (lastCompletedStep === null) return false;
  if (segment === "A") return lastCompletedStep === "birth_place";
  return lastCompletedStep === "partner_data";
}
