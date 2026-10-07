import citiesData from "@/data/places/cities.json";

// Catalogo local de ciudades (VEGA_Plan_Tecnico, secciones 15-17). Sprint
// 2 usa un dataset curado en vez de un servicio externo de geocoding
// (Mapbox, etc.): el experimento solo necesita "ciudad de nacimiento",
// no un buscador de direcciones. El dataset es deliberadamente un
// subconjunto (Espana completa + capitales/ciudades principales de
// Latinoamerica y otros paises frecuentes) y no el catalogo completo de
// GeoNames; ampliarlo es un simple reemplazo de data/places/cities.json,
// sin tocar el codigo que lo consume.
export interface PlaceRecord {
  id: number;
  name: string;
  asciiName: string;
  admin1: string | null;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezoneId: string;
  population: number;
}

export const PLACES: readonly PlaceRecord[] = citiesData as PlaceRecord[];

const placesById = new Map<number, PlaceRecord>(PLACES.map((place) => [place.id, place]));

export function getPlaceById(placeId: number): PlaceRecord | null {
  return placesById.get(placeId) ?? null;
}
