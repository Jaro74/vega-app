import { expect, test, type Page } from "@playwright/test";
import * as zlib from "zlib";

// Seccion 20 (Sprint 1) + "Privacidad" / "Test esencial de privacidad"
// (Sprint 2, Plan Tecnico seccion 52): verificacion explicita de que
// PostHog nunca recibe datos personales. Se intercepta la request real
// que hace posthog-js (nunca llega a internet: Playwright la responde
// localmente) y se inspecciona el payload capturado durante un journey
// completo A y uno B, incluyendo datos propios y de segunda persona.
//
// Requiere NEXT_PUBLIC_POSTHOG_KEY configurada (ver .env.local) para
// que posthog-js se inicialice de verdad; si no hay key, este test no
// tendria eventos que inspeccionar y fallaria por diseño (evita un
// falso verde silencioso).
//
// GATE SPRINT 3B (fix): posthog-js filtra por defecto el trafico de
// automatizacion -- cualquier navegador controlado por Playwright expone
// `navigator.webdriver === true`, y la propia libreria usa esa señal
// (entre otras) para descartar en silencio TODAS las llamadas a
// `.capture()` antes de intentar siquiera la peticion de red (verificado
// empiricamente durante el gate real: solo `/flags/` llegaba a salir,
// nunca `/e/` ni `/i/v0/e/`). Antes de este fix, este test podia pasar
// sin haber inspeccionado nunca un evento real: le bastaba con el
// payload de `/flags/` (inocuo) para satisfacer
// `capturedPayloads.length > 0`.
//
// Fix: `libs/analytics/posthog-client.ts` solo pasa
// `opt_out_useragent_filter: true` a `posthog.init()` cuando lee, en
// tiempo de ejecucion (nunca en build), la clave de localStorage
// `__vega_e2e_posthog_bot_filter_bypass`. Esa clave no la define nada en
// produccion ni en el resto de la suite e2e (localStorage es exclusivo
// de este `page`/origen y no persiste entre tests ni procesos); solo la
// activa este archivo, antes de que la app cargue posthog-js. Ningun
// evento sale nunca hacia el proyecto real de PostHog: la misma ruta que
// descubre el evento real lo responde localmente con `route.fulfill`,
// nunca con `route.continue`.
async function bypassPostHogBotFilterForThisPage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("__vega_e2e_posthog_bot_filter_bypass", "true");
  });
}

// Suspension de trafico real (libs/experiment/constants.ts): mientras
// EXPERIMENT_ACCEPTING_REAL_TRAFFIC este en false, initPostHog() apaga
// PostHog para cualquier trafico, incluido ?test=1 -- sin esto, este
// archivo se quedaria sin ningun evento real que inspeccionar
// (assertRealEventsCaptured fallaria por diseño). El bypass tiene dos
// capas (libs/analytics/posthog-client.ts): esta activa solo la capa de
// runtime (localStorage, exclusiva de esta pagina/test); la capa de
// build time (NEXT_PUBLIC_E2E_POSTHOG_BYPASS_ENABLED) la define
// playwright.config.ts unicamente para el servidor que arranca esta
// suite -- nunca presente en un build de produccion real, y por tanto
// esta clave de localStorage no tiene ningun efecto fuera de esta suite.
async function forcePostHogEnabledDespiteSuspensionForThisPage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("__vega_e2e_force_posthog_enabled", "true");
  });
}

const FORBIDDEN_SUBSTRINGS = [
  "email",
  "birthdate",
  "birthtime",
  "birthplace",
  "placelabel",
  "latitude",
  "longitude",
  "freetext",
  "problemtext",
  "partnerbirth",
  "partnerdata",
  // Sprint 3B: chart_id_b (huella de los datos de la otra persona) y los
  // IDs de evidencia de sinastria (que lo incluyen literalmente) nunca
  // deben viajar a PostHog.
  "chartid",
  "evidenceid",
];

// Excepciones legitimas: flags booleanos del catalogo aprobado que
// colisionan por substring con la lista de arriba sin ser el dato bruto
// (ver libs/analytics/events.ts, SAFE_PROPERTY_EXCEPTIONS).
const SAFE_EXCEPTIONS = ["birthdatevalid", "birthtimeknown", "birthplacevalid", "problemtextprovided"];

interface CapturedRealEvent {
  event: string;
  properties: Record<string, unknown>;
}

