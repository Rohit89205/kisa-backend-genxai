export const CATALOG_URL =
  'https://services.sentinel-hub.com/api/v1/catalog/1.0.0/search';

export function getBBox(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): [number, number, number, number] {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  const coords =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.coordinates;

  for (const poly of coords) {
    for (const ring of poly) {
      for (const [lng, lat] of ring) {
        minX = Math.min(minX, lng);
        minY = Math.min(minY, lat);
        maxX = Math.max(maxX, lng);
        maxY = Math.max(maxY, lat);
      }
    }
  }

  return [minX, minY, maxX, maxY];
}

export function generateFallbackDates(
  fromDate: string,
  toDate: string,
): Array<{ date: string; cloudCover: number | null }> {
  const dates: Array<{ date: string; cloudCover: number | null }> = [];

  const start = new Date(fromDate);
  const end = new Date(toDate);

  const current = new Date(start);
  while (current <= end) {
    dates.push({
      date: current.toISOString().split('T')[0],
      cloudCover: null,
    });
    current.setDate(current.getDate() + 5); // Sentinel-2 revisit
  }

  return dates;
}