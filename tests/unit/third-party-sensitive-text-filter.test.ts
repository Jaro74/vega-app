import { describe, expect, it } from "vitest";

import { checkThirdPartySensitiveText } from "@/libs/experiment/third-party-sensitive-text-filter";

describe("checkThirdPartySensitiveText", () => {
  it("no bloquea un termino de categoria especial sin marcador de tercera persona", () => {
    const result = checkThirdPartySensitiveText("Tengo depresion desde hace meses y no se como salir de esto");
    expect(result.blocked).toBe(false);
    expect(result.matchedCategories).toEqual([]);
  });

  it("no bloquea un marcador de tercera persona sin ningun termino de categoria especial", () => {
    const result = checkThirdPartySensitiveText("Mi pareja y yo discutimos mucho ultimamente por el trabajo");
    expect(result.blocked).toBe(false);
  });

  it("bloquea cuando coexisten un marcador de tercera persona y un termino de categoria especial", () => {
    const result = checkThirdPartySensitiveText("Mi pareja tiene depresion y no sabe como contarselo a su familia");
    expect(result.blocked).toBe(true);
    expect(result.matchedCategories).toContain("salud");
  });

  it("detecta categorias distintas: religion y orientacion sexual", () => {
    expect(checkThirdPartySensitiveText("mi hermano es musulman y lo oculta").blocked).toBe(true);
    expect(checkThirdPartySensitiveText("mi amigo es homosexual y no lo sabe nadie").blocked).toBe(true);
  });

  it("es insensible a mayusculas y acentos", () => {
    const result = checkThirdPartySensitiveText("MI PAREJA TIENE DEPRESIÓN");
    expect(result.blocked).toBe(true);
  });

  it("nunca devuelve el fragmento de texto original, solo las categorias", () => {
    const result = checkThirdPartySensitiveText("mi pareja tiene depresion");
    expect(result).not.toHaveProperty("text");
    expect(result.matchedCategories.every((category) => typeof category === "string")).toBe(true);
  });
});
