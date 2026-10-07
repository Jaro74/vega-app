import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getExperimentReadyPromise,
  markExperimentReady,
  resetExperimentReadyForTests,
} from "@/libs/analytics/experiment-ready";

// Cubre las dos ordenes de llegada posibles entre un evento que pregunta
// por el gate y el bootstrap que lo resuelve, mas las garantias de
// "se resuelve como mucho una vez" y "varios pendientes se liberan juntos"
// exigidas antes de implementar (ver conversacion: diseno aprobado con
// un estado explicito pending/ready/blocked, no una promesa creada
// perezosamente).
describe("experiment-ready", () => {
  beforeEach(() => {
    resetExperimentReadyForTests();
  });

  it("evento antes de bootstrap + bootstrap correcto: la promesa pedida primero se resuelve a true", async () => {
    const promise = getExperimentReadyPromise();

    markExperimentReady(true);

    await expect(promise).resolves.toBe(true);
  });

  it("bootstrap correcto antes del evento: getExperimentReadyPromise() ya devuelve true sin esperar", async () => {
    markExperimentReady(true);

    await expect(getExperimentReadyPromise()).resolves.toBe(true);
  });

  it("bootstrap fallido antes del evento: getExperimentReadyPromise() devuelve false", async () => {
    markExperimentReady(false);

    await expect(getExperimentReadyPromise()).resolves.toBe(false);
  });

  it("bootstrap fallido despues del evento: la promesa pedida primero se resuelve a false", async () => {
    const promise = getExperimentReadyPromise();

    markExperimentReady(false);

    await expect(promise).resolves.toBe(false);
  });

  it("varios eventos pendientes se liberan todos, y una sola vez, con una unica markExperimentReady", async () => {
    const promises = [
      getExperimentReadyPromise(),
      getExperimentReadyPromise(),
      getExperimentReadyPromise(),
    ];

    markExperimentReady(true);

    await expect(Promise.all(promises)).resolves.toEqual([true, true, true]);
  });

  it("markExperimentReady() solo tiene efecto la primera vez: llamadas posteriores no cambian el resultado", async () => {
    markExperimentReady(true);
    markExperimentReady(false);

    await expect(getExperimentReadyPromise()).resolves.toBe(true);
  });

  it("markExperimentReady() solo tiene efecto la primera vez, incluso cuando el primer resultado es false", async () => {
    markExperimentReady(false);
    markExperimentReady(true);

    await expect(getExperimentReadyPromise()).resolves.toBe(false);
  });

  it("markExperimentReady() repetido no resuelve dos veces una promesa ya pedida (sin segunda resolucion observable)", async () => {
    const promise = getExperimentReadyPromise();
    const onResolved = vi.fn();
    promise.then(onResolved);

    markExperimentReady(true);
    await promise;
    markExperimentReady(false);
    // Deja pasar un microtask extra: si la segunda llamada reactivara
    // alguna resolucion adicional, onResolved se habria llamado mas de
    // una vez.
    await Promise.resolve();

    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledWith(true);
  });
});
