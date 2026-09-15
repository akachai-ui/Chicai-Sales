// Haversine Distance calculation in kilometers between two GPS points
export function calculateDistanceKm(
  lat1: number | null | undefined,
  lon1: number | null | undefined,
  lat2: number | null | undefined,
  lon2: number | null | undefined
): number | null {
  if (
    lat1 === null ||
    lat1 === undefined ||
    lon1 === null ||
    lon1 === undefined ||
    lat2 === null ||
    lat2 === undefined ||
    lon2 === null ||
    lon2 === undefined
  ) {
    return null;
  }

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // 1 decimal place
}

// Format distance nicely in Thai
export function formatDistanceThai(km: number | null): string {
  if (km === null || isNaN(km)) return '';
  if (km < 1) {
    return `${Math.round(km * 1000)} ม.`;
  }
  return `${km.toFixed(1)} กม.`;
}

// Estimate driving time in minutes based on average speed (e.g. 45 km/h in industrial/urban zone)
export function estimateDrivingTimeMinutes(km: number | null): number | null {
  if (km === null || isNaN(km) || km === 0) return null;
  const avgSpeedKmH = 45; // average speed in industrial areas
  const hours = km / avgSpeedKmH;
  return Math.max(5, Math.round(hours * 60)); // minimum 5 mins
}

export function formatDrivingTimeThai(minutes: number | null): string {
  if (!minutes) return '';
  if (minutes < 60) return `~${minutes} นาที`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `~${hrs} ชม. ${mins} นาที` : `~${hrs} ชม.`;
}

// Calculate total route distance for a sequence of planned stops
export function calculateRouteStats(stops: { latitude?: number | null; longitude?: number | null }[]): {
  totalKm: number;
  legDistances: (number | null)[];
} {
  let totalKm = 0;
  const legDistances: (number | null)[] = [];

  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    const dist = calculateDistanceKm(from.latitude, from.longitude, to.latitude, to.longitude);
    legDistances.push(dist);
    if (dist !== null) {
      totalKm += dist;
    }
  }

  return {
    totalKm: Math.round(totalKm * 10) / 10,
    legDistances,
  };
}
