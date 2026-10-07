"use client";

import { readAcquisitionFromLocation, readTestFlagFromLocation } from "@/libs/analytics/client-acquisition";
import { getOrCreateSessionId } from "@/libs/analytics/client-ids";
import { captureExperimentEvent } from "@/libs/analytics/events";
import { useFireOnce } from "@/libs/analytics/hooks";

// Instrumenta la landing existente del boilerplate con el evento
// neutral_landing_view. Sprint 1 no rediseña el copy de la landing
// (fuera de alcance); solo añade analytics.
export default function NeutralLandingAnalytics(): null {
  useFireOnce(() => {
    captureExperimentEvent("neutral_landing_view", {
      anonymousUserId: null,
      sessionId: getOrCreateSessionId(),
      segment: null,
      isPrimaryAttempt: null,
      isTest: readTestFlagFromLocation(),
      ...readAcquisitionFromLocation(),
    });
  });

  return null;
}
