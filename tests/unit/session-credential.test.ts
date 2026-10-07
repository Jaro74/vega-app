import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveTrustedAnonymousUserId,
  signSessionCredential,
  verifySessionCredential,
} from "@/libs/experiment/session-credential";

const ANONYMOUS_USER_ID = "11111111-1111-4111-8111-111111111111";

function buildRequestWithSessionCookie(value: string | null): NextRequest {
  const headers = new Headers();
  if (value !== null) headers.set("cookie", `vega_session=${value}`);
  return new NextRequest(new URL("/api/session", "http://localhost:3000"), { headers });
}

// Cambia el primer caracter de una cadena base64url por otro valido y
// distinto, preservando la longitud -- para que un test de "firma
// alterada" falle por la firma en si, no por una discrepancia de
// longitud/formato que el guard ya rechazaria por otro motivo.
function flipFirstChar(value: string): string {
  const first = value.at(0)!;
  const replacement = first === "A" ? "B" : "A";
  return `${replacement}${value.slice(1)}`;
}

describe("session-credential", () => {
  const originalSecret = process.env.EXPERIMENT_SESSION_SECRET;

  beforeEach(() => {
    process.env.EXPERIMENT_SESSION_SECRET = "test-secret-solo-para-unit-tests";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.EXPERIMENT_SESSION_SECRET;
    } else {
      process.env.EXPERIMENT_SESSION_SECRET = originalSecret;
    }
    vi.useRealTimers();
  });

  it("sign + verify con el mismo anonymousUserId hacen round-trip correcto", () => {
    const token = signSessionCredential(ANONYMOUS_USER_ID);
    const credential = verifySessionCredential(token);
    expect(credential).toEqual({ anonymousUserId: ANONYMOUS_USER_ID });
  });

  it("rechaza un token con la firma alterada (mismo formato, un caracter distinto)", () => {
    const token = signSessionCredential(ANONYMOUS_USER_ID);
    const [userId, issuedAt, signature] = token.split(".") as [string, string, string];
    const tampered = `${userId}.${issuedAt}.${flipFirstChar(signature)}`;
    expect(verifySessionCredential(tampered)).toBeNull();
  });

  it("rechaza un token con el anonymousUserId del payload alterado pero la firma original intacta", () => {
    const token = signSessionCredential(ANONYMOUS_USER_ID);
    const [, issuedAt, signature] = token.split(".") as [string, string, string];
    const tampered = `otro-usuario-distinto.${issuedAt}.${signature}`;
    expect(verifySessionCredential(tampered)).toBeNull();
  });

  it("rechaza un token con formato invalido (numero de partes incorrecto)", () => {
    expect(verifySessionCredential("solo-dos.partes")).toBeNull();
    expect(verifySessionCredential("demasiadas.partes.aqui.si")).toBeNull();
  });

  it("rechaza un token con issuedAt no numerico o no entero positivo", () => {
    const token = signSessionCredential(ANONYMOUS_USER_ID);
    const [userId, , signature] = token.split(".") as [string, string, string];
    expect(verifySessionCredential(`${userId}.no-es-un-numero.${signature}`)).toBeNull();
    expect(verifySessionCredential(`${userId}.-100.${signature}`)).toBeNull();
    expect(verifySessionCredential(`${userId}.12.5.${signature}`)).toBeNull();
    expect(verifySessionCredential(`${userId}.0.${signature}`)).toBeNull();
  });

  it("rechaza un token expirado (issuedAt de hace mas de 90 dias, firmado correctamente)", () => {
    const ninetyOneDaysAgo = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 91;
    vi.useFakeTimers();
    vi.setSystemTime(ninetyOneDaysAgo * 1000);
    const oldToken = signSessionCredential(ANONYMOUS_USER_ID);
    vi.useRealTimers();

    expect(verifySessionCredential(oldToken)).toBeNull();
  });

  it("rechaza un token con issuedAt en el futuro mas alla del margen de desfase de reloj", () => {
    const oneHourInTheFuture = Math.floor(Date.now() / 1000) + 60 * 60;
    vi.useFakeTimers();
    vi.setSystemTime(oneHourInTheFuture * 1000);
    const futureToken = signSessionCredential(ANONYMOUS_USER_ID);
    vi.useRealTimers();

    expect(verifySessionCredential(futureToken)).toBeNull();
  });

  it("acepta un issuedAt ligeramente en el futuro dentro del margen de desfase de reloj", () => {
    const thirtySecondsInTheFuture = Math.floor(Date.now() / 1000) + 30;
    vi.useFakeTimers();
    vi.setSystemTime(thirtySecondsInTheFuture * 1000);
    const nearFutureToken = signSessionCredential(ANONYMOUS_USER_ID);
    vi.useRealTimers();

    expect(verifySessionCredential(nearFutureToken)).toEqual({ anonymousUserId: ANONYMOUS_USER_ID });
  });

  it("lanza si EXPERIMENT_SESSION_SECRET no esta configurado", () => {
    delete process.env.EXPERIMENT_SESSION_SECRET;
    expect(() => signSessionCredential(ANONYMOUS_USER_ID)).toThrow();
    expect(() => verifySessionCredential("a.1.b")).toThrow();
  });

  describe("resolveTrustedAnonymousUserId", () => {
    it("devuelve null si no hay cookie vega_session", () => {
      expect(resolveTrustedAnonymousUserId(buildRequestWithSessionCookie(null))).toBeNull();
    });

    it("devuelve null si la cookie vega_session es invalida", () => {
      expect(resolveTrustedAnonymousUserId(buildRequestWithSessionCookie("invalida"))).toBeNull();
    });

    it("devuelve el anonymousUserId verificado si la cookie vega_session es valida", () => {
      const token = signSessionCredential(ANONYMOUS_USER_ID);
      expect(resolveTrustedAnonymousUserId(buildRequestWithSessionCookie(token))).toBe(ANONYMOUS_USER_ID);
    });
  });
});