// Solo los paths de ingesta de eventos cuentan como evidencia real
// (`/e/` o `/i/v0/e/`, segun la config remota del proyecto). `/flags/`
// (evaluacion de feature flags) y los assets estaticos de
// eu-assets.i.posthog.com nunca se cuentan como evidencia: no llevan
// eventos capturados por la app.
function isCaptureEndpoint(pathname: string): boolean {
  return pathname === "/e/" || pathname === "/e" || pathname === "/i/v0/e/" || pathname === "/i/v0/e";
}

// posthog-js comprime los payloads de captura con gzip por defecto; hay
// que descomprimirlos para poder inspeccionar el evento y sus
// propiedades reales en vez de bytes binarios ilegibles.
function decodeCaptureBody(buf: Buffer): CapturedRealEvent[] {
  let raw: string;
  try {
    raw = zlib.gunzipSync(buf).toString("utf-8");
  } catch {
    raw = buf.toString("utf-8");
  }
  const parsed = JSON.parse(raw) as {
    batch?: { event: string; properties?: Record<string, unknown> }[];
    event?: string;
    properties?: Record<string, unknown>;
  };
  const items = parsed.batch ?? (parsed.event ? [{ event: parsed.event, properties: parsed.properties }] : []);
  return items.map((item) => ({ event: item.event, properties: item.properties ?? {} }));
}

