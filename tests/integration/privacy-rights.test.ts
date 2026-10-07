import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET as sessionGET } from "@/app/api/session/route";
import { POST as segmentPOST } from "@/app/api/segment/route";
import { GET as privacySummaryGET } from "@/app/api/privacy/summary/route";
import { POST as deleteAllPOST } from "@/app/api/privacy/delete-all/route";
import { POST as deleteWaitlistPOST } from "@/app/api/privacy/delete-waitlist/route";
import { POST as previewPOST } from "@/app/api/preview/route";
import { POST as pricedIntentPOST } from "@/app/api/priced-intent/route";
import { getExperimentRepository, resetExperimentRepositoryForTests } from "@/libs/db";
import type {
  PrivacyDeleteAllResponse,
  PrivacyDeleteWaitlistResponse,
  PrivacySummaryResponse,
  SegmentResponse,
  SessionResponse,
} from "@/types/api";

import { TestCookieJar } from "./test-cookie-jar";

// Canal minimo de ejercicio de derechos (GET /api/privacy/summary,
// POST /api/privacy/delete-all, POST /api/privacy/delete-waitlist).
// Cubre especificamente la parte nueva -- orquestacion HTTP/cookies --
// no la logica de negocio en si, ya cubierta en
// tests/unit/privacy-service.test.ts.

function buildRequest(path: string, cookies: Record<string, string> = {}, init: { method?: "GET" | "POST"; body?: string } = {}): NextRequest {
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  const headers = new Headers();
  if (init.body) headers.set("content-type", "application/json");
  if (cookieHeader) headers.set("cookie", cookieHeader);

  return new NextRequest(new URL(path, "http://localhost:3000"), { method: init.method, body: init.body, headers });
}

async function startTestAttempt(segment: "A" | "B" = "A") {
  const jar = new TestCookieJar();
  jar.apply(await sessionGET(buildRequest("/api/session", { vega_test: "1" })));

  const segmentResponse = await segmentPOST(
    buildRequest("/api/segment", { vega_test: "1", ...jar.asRecord() }, { method: "POST", body: JSON.stringify({ segment }) })
  );
  jar.apply(segmentResponse);
  const segmentBody = (await segmentResponse.json()) as SegmentResponse;

  return { jar, flowAttemptId: segmentBody.flowAttemptId };
}

// vega_test se reenvia a mano en cada peticion porque las rutas de
// privacidad comparten el mismo gate de suspension que el resto
// (!EXPERIMENT_ACCEPTING_REAL_TRAFFIC && !isTestRequest) -- el jar por
// si solo no la fija salvo que la pasemos explicitamente.
function cookiesFor(jar: TestCookieJar): Record<string, string> {
  return { vega_test: "1", ...jar.asRecord() };
}

