import { NextResponse, type NextRequest } from "next/server";

import { searchPlaces } from "@/libs/places/search";
import type { PlaceSearchResult } from "@/types/api";

export interface PlacesSearchResponse {
  results: PlaceSearchResult[];
}

// GET /api/places?q=madrid
// Autocomplete de lugar de nacimiento contra el dataset local (VEGA_Plan_Tecnico,
// seccion 16). Nunca llama a un servicio externo de geocoding.
export async function GET(request: NextRequest): Promise<NextResponse<PlacesSearchResponse>> {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const results = searchPlaces(query);
  return NextResponse.json({ results });
}
