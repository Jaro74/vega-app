import { describe, expect, it } from "vitest";

import { inferDeviceType, parseAcquisition } from "@/libs/experiment/acquisition";

describe("parseAcquisition", () => {
  it("usa utm_source como trafficSource cuando esta presente", () => {
    const params = new URLSearchParams(
      "utm_source=meta&utm_medium=paid_social&utm_campaign=vega_beachhead_v1_es&utm_content=neutral_v1&placement=instagram_feed"
    );
    const result = parseAcquisition(params, { hasReferer: false, userAgent: null });

    expect(result).toEqual({
      trafficSource: "meta",
      utmSource: "meta",
      utmMedium: "paid_social",
      utmCampaign: "vega_beachhead_v1_es",
      utmContent: "neutral_v1",
      placement: "instagram_feed",
      deviceType: null,
    });
  });

  it("cae a 'referral' sin utm_source pero con referer", () => {
    const result = parseAcquisition(new URLSearchParams(""), { hasReferer: true, userAgent: null });
    expect(result.trafficSource).toBe("referral");
  });

  it("cae a 'direct' sin utm_source y sin referer", () => {
    const result = parseAcquisition(new URLSearchParams(""), { hasReferer: false, userAgent: null });
    expect(result.trafficSource).toBe("direct");
  });
});

describe("inferDeviceType", () => {
  it("detecta mobile", () => {
    expect(inferDeviceType("Mozilla/5.0 (iPhone; CPU iPhone OS) Mobile/15E148")).toBe("mobile");
  });

  it("detecta tablet", () => {
    expect(inferDeviceType("Mozilla/5.0 (iPad; CPU OS) Tablet")).toBe("tablet");
  });

  it("cae a desktop por defecto", () => {
    expect(inferDeviceType("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
  });

  it("devuelve null sin user agent", () => {
    expect(inferDeviceType(null)).toBeNull();
  });
});
