import type { NextResponse } from "next/server";

// Acumula las cookies de cada respuesta y las reenvia en la siguiente
// peticion, igual que ya hace un navegador real. Sin esto, cualquier test
// que encadene varias llamadas HTTP a mano (GET /api/session -> POST
// /api/segment -> refresh...) puede "olvidar" reenviar una cookie nueva
// (p. ej. vega_session, la credencial httpOnly del guard de pertenencia
// de flowAttemptId) sin que el error sea obvio -- exactamente el defecto
// que motivo introducir este helper.
export class TestCookieJar {
  private cookies: Record<string, string> = {};

  apply(response: NextResponse): void {
    for (const cookie of response.cookies.getAll()) {
      this.cookies[cookie.name] = cookie.value;
    }
  }

  asRecord(): Record<string, string> {
    return { ...this.cookies };
  }

  // Acceso a una cookie concreta con tipo string (no string | undefined):
  // bajo noUncheckedIndexedAccess, leer una propiedad de asRecord()
  // directamente (jar.asRecord().vega_auid) siempre tipa string | undefined.
  // Lanza si falta -- en un test eso es un fallo real del propio test
  // (se esperaba que esa cookie ya estuviera fijada en este punto), no
  // un caso a manejar en silencio.
  get(name: string): string {
    const value = this.cookies[name];
    if (value === undefined) throw new Error(`TestCookieJar: falta la cookie "${name}"`);
    return value;
  }
}
