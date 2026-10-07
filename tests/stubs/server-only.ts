// Stub de test para el paquete "server-only". Fuera de Next.js (en
// Vitest, sin el bundler de Next) el paquete real siempre lanza, porque
// su comportamiento depende del alias que Next aplica en build para
// distinguir compilaciones cliente/servidor. Este stub lo sustituye en
// tests (ver vitest.config.mts) sin cambiar el comportamiento real en
// la app, donde "server-only" se resuelve normalmente.
export {};
