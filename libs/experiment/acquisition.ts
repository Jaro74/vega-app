import type { NextRequest } from "next/server";

import type { AcquisitionData } from "@/libs/db/types";

// Nucleo puro (facil de testear sin construir un NextRequest): decide la
// adquisicion a partir de los parametros de query ya extraidos y del
// contexto minimo de la request.
export function parseAcquisition(
  params: URLSearchParams,
  context: { hasReferer: boolean; userAgent: string | null }
): AcquisitionData {
  const utmSource = params.get("utm_source");

  return {
    trafficSource: utmSource ?? (context.hasReferer ? "referral" : "direct"),
    utmSource,
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmContent: params.get("utm_content"),
    placement: params.get("placement"),
    deviceType: inferDeviceType(context.userAgent),
  };
}

export function inferDeviceType(userAgent: string | null): "mobile" | "tablet" | "desktop" | null {
  if (!userAgent) return null;
  if (/mobile/i.test(userAgent)) return "mobile";
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  return "desktop";
}

export function parseAcquisitionFromRequest(request: NextRequest): AcquisitionData {
  return parseAcquisition(request.nextUrl.searchParams, {
    hasReferer: Boolean(request.headers.get("referer")),
    userAgent: request.headers.get("user-agent"),
  });
}
