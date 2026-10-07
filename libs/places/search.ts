import { PLACES, type PlaceRecord } from "./dataset";
import type { PlaceSearchResult } from "@/types/api";

const MAX_RESULTS = 10;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function toSearchResult(place: PlaceRecord): PlaceSearchResult {
  return {
    placeId: place.id,
    name: place.name,
    admin1: place.admin1,
    countryCode: place.countryCode,
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

// Orden de resultados (VEGA_Plan_Tecnico, seccion 17): 1) coincidencia
// exacta, 2) poblacion. "Pais esperado" (mencionado en la especificacion
// como segundo criterio) requeriria una señal de localizacion del
// visitante que este MVP no tiene todavia (IP geolocation, etc.); se deja
// fuera deliberadamente para no introducir esa dependencia en Sprint 2.
// El usuario siempre confirma la ciudad correcta entre los resultados
// (ej. "Madrid" devuelve tanto Madrid/España como Madrid/Iowa).
export function searchPlaces(query: string, limit: number = MAX_RESULTS): PlaceSearchResult[] {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 2) return [];

  const matches = PLACES.filter((place) => normalize(place.asciiName).includes(normalizedQuery));

  const ranked = [...matches].sort((a, b) => {
    const aExact = normalize(a.asciiName) === normalizedQuery;
    const bExact = normalize(b.asciiName) === normalizedQuery;
    if (aExact !== bExact) return aExact ? -1 : 1;
    return b.population - a.population;
  });

  return ranked.slice(0, limit).map(toSearchResult);
}

export { getPlaceById } from "./dataset";
export type { PlaceRecord } from "./dataset";
