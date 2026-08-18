import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { FleetMap } from "@/components/fleet-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Truck, Users, AlertTriangle, Gauge, Route as RouteIcon } from "lucide-react";
import type { Vehicle, Driver, Trip, Alert } from "@shared/schema";
import { TripStatusBadge, SeverityBadge } from "@/components/status-badge";
import { alertTypeLabel, formatDistance, timeAgo } from "@/lib/status";

export default function Dashboard() {
  const { data: vehicles, isLoading: loadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    refetchInterval: 3000,
  });
  const { data: drivers, isLoading: loadingDrivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
    refetchInterval: 3000,
  });
  const { data: trips, isLoading: loadingTrips } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
    refetchInterval: 3000,
  });
  const { data: alerts, isLoading: loadingAlerts } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: 3000,
  });

  const isLoading = loadingVehicles || loadingDrivers || loadingTrips || loadingAlerts;

  const activeVehicles = vehicles?.filter((v) => v.status === "active").length ?? 0;
  const totalVehicles = vehicles?.length ?? 0;
  const driversOnDuty = drivers?.filter((d) => d.status !== "off_duty").length ?? 0;
  const openAlerts = alerts?.filter((a) => !a.resolved).length ?? 0;

  const completedToday = trips?.filter((t) => {
    if (t.status !== "completed" || !t.endTime) return false;
    const end = new Date(t.endTime);
    const now = new Date();
    return end.toDateString() === now.toDateString();
  });
  const inProgressDistance = trips?.filter((t) => t.status === "in_progress") ?? [];
  const totalDistanceToday =
    (completedToday?.reduce((sum, t) => sum + t.distanceKm, 0) ?? 0) +
    inProgressDistance.reduce((sum, t) => sum + t.distanceKm, 0);

  const recentTrips = [...(trips ?? [])]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 5);

  const recentAlerts = [...(alerts ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const vehicleById = new Map((vehicles ?? []).map((v) => [v.id, v]));

  return (
    <div className="pb-10">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of the Victoria regional fleet"
      />

      <div className="space-y-6 px-6 py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-md" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5" data-testid="grid-kpi-cards">
            <KpiCard
              label="Active Vehicles"
              value={`${activeVehicles}`}
              icon={Truck}
              accent="text-chart-3"
              testId="kpi-active-vehicles"
            />
            <KpiCard
              label="Total Fleet"
              value={`${totalVehicles}`}
              icon={Gauge}
              testId="kpi-total-fleet"
            />
            <KpiCard
              label="Drivers On Duty"
              value={`${driversOnDuty}`}
              icon={Users}
              accent="text-chart-2"
              testId="kpi-drivers-on-duty"
            />
            <KpiCard
              label="Open Alerts"
              value={`${openAlerts}`}
              icon={AlertTriangle}
              accent="text-destructive"
              testId="kpi-open-alerts"
            />
            <KpiCard
              label="Distance Today"
              value={formatDistance(totalDistanceToday)}
              icon={RouteIcon}
              testId="kpi-distance-today"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base font-semibold">Live Fleet Map</CardTitle>
              <Button variant="outline" size="sm" asChild data-testid="link-view-full-map">
                <Link href="/map">View full map</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[360px] w-full rounded-md" />
              ) : (
                <div className="h-[360px] overflow-hidden rounded-md">
                  <FleetMap vehicles={vehicles ?? []} drivers={drivers} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Alerts Feed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)
              ) : recentAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No alerts yet.</p>
              ) : (
                recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between gap-2 rounded-md border border-border p-3"
                    data-testid={`row-alert-${alert.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{alert.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {vehicleById.get(alert.vehicleId)?.plate ?? "Unknown vehicle"} ·{" "}
                        {alertTypeLabel[alert.type]} · {timeAgo(alert.createdAt)}
                      </p>
                    </div>
                    <SeverityBadge severity={alert.severity as any} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Trips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)
            ) : recentTrips.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trips logged yet.</p>
            ) : (
              recentTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                  data-testid={`row-trip-${trip.id}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {trip.startLocation} <span className="text-muted-foreground">→</span> {trip.endLocation}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {vehicleById.get(trip.vehicleId)?.plate ?? "—"} · {formatDistance(trip.distanceKm)}
                    </p>
                  </div>
                  <TripStatusBadge status={trip.status as any} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
