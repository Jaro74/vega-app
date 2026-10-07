#!/usr/bin/env node
// Script reproducible de preparacion del dataset local de lugares
// (VEGA Sprint 2, "Lugar de nacimiento - resolver cobertura"). Genera
// data/places/cities.json a partir de volcados oficiales de GeoNames
// (https://www.geonames.org/, licencia CC BY 4.0):
//
//   - cities15000.txt  -> https://download.geonames.org/export/dump/cities15000.zip
//     Todas las ciudades del mundo con poblacion >= 15000 (cobertura
//     internacional amplia).
//   - ES.txt           -> https://download.geonames.org/export/dump/ES.zip
//     Volcado completo de Espana (todas las entidades geograficas);
//     aqui se filtra a "populated place" (feature class P) con
//     poblacion >= 500, para ampliar la cobertura espanola mas alla de
//     las grandes ciudades ya incluidas en cities15000 sin arrastrar
//     accidentes geograficos, aldeas minusculas ni duplicados.
//   - admin1CodesASCII.txt -> https://download.geonames.org/export/dump/admin1CodesASCII.txt
//     Nombres de region/provincia (admin1) para desambiguar localidades
//     con el mismo nombre (VEGA_Plan_Tecnico, seccion 17).
//
// Uso:
//   1. Descargar y descomprimir los 3 recursos anteriores en un mismo
//      directorio (por defecto scripts/places/raw/, no versionado).
//   2. node scripts/places/build-dataset.mjs [directorio_raw]
//
// El resultado se escribe en data/places/cities.json. Los nombres de
// pais en espanol viven aparte, en libs/places/countries.ts (GeoNames
// solo trae nombres en ingles), y deben ampliarse a mano si aparece un
// countryCode nuevo tras regenerar el dataset.
//
// Deliberadamente no se descarga ni descomprime nada automaticamente
// (evita anadir una dependencia nueva solo para leer .zip): el operador
// descarga los 3 ficheros y los descomprime con cualquier herramienta
// estandar antes de ejecutar este script.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rawDir = resolve(__dirname, process.argv[2] ?? "raw");
const outputPath = resolve(__dirname, "../../data/places/cities.json");

const SPAIN_MIN_POPULATION = 500;

// GeoNames solo trae nombres de admin1 en ingles. Para Espana (mercado
// principal del experimento, ver VEGA_Fase_4C seccion Y "Meta Ads") se
// traducen a los nombres oficiales en espanol de las 19 comunidades/
// ciudades autonomas; el resto de paises mantiene el nombre de
// admin1CodesASCII.txt tal cual (traducirlos todos no aporta valor
// suficiente para el experimento).
const SPAIN_ADMIN1_ES = {
  Andalusia: "Andalucía",
  Aragon: "Aragón",
  Asturias: "Asturias",
  "Balearic Islands": "Islas Baleares",
  "Basque Country": "País Vasco",
  "Canary Islands": "Canarias",
  Cantabria: "Cantabria",
  "Castille and León": "Castilla y León",
  "Castille-La Mancha": "Castilla-La Mancha",
  Catalonia: "Cataluña",
  Ceuta: "Ceuta",
  Extremadura: "Extremadura",
  Galicia: "Galicia",
  "La Rioja": "La Rioja",
  Madrid: "Comunidad de Madrid",
  Melilla: "Melilla",
  Murcia: "Región de Murcia",
  Navarre: "Navarra",
  Valencia: "Comunidad Valenciana",
};

function requireFile(name) {
  const path = resolve(rawDir, name);
  if (!existsSync(path)) {
    throw new Error(
      `Falta ${name} en ${rawDir}. Descarga y descomprime los volcados de GeoNames ` +
        "indicados en la cabecera de este script antes de continuar."
    );
  }
  return readFileSync(path, "utf8");
}

function parseGeonamesRows(text) {
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const cols = line.split("\t");
      return {
        geonameId: Number(cols[0]),
        name: cols[1],
        asciiName: cols[2],
        latitude: Number(cols[4]),
        longitude: Number(cols[5]),
        featureClass: cols[6],
        countryCode: cols[8],
        admin1Code: cols[10],
        population: Number(cols[14]) || 0,
        timezoneId: cols[17],
      };
    });
}

function parseAdmin1Names(text) {
  const map = new Map();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const [code, name] = line.split("\t");
    map.set(code, name);
  }
  return map;
}

function resolveAdmin1(row, admin1Names) {
  const admin1Key = `${row.countryCode}.${row.admin1Code}`;
  const name = admin1Names.get(admin1Key) ?? null;
  if (row.countryCode === "ES" && name && SPAIN_ADMIN1_ES[name]) {
    return SPAIN_ADMIN1_ES[name];
  }
  return name;
}

function toRecord(row, admin1Names) {
  return {
    id: row.geonameId,
    name: row.name,
    asciiName: row.asciiName,
    admin1: resolveAdmin1(row, admin1Names),
    countryCode: row.countryCode,
    latitude: row.latitude,
    longitude: row.longitude,
    timezoneId: row.timezoneId,
    population: row.population,
  };
}

function main() {
  const admin1Names = parseAdmin1Names(requireFile("admin1CodesASCII.txt"));

  const worldCities = parseGeonamesRows(requireFile("cities15000.txt")).filter(
    (row) => row.featureClass === "P"
  );
  const knownIds = new Set(worldCities.map((row) => row.geonameId));

  const extraSpainTowns = parseGeonamesRows(requireFile("ES.txt")).filter(
    (row) => row.featureClass === "P" && row.population >= SPAIN_MIN_POPULATION && !knownIds.has(row.geonameId)
  );

  const merged = [...worldCities, ...extraSpainTowns]
    .map((row) => toRecord(row, admin1Names))
    .sort((a, b) => a.id - b.id);

  writeFileSync(outputPath, JSON.stringify(merged));

  console.log(`Ciudades globales (cities15000, pop >= 15000): ${worldCities.length}`);
  console.log(`Localidades adicionales de España (pop >= ${SPAIN_MIN_POPULATION}): ${extraSpainTowns.length}`);
  console.log(`Total en dataset: ${merged.length}`);
  console.log(`Escrito en: ${outputPath}`);

  const countryCodes = new Set(merged.map((place) => place.countryCode));
  console.log(`Países distintos representados: ${countryCodes.size}`);
}

main();
