import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

import { readSessionCredential } from "./cookies";

// Credencial de sesion httpOnly (guard de pertenencia de flowAttemptId):
// vega_session = "<anonymousUserId>.<issuedAtUnixSeconds>.<firmaBase64url>".
// vega_auid (no httpOnly) sigue existiendo para PostHog, pero deja de ser
// una entrada de confianza para el servidor -- la unica forma de que este
// reconozca una identidad ya existente es esta firma HMAC-SHA256.

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

// Tolerancia de desfase de reloj: un issuedAt ligeramente en el futuro
// (reloj del servidor que emitio el token adelantado respecto al que lo
// verifica, en un despliegue con varias instancias) no debe rechazarse
// de golpe, pero un issuedAt muy en el futuro si -- nunca deberia darse
// con un token realmente emitido por este mismo servicio.
const CLOCK_SKEW_TOLERANCE_SECONDS = 60;

// Solo digitos: rechaza signos, decimales, notacion exponencial y
// espacios antes de intentar convertir a numero.
const ISSUED_AT_PATTERN = /^\d+$/;

function getSessionSecret(): string {
  const secret = process.env.EXPERIMENT_SESSION_SECRET;
  if (!secret) throw new Error("EXPERIMENT_SESSION_SECRET no configurado");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function signSessionCredential(anonymousUserId: string): string {
  const payload = `${anonymousUserId}.${Math.floor(Date.now() / 1000)}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionCredential(token: string): { anonymousUserId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [anonymousUserId, issuedAtRaw, signature] = parts;
  if (!anonymousUserId || !issuedAtRaw || !signature || !ISSUED_AT_PATTERN.test(issuedAtRaw)) return null;

  const issuedAt = Number(issuedAtRaw);
  if (!Number.isSafeInteger(issuedAt) || issuedAt <= 0) return null;

  const payload = `${anonymousUserId}.${issuedAtRaw}`;
  const expectedSignature = sign(payload);

  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  const now = Math.floor(Date.now() / 1000);
  if (issuedAt > now + CLOCK_SKEW_TOLERANCE_SECONDS) return null; // fecha de emision futura
  if (now - issuedAt > SESSION_MAX_AGE_SECONDS) return null; // expirado

  return { anonymousUserId };
}

// Unico punto de entrada que las rutas usan para decidir identidad. Nunca
// lee vega_auid: si no hay una vega_session valida, devuelve null (el
// mismo valor que bootstrapSession ya acepta para minar una identidad
// nueva), en vez de confiar en cualquier anonymousUserId presentado sin
// firma verificable.
export function resolveTrustedAnonymousUserId(request: NextRequest): string | null {
  const token = readSessionCredential(request);
  if (!token) return null;
  return verifySessionCredential(token)?.anonymousUserId ?? null;
}
