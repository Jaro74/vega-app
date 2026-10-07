import { describe, expect, it } from "vitest";

import { getPlaceById, searchPlaces } from "@/libs/places/search";

describe("searchPlaces", () => {
  it("devuelve un array vacio para queries demasiado cortas", () => {
    expect(searchPlaces("m")).toEqual([]);
    expect(searchPlaces("")).toEqual([]);
  });

  it("devuelve un array vacio cuando no hay ninguna coincidencia", () => {
    expect(searchPlaces("xyzxyzxyz")).toEqual([]);
  });

  it("encuentra Madrid (Espana) ignorando mayusculas", () => {
    const results = searchPlaces("MADRID");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toBe("Madrid");
    expect(results[0]?.countryCode).toBe("ES");
  });

  it("desambigua localidades duplicadas: Madrid (Espana, mucha mas poblacion) antes que Madrid (Colombia)", () => {
    // Con el dataset real de GeoNames ya no existe la Madrid, Iowa del
    // ejemplo original del plan tecnico (queda por debajo del umbral de
    // poblacion >= 15000 usado para la cobertura mundial), pero el mismo
    // principio de desambiguacion se demuestra con Madrid (Colombia,
    // area metropolitana de Bogota), que si supera ese umbral.
    const results = searchPlaces("madrid");
    const spain = results.find((r) => r.countryCode === "ES");
    const colombia = results.find((r) => r.countryCode === "CO");
    expect(spain).toBeDefined();
    expect(colombia).toBeDefined();
    expect(results.indexOf(spain!)).toBeLessThan(results.indexOf(colombia!));
  });

  it("localidad espanola fuera del dataset curado original (Ronda, Malaga)", () => {
    const results = searchPlaces("ronda");
    const ronda = results.find((r) => r.countryCode === "ES" && r.name === "Ronda");
    expect(ronda).toBeDefined();
    // Coincidencia exacta primero, aunque existan substrings con mas
    // poblacion (ej. "Coronda", "Gharonda Neemka Bangar").
    expect(results[0]?.name).toBe("Ronda");
  });

  it("otra localidad espanola menor no incluida en el dataset curado original (Aranjuez)", () => {
    const results = searchPlaces("aranjuez");
    expect(results[0]?.name).toBe("Aranjuez");
    expect(results[0]?.countryCode).toBe("ES");
  });

  it("busqueda tolerante a acentos: 'ubeda' encuentra 'Ubeda'", () => {
    const results = searchPlaces("ubeda");
    expect(results[0]?.name).toBe("Úbeda");
    expect(results[0]?.countryCode).toBe("ES");
  });

  it("busqueda tolerante a acentos: 'malaga' encuentra 'Malaga'", () => {
    const results = searchPlaces("malaga");
    expect(results.some((r) => r.name === "Málaga" && r.countryCode === "ES")).toBe(true);
  });

  it("localidad latinoamericana (Buenos Aires, Argentina)", () => {
    const results = searchPlaces("buenos aires");
    expect(results[0]?.name).toBe("Buenos Aires");
    expect(results[0]?.countryCode).toBe("AR");
  });

  it("localidad latinoamericana con tilde en la busqueda ascii (Bogota)", () => {
    const results = searchPlaces("bogota");
    expect(results[0]?.name).toBe("Bogotá");
    expect(results[0]?.countryCode).toBe("CO");
  });

  it("localidad europea no espanola (Paris, Francia) prioriza la coincidencia exacta sobre sus distritos", () => {
    const results = searchPlaces("paris");
    expect(results[0]?.name).toBe("Paris");
    expect(results[0]?.countryCode).toBe("FR");
  });

  it("nombres repetidos entre paises: Leon (Espana) y Leon (Nicaragua) aparecen ambos", () => {
    const results = searchPlaces("leon");
    const countries = results.filter((r) => r.name === "León").map((r) => r.countryCode);
    expect(countries).toContain("ES");
    expect(countries).toContain("NI");
  });

  it("incluye admin1 (region/provincia) para desambiguar, traducido al espanol para Espana", () => {
    const results = searchPlaces("madrid");
    const spain = results.find((r) => r.countryCode === "ES");
    expect(spain?.admin1).toBe("Comunidad de Madrid");
  });

  it("limita el numero de resultados", () => {
    const unlimited = searchPlaces("san", 500);
    expect(unlimited.length).toBeGreaterThan(3);

    const limited = searchPlaces("san", 3);
    expect(limited.length).toBe(3);
  });

  it("nunca devuelve mas resultados que el limite por defecto (10)", () => {
    const results = searchPlaces("santa");
    expect(results.length).toBeLessThanOrEqual(10);
  });
});

describe("getPlaceById", () => {
  it("devuelve el lugar cuando el id existe (Madrid, geonameid real)", () => {
    const place = getPlaceById(3117735);
    expect(place?.name).toBe("Madrid");
    expect(place?.timezoneId).toBe("Europe/Madrid");
  });

  it("devuelve null cuando el id no existe", () => {
    expect(getPlaceById(999999999)).toBeNull();
  });
});
