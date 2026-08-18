import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  vehicleStatusConfig,
  driverStatusConfig,
  tripStatusConfig,
  alertSeverityConfig,
} from "@/lib/status";

export function VehicleStatusBadge({ status }: { status: keyof typeof vehicleStatusConfig }) {
  const cfg = vehicleStatusConfig[status];
  return (
    <Badge variant="outline" className="gap-1.5 font-medium" data-testid={`status-vehicle-${status}`}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </Badge>
  );
}

export function DriverStatusBadge({ status }: { status: keyof typeof driverStatusConfig }) {
  const cfg = driverStatusConfig[status];
  return (
    <Badge variant="outline" className="gap-1.5 font-medium" data-testid={`status-driver-${status}`}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </Badge>
  );
}

export function TripStatusBadge({ status }: { status: keyof typeof tripStatusConfig }) {
  const cfg = tripStatusConfig[status];
  return (
    <Badge variant="outline" className="gap-1.5 font-medium" data-testid={`status-trip-${status}`}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </Badge>
  );
}

export function SeverityBadge({ severity }: { severity: keyof typeof alertSeverityConfig }) {
  const cfg = alertSeverityConfig[severity];
  return (
    <Badge
      variant="outline"
      className={cn("font-medium border-transparent", cfg.classes)}
      data-testid={`severity-${severity}`}
    >
      {cfg.label}
    </Badge>
  );
}
