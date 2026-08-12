// Real geocoding via the US Census Bureau's public geocoder — free, no API key,
// well-documented, and stable. Used to turn a Lot Check address into real
// coordinates so the flood-zone layer can be queried live.

export interface GeocodeResult {
  lat: number;
  lon: number;
  matchedAddress: string;
}

const CENSUS_GEOCODER_URL =
  "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";

export async function geocodeAddress(
  address: string,
  town: string,
  timeoutMs = 6000,
): Promise<GeocodeResult | null> {
  const oneLine = `${address}, ${town}, MA`;
  const url = `${CENSUS_GEOCODER_URL}?address=${encodeURIComponent(oneLine)}&benchmark=Public_AR_Current&format=json`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const match = data?.result?.addressMatches?.[0];
    if (!match?.coordinates) return null;
    return {
      lat: match.coordinates.y,
      lon: match.coordinates.x,
      matchedAddress: match.matchedAddress as string,
    };
  } catch {
    // Network failure, timeout, CORS block, or the service being unreachable
    // from wherever this is running — the caller falls back to modeled data.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
