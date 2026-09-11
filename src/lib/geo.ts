export interface DistrictZone {
  name: string;
  count: number;
  center: [number, number];
  polygon: [number, number][];
  color: string;
  borderColor: string;
  fillColor: string;
}

// Color palette for district zones
const ZONE_COLORS: { color: string; border: string; fill: string }[] = [
  { color: '#2563eb', border: '#3b82f6', fill: 'rgba(59, 130, 246, 0.08)' }, // Blue
  { color: '#059669', border: '#10b981', fill: 'rgba(16, 185, 129, 0.08)' }, // Emerald
  { color: '#7c3aed', border: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.08)' }, // Purple
  { color: '#d97706', border: '#f59e0b', fill: 'rgba(245, 158, 11, 0.08)' }, // Amber
  { color: '#e11d48', border: '#f43f5e', fill: 'rgba(244, 63, 94, 0.08)' },  // Rose
  { color: '#0891b2', border: '#06b6d4', fill: 'rgba(6, 182, 212, 0.08)' },  // Cyan
  { color: '#4f46e5', border: '#6366f1', fill: 'rgba(99, 102, 241, 0.08)' }, // Indigo
  { color: '#c026d3', border: '#d946ef', fill: 'rgba(217, 70, 239, 0.08)' }, // Fuchsia
];

function normalizeDistrictName(raw?: string | null): string {
  if (!raw) return 'สมุทรปราการ';
  let s = raw.trim().replace(/^อ\./, '').replace(/^อำเภอ/, '').trim();
  if (s === 'เมือง' || s === 'เมืองฯ') s = 'เมืองสมุทรปราการ';
  return s;
}

// Calculate 2D Convex Hull (Monotone Chain algorithm)
function calculateConvexHull(points: [number, number][]): [number, number][] {
  if (points.length <= 3) return points;

  // Sort points by longitude then latitude
  const sorted = [...points].sort((a, b) => a[1] === b[1] ? a[0] - b[0] : a[1] - b[1]);

  function cross(o: [number, number], a: [number, number], b: [number, number]) {
    return (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1]);
  }

  // Lower hull
  const lower: [number, number][] = [];
  for (let i = 0; i < sorted.length; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
      lower.pop();
    }
    lower.push(sorted[i]);
  }

  // Upper hull
  const upper: [number, number][] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
      upper.pop();
    }
    upper.push(sorted[i]);
  }

  // Remove duplicate last points and combine
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// Slightly expand convex hull outward from centroid to give a natural zone padding
function expandPolygon(polygon: [number, number][], center: [number, number], factor: number = 1.12): [number, number][] {
  return polygon.map(([lat, lng]) => {
    const dLat = lat - center[0];
    const dLng = lng - center[1];
    return [center[0] + dLat * factor, center[1] + dLng * factor];
  });
}

/**
 * Generate District Zones from any list of points
 */
export function generateDistrictZones(
  items: { district?: string | null; latitude?: number | null; longitude?: number | null }[],
  minCount: number = 10
): DistrictZone[] {
  const groups: Record<string, [number, number][]> = {};

  items.forEach((c) => {
    if (!c.latitude || !c.longitude) return;
    const d = normalizeDistrictName(c.district);
    if (!groups[d]) groups[d] = [];
    groups[d].push([c.latitude, c.longitude]);
  });

  const sortedGroups = Object.entries(groups)
    .filter(([_, pts]) => pts.length >= minCount)
    .sort((a, b) => b[1].length - a[1].length);

  return sortedGroups.map(([name, points], index) => {
    const avgLat = points.reduce((a, b) => a + b[0], 0) / points.length;
    const avgLng = points.reduce((a, b) => a + b[1], 0) / points.length;
    const center: [number, number] = [avgLat, avgLng];

    const rawHull = calculateConvexHull(points);
    const expandedHull = expandPolygon(rawHull, center, 1.15);

    const colorScheme = ZONE_COLORS[index % ZONE_COLORS.length];

    return {
      name,
      count: points.length,
      center,
      polygon: expandedHull,
      color: colorScheme.color,
      borderColor: colorScheme.border,
      fillColor: colorScheme.fill,
    };
  });
}
