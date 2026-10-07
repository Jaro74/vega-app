"use client";

import { useEffect, useRef, useState } from "react";

import { getCountryName } from "@/libs/places/countries";
import type { PlaceSearchResult } from "@/types/api";
import type { PlacesSearchResponse } from "@/app/api/places/route";

interface PlaceAutocompleteProps {
  label: string;
  selectedPlace: PlaceSearchResult | null;
  onSelect: (place: PlaceSearchResult) => void;
}

function formatPlaceLabel(place: PlaceSearchResult): string {
  const parts = [place.name, place.admin1, getCountryName(place.countryCode)].filter(
    (part): part is string => Boolean(part)
  );
  return parts.join(" — ");
}

// Autocomplete de lugar de nacimiento contra GET /api/places (dataset
// local, VEGA_Plan_Tecnico seccion 16-17). El usuario siempre confirma
// explicitamente una opcion de la lista: nunca se asume la primera
// coincidencia.
export default function PlaceAutocomplete({ label, selectedPlace, onSelect }: PlaceAutocompleteProps) {
  const [query, setQuery] = useState(selectedPlace ? formatPlaceLabel(selectedPlace) : "");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selectedPlace && query === formatPlaceLabel(selectedPlace)) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (query.trim().length < 2) {
      setResults([]);
      setNotFound(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/places?q=${encodeURIComponent(query)}`)
        .then((response) => (response.ok ? (response.json() as Promise<PlacesSearchResponse>) : null))
        .then((data) => {
          const found = data?.results ?? [];
          setResults(found);
          setNotFound(found.length === 0);
          setIsOpen(true);
        })
        .catch(() => {
          setResults([]);
          setNotFound(true);
        });
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="form-control w-full relative">
      <label className="label" htmlFor="place-autocomplete">
        <span className="label-text">{label}</span>
      </label>
      <input
        id="place-autocomplete"
        type="text"
        className="input input-bordered w-full"
        placeholder="Ciudad y país"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        autoComplete="off"
      />

      {isOpen && results.length > 0 && (
        <ul className="menu bg-base-100 shadow-lg rounded-box absolute top-full left-0 right-0 z-10 mt-1 max-h-64 overflow-y-auto">
          {results.map((place) => (
            <li key={place.placeId}>
              <button
                type="button"
                onClick={() => {
                  onSelect(place);
                  setQuery(formatPlaceLabel(place));
                  setIsOpen(false);
                }}
              >
                {formatPlaceLabel(place)}
              </button>
            </li>
          ))}
        </ul>
      )}

      {notFound && query.trim().length >= 2 && (
        <p className="text-sm opacity-70 mt-1">
          No encontramos esa ciudad en nuestro buscador. Prueba con el nombre en español o una ciudad
          cercana más grande.
        </p>
      )}
    </div>
  );
}