async function collectRealPostHogEvents(page: Page): Promise<CapturedRealEvent[]> {
  await bypassPostHogBotFilterForThisPage(page);
  await forcePostHogEnabledDespiteSuspensionForThisPage(page);

  const events: CapturedRealEvent[] = [];
  await page.route("**://eu.i.posthog.com/**", async (route) => {
    const req = route.request();
    const pathname = new URL(req.url()).pathname;
    if (isCaptureEndpoint(pathname)) {
      const buf = req.postDataBuffer();
      if (buf) {
        try {
          events.push(...decodeCaptureBody(buf));
        } catch {
          // Payload no descifrable: no se cuenta como evidencia real (no
          // se infla `events` con datos que no se pudieron leer).
        }
      }
    }
    // Nunca se deja pasar a la red real (route.continue): ni con el
    // bypass del filtro de bots debe salir trafico de test hacia el
    // proyecto PostHog real.
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  return events;
}

function assertRealEventsCaptured(events: CapturedRealEvent[]) {
  // Falla deliberadamente si no se capturo ningun evento real: evita el
  // falso verde silencioso que tenia la version anterior de este test
  // (satisfecho solo con el payload de /flags/).
  expect(
    events.length,
    "no se capturo ningun evento REAL de PostHog (excluyendo /flags/): revisa el bypass en localStorage (__vega_e2e_posthog_bot_filter_bypass)"
  ).toBeGreaterThan(0);
}

function assertNoForbiddenEventProperties(events: CapturedRealEvent[]) {
  for (const { event, properties } of events) {
    const normalized = JSON.stringify(properties).toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const forbidden of FORBIDDEN_SUBSTRINGS) {
      if (!normalized.includes(forbidden)) continue;
      const isSafe = SAFE_EXCEPTIONS.some((exception) => normalized.includes(exception));
      expect(isSafe, `evento '${event}': propiedades contienen '${forbidden}' sin ser una excepcion segura`).toBe(true);
    }

    // Las propiedades tecnicas que posthog-js añade automaticamente
    // (prefijo "$", ej. $timezone, $current_url) se excluyen de esta
    // comprobacion de fuga de texto libre: son metadata del propio SDK
    // (p.ej. $timezone="Europe/Madrid" es la zona horaria del sistema
    // operativo de quien ejecuta el test, no el lugar de nacimiento
    // introducido en el formulario) y coinciden por casualidad con los
    // literales de prueba sin ser el dato real que este test vigila.
    const customProperties = Object.fromEntries(Object.entries(properties).filter(([key]) => !key.startsWith("$")));
    const customPayload = JSON.stringify(customProperties);
    const customNormalized = customPayload.toLowerCase().replace(/[^a-z0-9]/g, "");
    expect(customNormalized, `evento '${event}'`).not.toContain("1990-05-12".replace(/[^a-z0-9]/gi, ""));
    expect(customNormalized, `evento '${event}'`).not.toContain("madrid");
    expect(customNormalized, `evento '${event}'`).not.toContain("uncontextodeprueba");
    expect(customPayload.toLowerCase(), `evento '${event}'`).not.toContain("vega está teniendo en cuenta");
  }
}

test("PostHog no recibe propiedades personales durante un journey A completo", async ({ page }) => {
  const realEvents = await collectRealPostHogEvents(page);

  // Suspension de trafico real (libs/experiment/constants.ts): se marca
  // como trafico de test para poder completar el recorrido -- el
  // bypass de PostHog de arriba es independiente de esto (ver
  // forcePostHogEnabledDespiteSuspensionForThisPage). Efecto secundario
  // inocuo: los eventos capturados llevan isTest=true en vez de false;
  // ninguna asercion de este archivo depende de ese valor.
  await page.goto("/?test=1");
  await page.goto("/explorar");
  await page.getByRole("button", { name: "Explorar mi situación" }).click();
  await expect(page).toHaveURL(/\/flow/);

  await page.getByRole("button", { name: "Trabajo o carrera" }).click();
  await page.getByRole("textbox").fill("Un contexto de prueba");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: "Añadir mis datos" }).click();
  await page.locator('input[type="date"]').fill("1990-05-12");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator('input[type="time"]').fill("14:35");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("Ciudad de nacimiento").fill("Madrid");
  await page.getByRole("button", { name: "Madrid — Comunidad de Madrid — España", exact: true }).click();
  await page.getByRole("button", { name: "Crear mi primera lectura" }).click();

  // Sprint 3A: segmento A genera la preview automaticamente tras
  // onboarding_complete (Vega/OpenAI mockeados por defecto).
  await expect(page.getByRole("heading", { name: "Tu primera lectura" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar explorando" })).toBeVisible();

  // Sprint 4: continua hasta la waitlist para verificar tambien
  // paywall_view/priced_cta_click/priced_access_intent/waitlist_submit --
  // en particular, que el email introducido nunca viaja a PostHog.
  const testEmail = "privacidad-test@example.com";
  await page.getByRole("button", { name: "Continuar explorando" }).click();
  await page.getByRole("button", { name: "Quiero acceso por 9,99 €" }).click();
  await page.getByRole("button", { name: "Sí, quiero acceso por 9,99 € cuando esté disponible" }).click();
  await page.getByLabel(/Email/).fill(testEmail);
  await page.getByRole("checkbox", { name: /Acepto que Vega guarde mi email/ }).check();
  await page.getByRole("button", { name: "Apuntarme" }).click();
  await expect(page.getByRole("heading", { name: "¡Ya estás en la lista!" })).toBeVisible();
  await page.waitForTimeout(3000);

  assertRealEventsCaptured(realEvents);
  assertNoForbiddenEventProperties(realEvents);

  const eventNames = realEvents.map((event) => event.event);
  expect(eventNames).toContain("paywall_view");
  expect(eventNames).toContain("priced_cta_click");
  expect(eventNames).toContain("priced_access_intent");
  expect(eventNames).toContain("waitlist_submit");

  const fullPayload = JSON.stringify(realEvents).toLowerCase();
  expect(fullPayload).not.toContain(testEmail.toLowerCase());
  expect(fullPayload).not.toContain("privacidad-test");
});

test("PostHog no recibe datos de la segunda persona durante un journey B completo", async ({ page }) => {
  const realEvents = await collectRealPostHogEvents(page);

  await page.goto("/explorar?test=1");
  await page.getByRole("button", { name: "Explorar esta relación" }).click();
  await expect(page).toHaveURL(/\/flow/);

  await page.getByRole("button", { name: "Estamos en una relación" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: "Añadir mis datos" }).click();
  await page.locator('input[type="date"]').fill("1990-05-12");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator('input[type="time"]').fill("14:35");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Ciudad de nacimiento").fill("Madrid");
  await page.getByRole("button", { name: "Madrid — Comunidad de Madrid — España", exact: true }).click();
  await page.getByRole("button", { name: "Crear mi primera lectura" }).click();

  await expect(page.getByRole("heading", { name: "Podemos añadir los datos de la otra persona" })).toBeVisible();
  await page.getByRole("button", { name: "Añadir los datos que conozco" }).click();

  await page.locator('input[type="date"]').fill("1988-03-02");
  await page.getByRole("checkbox", { name: "Conozco su hora de nacimiento" }).check();
  await page.locator('input[type="time"]').fill("09:15");
  await page.getByLabel(/Lugar de nacimiento/).fill("Valencia");
  await page.getByRole("button", { name: "Valencia — Comunidad Valenciana — España", exact: true }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  // Sprint 3B: full/full pasa automaticamente a generar y mostrar la
  // preview relacional (Vega synastry + OpenAI mockeados por defecto).
  await expect(page.getByRole("heading", { name: "Tu primera lectura" })).toBeVisible();
  await page.waitForTimeout(3000);

  assertRealEventsCaptured(realEvents);
  assertNoForbiddenEventProperties(realEvents);
});
