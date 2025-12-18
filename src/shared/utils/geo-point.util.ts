export type LatLng = { lat: number; lng: number };

export type GeoJsonPoint = {
  type: 'Point';
  coordinates: [number, number] | [number, number, ...number[]];
};

export type PostgisPointObject = {
  coordinates: [number, number] | [number, number, ...number[]];
};

export type XYPointObject = {
  x: number;
  y: number;
};

export type GeoPointInput =
  | string
  | GeoJsonPoint
  | PostgisPointObject
  | XYPointObject;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

export const parseGeoPoint = (
  input: GeoPointInput | null | undefined,
): LatLng | undefined => {
  if (!input) return undefined;

  if (typeof input === 'string') {
    const match = input.match(/POINT\s*\(([^\s]+)\s+([^\s]+)\)/);
    if (!match) return undefined;

    const lng = Number(match[1]);
    const lat = Number(match[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return undefined;
  }

  if (isRecord(input)) {
    if ('coordinates' in input) {
      const maybeCoords = input['coordinates'];
      if (Array.isArray(maybeCoords) && maybeCoords.length >= 2) {
        const lng = Number(maybeCoords[0]);
        const lat = Number(maybeCoords[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
        return undefined;
      }
    }

    if ('x' in input && 'y' in input) {
      const x = input['x'];
      const y = input['y'];
      if (typeof x === 'number' && typeof y === 'number') {
        if (Number.isFinite(x) && Number.isFinite(y)) return { lng: x, lat: y };
      }
    }
  }

  return undefined;
};
