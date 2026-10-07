"use client";

import posthog from "posthog-js";

import { EXPERIMENT_ACCEPTING_REAL_TRAFFIC } from "@/libs/experiment/constants";

let initialized = false;

const E2E_BOT_FILTER_BYPASS_KEY = "__vega_e2e_posthog_bot_filter_bypass";

// Solo verdadero cuando tests/e2e/privacy.spec.ts lo activa explicitamente
// (localStorage no persiste entre procesos/dispositivos ni llega nunca a
// produccion). Cualquier otro contexto -- produccion, npm run dev, y el
// resto de la suite e2e que no lo activa -- lee false aqui.
function readE2EBotFilterBypassFlag(): boolean {
  try {
    return window.localStorage.getItem(E2E_BOT_FILTER_BYPASS_KEY) === "true";
  } catch {
    return false;
  }
}

const E2E_FORCE_POSTHOG_ENABLED_KEY = "__vega_e2e_force_posthog_enabled";

// Bypass de dos capas, exclusivo de tests/e2e/privacy.spec.ts, para poder
// seguir inspeccionando eventos reales de PostHog mientras
// EXPERIMENT_ACCEPTING_REAL_TRAFFIC este en false (ver mas abajo).
//
// Capa 1 (build time): NEXT_PUBLIC_E2E_POSTHOG_BYPASS_ENABLED solo la
// define playwright.config.ts para el servidor que arranca su propia
// suite E2E. Next.js la inlinea como literal en el bundle compilado -- un
// build de produccion normal (sin esa variable en build time) nunca
// contiene este bypass: no es "falso en runtime", el minificador puede
// eliminar la rama entera porque la condicion ya es `false` en el codigo
// compilado. Nadie puede reactivarla despues manipulando localStorage.
//
// Capa 2 (runtime): la clave de localStorage, igual que
// E2E_BOT_FILTER_BYPASS_KEY arriba, que solo activa privacy.spec.ts.
//
// Ambas capas deben ser verdaderas a la vez; cualquier otro contexto
// (produccion, npm run dev, el resto de la suite e2e) falla al menos una.
function readE2EForcePostHogEnabledFlag(): boolean {
  if (process.env.NEXT_PUBLIC_E2E_POSTHOG_BYPASS_ENABLED !== "1") return false;
  try {
    return window.localStorage.getItem(E2E_FORCE_POSTHOG_ENABLED_KEY) === "true";
  } catch {
    return false;
  }
}

// Sin NEXT_PUBLIC_POSTHOG_KEY (no hay proyecto PostHog conectado en este
// sandbox) esta funcion devuelve null y captureExperimentEvent() se
// convierte en un no-op seguro: un fallo/ausencia de analytics nunca
// debe bloquear el experimento (VEGA_Plan_Tecnico, principio 5).
export function initPostHog(): typeof posthog | null {
  if (typeof window === "undefined") return null;

  // Suspension de trafico real (libs/experiment/constants.ts): PostHog
  // queda completamente apagado mientras el flag este en false, para
  // CUALQUIER trafico (real o ?test=1/vega_test) -- sin excepcion salvo
  // el bypass de privacy.spec.ts descrito arriba.
  if (!EXPERIMENT_ACCEPTING_REAL_TRAFFIC && !readE2EForcePostHogEnabledFlag()) return null;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  if (!initialized) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
      // Sprint 1 solo dispara eventos explicitos del catalogo congelado:
      // sin autocapture, sin pageview automatico, sin session replay.
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      persistence: "memory",
      // Senal de runtime (no de build), leida una sola vez aqui: por
      // defecto ausente, asi que posthog-js mantiene su filtro de
      // trafico de automatizacion activo (comportamiento real de
      // usuarios sin cambios, en produccion y en el resto de la suite
      // e2e). Solo tests/e2e/privacy.spec.ts la activa explicitamente
      // (via page.addInitScript, antes de navegar) para poder
      // inspeccionar eventos reales sin que el propio Chromium
      // controlado por Playwright (navigator.webdriver=true) los
      // descarte en silencio antes de intentar la peticion de red.
      // Ningun evento de ese test sale nunca hacia el proyecto PostHog
      // real: privacy.spec.ts intercepta y responde localmente esa
      // peticion (route.fulfill, nunca route.continue).
      opt_out_useragent_filter: readE2EBotFilterBypassFlag(),
    });
    initialized = true;
  }

  return posthog;
}
