"use client";

// session_id: UUID por sesion de navegador, solo en sessionStorage
// (nunca cookie, nunca Supabase) — VEGA_Plan_Tecnico, seccion 4.
const SESSION_ID_KEY = "vega_session_id";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_ID_KEY, created);
  return created;
}
