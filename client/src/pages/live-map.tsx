import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { FleetMap } from "@/components/fleet-map";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { Vehicle, Driver } from "@shared/schema";

export default function LiveMap() {
  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    refetchInterval: 3000,
  });
  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
    refetchInterval: 3000,
  });

  const activeCount = vehicles?.filter((v) => v.status === "active").length ?? 0;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Live Map"
        description="Vehicle positions update automatically every 3 seconds"
        actions={
          <Badge variant="outline" className="gap-1.5" data-testid="badge-live-tracking">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-chart-3" />
            {activeCount} vehicles live
          </Badge>
        }
      />
      <div className="flex-1 p-4">
        {isLoading ? (
          <Skeleton className="h-full w-full rounded-md" />
        ) : (
          <FleetMap vehicles={vehicles ?? []} drivers={drivers} className="h-full w-full" />
        )}
      </div>
    </div>
  );
}
