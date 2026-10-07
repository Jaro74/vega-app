"use client";

// Gate central que evita la condicion de carrera entre
// ExperimentBootstrap (identify() asincrono) y cualquier evento que
// capture-experiment-event.ts quiera enviar antes de que ese identify()
// haya terminado -- sin crear ningun mapping adicional de distinct_id y
// sin almacenar ningun identificador ni dato personal: el unico estado
// que vive aqui es un string de tres valores.
//
// Estado explicito (no una promesa creada perezosamente) para que el
// resultado sea el mismo sin importar el orden de llegada:
// - un evento puede llamar a getExperimentReadyPromise() antes de que el
//   bootstrap termine (se encola, agrupado en una unica promesa
//   compartida);
// - o el bootstrap puede llamar a markExperimentReady() antes de que
//   ningun evento haya preguntado nunca (el estado ya queda fijado, y la
//   siguiente llamada a getExperimentReadyPromise() lo lee directamente,
//   sin crear ni depender de una promesa que nadie resolveria).
type ExperimentReadyState = "pending" | "ready" | "blocked";

let state: ExperimentReadyState = "pending";
let resolveFn: ((ready: boolean) => void) | null = null;
let readyPromise: Promise<boolean> | null = null;

export function getExperimentReadyPromise(): Promise<boolean> {
  if (state === "ready") return Promise.resolve(true);
  if (state === "blocked") return Promise.resolve(false);

  // state === "pending": varias llamadas mientras sigue pendiente
  // comparten la MISMA promesa, asi que una unica resolucion libera a
  // todas a la vez.
  if (!readyPromise) {
    readyPromise = new Promise<boolean>((resolve) => {
      resolveFn = resolve;
    });
  }
  return readyPromise;
}

// Resuelve el estado como mucho una vez: la primera llamada decide
// "ready" o "blocked" para el resto de la carga de pagina; cualquier
// llamada posterior se ignora sin lanzar error.
export function markExperimentReady(ready: boolean): void {
  if (state !== "pending") return;
  state = ready ? "ready" : "blocked";

  // Solo existe resolveFn si alguien llamo a getExperimentReadyPromise()
  // ANTES de este punto. Si nadie preguntó todavia, no hay nada que
  // resolver aqui: la siguiente llamada usara el atajo de `state` de
  // arriba, sin pasar nunca por una promesa sin resolver.
  if (resolveFn) {
    resolveFn(ready);
    resolveFn = null;
  }
}

// Solo para tests: vuelve al estado inicial entre casos independientes,
// igual que resetExperimentRepositoryForTests() en libs/db/index.ts.
export function resetExperimentReadyForTests(): void {
  state = "pending";
  resolveFn = null;
  readyPromise = null;
}
