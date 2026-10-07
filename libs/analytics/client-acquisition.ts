"use client";

import { parseAcquisition } from "@/libs/experiment/acquisition";
import { TEST_TRAFFIC_COOKIE } from "@/libs/experiment/cookies";
import type { AcquisitionData } from "@/libs/db/types";

const EMPTY_ACQUISITION: AcquisitionData = {
  trafficSource: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  placement: null,
  deviceType: null,
};

// Lectura de adquisicion en el navegador, reutilizando el mismo nucleo
// puro (parseAcquisition/inferDeviceType) que usa el backend sobre
// NextRequest. Solo usada para las propiedades de los eventos frontend
// (neutral_landing_view, router_view, segment_selected): la persistencia
// de "first touch" real vive en experiment_users, resuelta server-side.
export function readAcquisitionFromLocation(): AcquisitionData {
  if (typeof window === "undefined") return EMPTY_ACQUISITION;

  return parseAcquisition(new URLSearchParams(window.location.search), {
    hasReferer: Boolean(document.referrer),
    userAgent: window.navigator.userAgent,
  });
}

export function readTestFlagFromLocation(): boolean {
  if (typeof window === "undefined") return false;

  if (new URLSearchParams(window.location.search).get("test") === "1") return true;

  return document.cookie
    .split("; ")
    .some((entry) => entry === `${TEST_TRAFFIC_COOKIE}=1`);
}