describe("canal de ejercicio de derechos", () => {
  beforeEach(() => {
    resetExperimentRepositoryForTests();
  });

  describe("GET /api/privacy/summary", () => {
    it("con sesion valida devuelve el resumen de la sesion actual", async () => {
      const { jar, flowAttemptId } = await startTestAttempt("A");

      const response = await privacySummaryGET(buildRequest("/api/privacy/summary", cookiesFor(jar)));
      expect(response.status).toBe(200);
      const body = (await response.json()) as PrivacySummaryResponse;
      expect(body.flowAttempts.map((a) => a.flowAttemptId)).toContain(flowAttemptId);
    });

    it("sin sesion devuelve 401", async () => {
      const response = await privacySummaryGET(buildRequest("/api/privacy/summary", { vega_test: "1" }));
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/privacy/delete-all", () => {
    it("borra el nucleo y la waitlist en la misma solicitud, antes de invalidar las cookies", async () => {
      const { jar, flowAttemptId } = await startTestAttempt("A");
      const repository = getExperimentRepository();
      await repository.upsertProblemContext({ flowAttemptId, trigger: "career", freeText: "texto", textProvided: true });
      await repository.createWaitlistEntryIfNotExists({
        flowAttemptId,
        email: "persona@example.com",
        consentVersion: "waitlist_consent_v1",
      });

      const response = await deleteAllPOST(buildRequest("/api/privacy/delete-all", cookiesFor(jar), { method: "POST" }));
      expect(response.status).toBe(200);
      const body = (await response.json()) as PrivacyDeleteAllResponse;
      expect(body).toEqual({ ok: true, flowAttemptsAffected: 1, waitlistEntryDeleted: true });

      expect(await repository.getProblemContextByFlowAttempt(flowAttemptId)).toBeNull();
      expect(await repository.getWaitlistEntryByFlowAttempt(flowAttemptId)).toBeNull();
    });

    it("invalida exactamente vega_session, vega_auid y vega_attempt, y no toca vega_test", async () => {
      const { jar } = await startTestAttempt("A");

      const response = await deleteAllPOST(buildRequest("/api/privacy/delete-all", cookiesFor(jar), { method: "POST" }));

      const setCookies = response.cookies.getAll();
      const byName = new Map(setCookies.map((cookie) => [cookie.name, cookie]));

      expect(byName.get("vega_session")?.value).toBe("");
      expect(byName.get("vega_auid")?.value).toBe("");
      expect(byName.get("vega_attempt")?.value).toBe("");
      expect(byName.has("vega_test")).toBe(false);
    });

    it("tras el borrado, GET /api/session con las cookies antiguas no recupera el flow_attempt ni la identidad anteriores", async () => {
      const { jar, flowAttemptId: oldFlowAttemptId } = await startTestAttempt("A");
      const sessionBefore = await sessionGET(buildRequest("/api/session", cookiesFor(jar)));
      const { anonymousUserId: oldAnonymousUserId } = (await sessionBefore.json()) as SessionResponse;

      const deleteResponse = await deleteAllPOST(buildRequest("/api/privacy/delete-all", cookiesFor(jar), { method: "POST" }));
      jar.apply(deleteResponse);

      const sessionAfter = await sessionGET(buildRequest("/api/session", cookiesFor(jar)));
      const afterBody = (await sessionAfter.json()) as SessionResponse;

      expect(afterBody.anonymousUserId).not.toBe(oldAnonymousUserId);
      expect(afterBody.segment).toBeNull();
      expect(afterBody.flowAttemptId).toBeNull();
      expect(afterBody.flowAttemptId).not.toBe(oldFlowAttemptId);
    });

    it("tras el borrado, el antiguo flowAttemptId ya no es accesible: ni genera una preview nueva ni llega al paywall", async () => {
      const { jar, flowAttemptId } = await startTestAttempt("A");
      const repository = getExperimentRepository();

      const deleteResponse = await deleteAllPOST(buildRequest("/api/privacy/delete-all", cookiesFor(jar), { method: "POST" }));
      jar.apply(deleteResponse);

      const previewResponse = await previewPOST(
        buildRequest("/api/preview", cookiesFor(jar), { method: "POST", body: JSON.stringify({ flowAttemptId }) })
      );
      expect(previewResponse.status).toBe(404);
      expect(await repository.getValidPreviewByFlowAttempt(flowAttemptId)).toBeNull();

      const pricedIntentResponse = await pricedIntentPOST(
        buildRequest("/api/priced-intent", cookiesFor(jar), { method: "POST", body: JSON.stringify({ flowAttemptId }) })
      );
      expect(pricedIntentResponse.status).toBe(404);
      expect(await repository.getPricedAccessIntentByFlowAttempt(flowAttemptId)).toBeNull();
    });

    it("no toca experiment_users, flow_attempts ni priced_access_intents", async () => {
      const { jar, flowAttemptId } = await startTestAttempt("A");
      const repository = getExperimentRepository();
      await repository.updateFlowAttemptProgress({ flowAttemptId, currentStep: "preview", trigger: "career" });
      await repository.createPricedAccessIntentIfNotExists({ flowAttemptId, priceMinor: 999, currency: "EUR" });

      await deleteAllPOST(buildRequest("/api/privacy/delete-all", cookiesFor(jar), { method: "POST" }));

      const attempt = await repository.getFlowAttemptById(flowAttemptId);
      expect(attempt?.currentStep).toBe("preview");
      expect(attempt?.trigger).toBe("career");
      expect(await repository.getPricedAccessIntentByFlowAttempt(flowAttemptId)).not.toBeNull();
    });

    it("es idempotente frente a una segunda llamada tras invalidar la sesion (401, no un error de servidor)", async () => {
      const { jar } = await startTestAttempt("A");
      const deleteResponse = await deleteAllPOST(buildRequest("/api/privacy/delete-all", cookiesFor(jar), { method: "POST" }));
      jar.apply(deleteResponse);

      const second = await deleteAllPOST(buildRequest("/api/privacy/delete-all", cookiesFor(jar), { method: "POST" }));
      expect(second.status).toBe(401);
    });
  });

  describe("POST /api/privacy/delete-waitlist", () => {
    it("borra solo la waitlist y NO invalida la sesion", async () => {
      const { jar, flowAttemptId } = await startTestAttempt("A");
      const repository = getExperimentRepository();
      await repository.upsertProblemContext({ flowAttemptId, trigger: "career", freeText: null, textProvided: false });
      await repository.createWaitlistEntryIfNotExists({
        flowAttemptId,
        email: "persona@example.com",
        consentVersion: "waitlist_consent_v1",
      });

      const response = await deleteWaitlistPOST(
        buildRequest("/api/privacy/delete-waitlist", cookiesFor(jar), { method: "POST" })
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as PrivacyDeleteWaitlistResponse;
      expect(body).toEqual({ ok: true, deleted: true });
      expect(response.cookies.getAll()).toHaveLength(0);

      expect(await repository.getWaitlistEntryByFlowAttempt(flowAttemptId)).toBeNull();
      // El resto del nucleo y la sesion siguen intactos.
      expect(await repository.getProblemContextByFlowAttempt(flowAttemptId)).not.toBeNull();
      const summaryResponse = await privacySummaryGET(buildRequest("/api/privacy/summary", cookiesFor(jar)));
      expect(summaryResponse.status).toBe(200);
    });

    it("es idempotente: sin ninguna entrada, devuelve deleted:false con 200", async () => {
      const { jar } = await startTestAttempt("A");

      const response = await deleteWaitlistPOST(
        buildRequest("/api/privacy/delete-waitlist", cookiesFor(jar), { method: "POST" })
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as PrivacyDeleteWaitlistResponse;
      expect(body).toEqual({ ok: true, deleted: false });
    });

    it("sin sesion devuelve 401", async () => {
      const response = await deleteWaitlistPOST(buildRequest("/api/privacy/delete-waitlist", { vega_test: "1" }, { method: "POST" }));
      expect(response.status).toBe(401);
    });
  });

  describe("suspension de trafico real", () => {
    it("las 3 rutas de privacidad devuelven 503 para trafico real (sin ?test=1/vega_test)", async () => {
      const summaryResponse = await privacySummaryGET(buildRequest("/api/privacy/summary"));
      expect(summaryResponse.status).toBe(503);

      const deleteAllResponse = await deleteAllPOST(buildRequest("/api/privacy/delete-all", {}, { method: "POST" }));
      expect(deleteAllResponse.status).toBe(503);

      const deleteWaitlistResponse = await deleteWaitlistPOST(
        buildRequest("/api/privacy/delete-waitlist", {}, { method: "POST" })
      );
      expect(deleteWaitlistResponse.status).toBe(503);
    });
  });
});
