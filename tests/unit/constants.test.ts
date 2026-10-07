import { describe, expect, it } from "vitest";

import { EVENT_NAMES, EXPERIMENT_ID, TRIGGERS_A, TRIGGERS_B } from "@/libs/experiment/constants";

describe("catalogo congelado del experimento", () => {
  it("usa el experiment_id aprobado", () => {
    expect(EXPERIMENT_ID).toBe("vega_beachhead_v1");
  });

  it("incluye los eventos de negocio criticos del funnel", () => {
    const critical = [
      "router_view",
      "segment_selected",
      "segment_entry",
      "own_profile_complete",
      "partner_analysis_possible",
      "onboarding_complete",
      "preview_view",
      "paywall_view",
      "priced_access_intent",
      "waitlist_submit",
    ];
    critical.forEach((eventName) => {
      expect(EVENT_NAMES).toContain(eventName);
    });
  });

  it("no duplica nombres de evento", () => {
    expect(new Set(EVENT_NAMES).size).toBe(EVENT_NAMES.length);
  });

  it("define exactamente los triggers de A y B de la especificacion", () => {
    expect(TRIGGERS_A).toEqual([
      "career",
      "blocked",
      "major_change",
      "identity",
      "family",
      "repeating_pattern",
      "relationship_spillover",
      "other",
    ]);
    expect(TRIGGERS_B).toEqual([
      "new_connection",
      "relationship",
      "conflict",
      "distance",
      "breakup",
      "ex",
      "on_off",
      "other",
    ]);
  });
});
