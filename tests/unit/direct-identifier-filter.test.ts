import { describe, expect, it } from "vitest";

import { checkDirectIdentifiers } from "@/libs/experiment/direct-identifier-filter";

describe("checkDirectIdentifiers", () => {
  // Contexto humano normal (politica de producto 2026-10-10): nunca debe
  // bloquearse por salud, orientacion/vida sexual, religion, origen,
  // afiliacion sindical, nombres de pila ni referencias relacionales.
  it.each([
    "Mi hijo Daniel lo está pasando mal en el colegio porque es homosexual.",
    "Mi pareja tiene depresión y está en tratamiento psicológico.",
    "Mi madre está enferma y esto me está afectando.",
    "Mi ex tiene unas creencias religiosas muy distintas de las mías.",
  ])("no bloquea contexto humano normal: %s", (text) => {
    const result = checkDirectIdentifiers(text);
    expect(result.blocked).toBe(false);
    expect(result.matchedIdentifierTypes).toEqual([]);
  });

  it("bloquea un email", () => {
    const result = checkDirectIdentifiers("Puedes escribirme a persona.ejemplo@correo.com si quieres");
    expect(result.blocked).toBe(true);
    expect(result.matchedIdentifierTypes).toContain("email");
  });

  it("bloquea un telefono espanol", () => {
    const result = checkDirectIdentifiers("Llámame al 612 345 678 cuando puedas");
    expect(result.blocked).toBe(true);
    expect(result.matchedIdentifierTypes).toContain("phone");
  });

  it("bloquea un DNI", () => {
    const result = checkDirectIdentifiers("Mi DNI es 12345678Z por si lo necesitas");
    expect(result.blocked).toBe(true);
    expect(result.matchedIdentifierTypes).toContain("dni");
  });

  it("bloquea un NIE", () => {
    const result = checkDirectIdentifiers("Mi NIE es X1234567L por si lo necesitas");
    expect(result.blocked).toBe(true);
    expect(result.matchedIdentifierTypes).toContain("nie");
  });

  it("no bloquea un texto sin ningun identificador directo", () => {
    const result = checkDirectIdentifiers("Últimamente siento que nada me motiva en el trabajo");
    expect(result.blocked).toBe(false);
    expect(result.matchedIdentifierTypes).toEqual([]);
  });

  // Revision explicita de falsos positivos del regex de telefono con
  // numeros normales de una conversacion (edad, año, cantidad de
  // dinero, duracion): ninguno de estos tiene 9 digitos contiguos.
  it.each([
    "Tengo 28 años y llevo 6 trabajando aquí",
    "Nací en 1990 y viví 15 años en Madrid",
    "Me costó 1234567 euros el tratamiento",
    "Llevamos 10 años casados y tenemos 3 hijos",
    "Hemos discutido esto unas 40 veces este mes",
  ])("no bloquea numeros normales de conversacion: %s", (text) => {
    const result = checkDirectIdentifiers(text);
    expect(result.blocked).toBe(false);
    expect(result.matchedIdentifierTypes).toEqual([]);
  });

  it("nunca devuelve el fragmento de texto original, solo los tipos detectados", () => {
    const result = checkDirectIdentifiers("Escribeme a alguien@ejemplo.com");
    expect(result).not.toHaveProperty("text");
    expect(result.matchedIdentifierTypes.every((type) => typeof type === "string")).toBe(true);
  });
});
