import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Vehicle, Trip } from "@shared/schema";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  active: "hsl(var(--chart-3))",
  idle: "hsl(var(--chart-2))",
  maintenance: "hsl(var(--chart-4))",
};

export default function Analytics() {
  const { data: vehicles, isLoading: loadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    refetchInterval: 3000,
  });
  const { data: trips, isLoading: loadingTrips } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
    refetchInterval: 3000,
  });

  const isLoading = loadingVehicles || loadingTrips;

  const distancePerVehicle = (vehicles ?? []).map((v) => {
    const total = (trips ?? [])
      .filter((t) => t.vehicleId === v.id)
      .reduce((sum, t) => sum + t.distanceKm, 0);
    return { name: v.plate, distance: Math.round(total) };
  });

  const fuelTrend = (vehicles ?? [])
    .slice()
    .sort((a, b) => a.fuelPercent - b.fuelPercent)
    .map((v) => ({ name: v.plate, fuel: Math.round(v.fuelPercent) }));

  const utilization = ["active", "idle", "maintenance"].map((status) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: (vehicles ?? []).filter((v) => v.status === status).length,
    key: status,
  }));

  return (
    <div className="pb-10">
      <PageHeader title="Analytics" description="Fleet performance and utilization trends" />

      <div className="grid grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Distance per Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full rounded-md" />
            ) : (
              <div className="h-[280px]" data-testid="chart-distance-per-vehicle">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distancePerVehicle} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--popover-border))",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                      labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                    />
                    <Bar dataKey="distance" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Distance (km)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Fuel Level by Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full rounded-md" />
            ) : (
              <div className="h-[280px]" data-testid="chart-fuel-trend">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={fuelTrend}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--popover-border))",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                      labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                      formatter={(value: number) => [`${value}%`, "Fuel"]}
                    />
                    <Bar dataKey="fuel" radius={[0, 4, 4, 0]} name="Fuel %">
                      {fuelTrend.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.fuel < 20 ? "hsl(var(--destructive))" : "hsl(var(--chart-2))"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Fleet Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full rounded-md" />
            ) : (
              <div className="h-[280px]" data-testid="chart-fleet-utilization">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={utilization}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={64}
                      outerRadius={96}
                      paddingAngle={2}
                    >
                      {utilization.map((entry) => (
                        <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--popover-border))",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                      labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                    />
                    <Legend
                      formatter={(value) => (
                        <span style={{ color: "hsl(var(--foreground))", fontSize: 13 }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
