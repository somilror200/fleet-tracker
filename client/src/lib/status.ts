// Shared status → label/color mappings for vehicles, drivers, trips, alerts.

export const vehicleStatusConfig = {
  active: { label: "Active", dot: "bg-chart-3" },
  idle: { label: "Idle", dot: "bg-muted-foreground" },
  maintenance: { label: "Maintenance", dot: "bg-destructive" },
} as const;

export const driverStatusConfig = {
  available: { label: "Available", dot: "bg-chart-3" },
  on_trip: { label: "On Trip", dot: "bg-primary" },
  off_duty: { label: "Off Duty", dot: "bg-muted-foreground" },
} as const;

export const tripStatusConfig = {
  in_progress: { label: "In Progress", dot: "bg-primary" },
  completed: { label: "Completed", dot: "bg-chart-3" },
} as const;

export const alertSeverityConfig = {
  low: { label: "Low", classes: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", classes: "bg-chart-1/15 text-chart-1" },
  high: { label: "High", classes: "bg-destructive/15 text-destructive" },
} as const;

export const alertTypeLabel: Record<string, string> = {
  maintenance: "Maintenance",
  fuel: "Fuel",
  speed: "Speed",
};

export const vehicleTypeLabel: Record<string, string> = {
  truck: "Truck",
  van: "Van",
  car: "Car",
};

export function formatDistance(km: number) {
  return `${km.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
}

export function formatDuration(startIso: string, endIso: string | null) {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((end - start) / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
