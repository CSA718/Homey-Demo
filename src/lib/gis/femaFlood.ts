// Live query against FEMA's National Flood Hazard Layer (NFHL) ArcGIS REST
// service — public, no API key. Layer 28 is the standard Flood Hazard Zones
// layer (S_FLD_HAZ_AR) in FEMA's published NFHL MapServer.
//
// This is a best-effort live integration: government ArcGIS endpoints can be
// slow, rate-limited, or unreachable from a given network. Every caller of
// this module treats a null result as "fall back to the modeled estimate" —
// the report is never blocked on this succeeding.

export interface FemaFloodResult {
  zone: string;
  zoneSubtype: string | null;
  isSFHA: boolean; // Special Flood Hazard Area (1% annual chance)
}

const NFHL_QUERY_URL =
  "https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query";

export async function queryFemaFloodZone(
  lat: number,
  lon: number,
  timeoutMs = 6000,
): Promise<FemaFloodResult | null> {
  const url = new URL(NFHL_QUERY_URL);
  url.searchParams.set("geometry", `${lon},${lat}`);
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "FLD_ZONE,ZONE_SUBTY,SFHA_TF");
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("f", "json");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error) return null;
    const feature = data?.features?.[0];
    if (!feature) return null;
    const attrs = feature.attributes;
    return {
      zone: attrs.FLD_ZONE ?? "X",
      zoneSubtype: attrs.ZONE_SUBTY ?? null,
      isSFHA: attrs.SFHA_TF === "T",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function classifyFemaZone(result: FemaFloodResult): {
  status: "clear" | "caution" | "flag";
  finding: string;
} {
  const { zone, zoneSubtype, isSFHA } = result;

  if (isSFHA || /^(A|AE|AH|AO|AR|A99|V|VE)$/.test(zone)) {
    return {
      status: "flag",
      finding: `Live FEMA lookup places this parcel in Zone ${zone}${zoneSubtype ? ` (${zoneSubtype})` : ""} — a Special Flood Hazard Area (1% annual chance flood). A house here requires base flood elevation certification and elevated foundation design, and flood insurance would be mandatory.`,
    };
  }

  if (zone === "D") {
    return {
      status: "caution",
      finding:
        "Live FEMA lookup returns Zone D for this parcel — flood hazard has not been determined by a detailed study. A site-specific elevation study is recommended before relying on this.",
    };
  }

  if (zoneSubtype && /0\.2 PCT/i.test(zoneSubtype)) {
    return {
      status: "caution",
      finding:
        "Live FEMA lookup places this parcel in the 0.2% annual chance flood hazard area (shaded Zone X) — outside the mandatory insurance zone, but worth flagging for site design.",
    };
  }

  return {
    status: "clear",
    finding: `Live FEMA lookup confirms this parcel is in Zone ${zone} — minimal flood hazard. No flood insurance requirement, no elevation constraints.`,
  };
}
