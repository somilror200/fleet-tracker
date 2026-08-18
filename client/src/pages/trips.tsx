import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Check } from "lucide-react";
import type { Trip, Vehicle, Driver } from "@shared/schema";
import { TripStatusBadge } from "@/components/status-badge";
import { formatDistance, formatDuration } from "@/lib/status";
import { TripFormDialog } from "@/components/trip-form-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button as Btn } from "@/components/ui/button";

export default function Trips() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");

  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
    refetchInterval: 3000,
  });
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    refetchInterval: 3000,
  });
  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
    refetchInterval: 3000,
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("PATCH", `/api/trips/${id}`, {
        status: "completed",
        endTime: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: "Trip marked completed" });
    },
    onError: (err: Error) => {
      toast({ title: "Could not complete trip", description: err.message, variant: "destructive" });
    },
  });

  const vehicleById = new Map((vehicles ?? []).map((v) => [v.id, v]));
  const driverById = new Map((drivers ?? []).map((d) => [d.id, d]));

  const filteredTrips = (trips ?? [])
    .filter((t) => statusFilter === "all" || t.status === statusFilter)
    .filter((t) => vehicleFilter === "all" || String(t.vehicleId) === vehicleFilter)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <div className="pb-10">
      <PageHeader
        title="Trips"
        description="Trip log across the fleet, with live filtering"
        actions={
          <Button onClick={() => setFormOpen(true)} data-testid="button-add-trip">
            <Plus className="h-4 w-4" />
            New Trip
          </Button>
        }
      />

      <div className="space-y-4 px-6 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-filter-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-filter-vehicle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vehicles</SelectItem>
              {(vehicles ?? []).map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : filteredTrips.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No trips match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="table-trips">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrips.map((trip) => (
                      <TableRow key={trip.id} data-testid={`row-trip-list-${trip.id}`}>
                        <TableCell>
                          <p className="font-medium">
                            {trip.startLocation} <span className="text-muted-foreground">→</span>{" "}
                            {trip.endLocation}
                          </p>
                        </TableCell>
                        <TableCell>{vehicleById.get(trip.vehicleId)?.plate ?? "—"}</TableCell>
                        <TableCell>{driverById.get(trip.driverId)?.name ?? "—"}</TableCell>
                        <TableCell className="tabular-nums">{formatDistance(trip.distanceKm)}</TableCell>
                        <TableCell className="tabular-nums">
                          {formatDuration(trip.startTime, trip.endTime)}
                        </TableCell>
                        <TableCell>
                          <TripStatusBadge status={trip.status as any} />
                        </TableCell>
                        <TableCell className="text-right">
                          {trip.status === "in_progress" && (
                            <Btn
                              variant="ghost"
                              size="sm"
                              onClick={() => completeMutation.mutate(trip.id)}
                              disabled={completeMutation.isPending}
                              data-testid={`button-complete-trip-${trip.id}`}
                            >
                              <Check className="h-4 w-4" />
                              Complete
                            </Btn>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TripFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        vehicles={vehicles ?? []}
        drivers={drivers ?? []}
      />
    </div>
  );
}
