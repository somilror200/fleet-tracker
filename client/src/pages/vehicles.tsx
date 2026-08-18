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
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Plus, Pencil, Trash2, Fuel } from "lucide-react";
import type { Vehicle, Driver, Trip } from "@shared/schema";
import { VehicleStatusBadge, TripStatusBadge } from "@/components/status-badge";
import { vehicleTypeLabel, formatDistance } from "@/lib/status";
import { VehicleFormDialog } from "@/components/vehicle-form-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Vehicles() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>();
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | undefined>();
  const [detailVehicleId, setDetailVehicleId] = useState<number | null>(null);

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    refetchInterval: 3000,
  });
  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
    refetchInterval: 3000,
  });
  const { data: trips } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
    refetchInterval: 3000,
  });

  const detailVehicle = detailVehicleId === null
    ? undefined
    : (vehicles ?? []).find((vehicle) => vehicle.id === detailVehicleId);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: "Vehicle deleted" });
      setDeletingVehicle(undefined);
      setDetailVehicleId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const driverById = new Map((drivers ?? []).map((d) => [d.id, d]));
  const tripsForVehicle = (id: number) =>
    (trips ?? [])
      .filter((t) => t.vehicleId === id)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <div className="pb-10">
      <PageHeader
        title="Vehicles"
        description="Fleet roster, assignment, and health status"
        actions={
          <Button
            onClick={() => {
              setEditingVehicle(undefined);
              setFormOpen(true);
            }}
            data-testid="button-add-vehicle"
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Button>
        }
      />

      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="table-vehicles">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Mileage</TableHead>
                      <TableHead>Fuel</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(vehicles ?? []).map((vehicle) => (
                      <TableRow
                        key={vehicle.id}
                        className="cursor-pointer"
                        onClick={() => setDetailVehicleId(vehicle.id)}
                        data-testid={`row-vehicle-${vehicle.id}`}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{vehicle.name}</p>
                            <p className="text-xs text-muted-foreground">{vehicle.plate}</p>
                          </div>
                        </TableCell>
                        <TableCell>{vehicleTypeLabel[vehicle.type]}</TableCell>
                        <TableCell>
                          <VehicleStatusBadge status={vehicle.status as any} />
                        </TableCell>
                        <TableCell>
                          {vehicle.driverId ? driverById.get(vehicle.driverId)?.name ?? "—" : "Unassigned"}
                        </TableCell>
                        <TableCell className="tabular-nums">{formatDistance(vehicle.mileageKm)}</TableCell>
                        <TableCell className="tabular-nums">{Math.round(vehicle.fuelPercent)}%</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${vehicle.name}`}
                              onClick={() => {
                                setEditingVehicle(vehicle);
                                setFormOpen(true);
                              }}
                              data-testid={`button-edit-vehicle-${vehicle.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${vehicle.name}`}
                              onClick={() => setDeletingVehicle(vehicle)}
                              data-testid={`button-delete-vehicle-${vehicle.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      <VehicleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        vehicle={editingVehicle}
        drivers={drivers ?? []}
      />

      <AlertDialog open={!!deletingVehicle} onOpenChange={(open) => !open && setDeletingVehicle(undefined)}>
        <AlertDialogContent data-testid="dialog-delete-vehicle-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingVehicle?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the vehicle and its plate {deletingVehicle?.plate} from the fleet. Vehicles with an active trip cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-vehicle">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingVehicle && deleteMutation.mutate(deletingVehicle.id)}
              data-testid="button-confirm-delete-vehicle"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={detailVehicleId !== null && !!detailVehicle} onOpenChange={(open) => !open && setDetailVehicleId(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md" data-testid="sheet-vehicle-detail">
          {detailVehicle && (
            <>
              <SheetHeader>
                <SheetTitle>{detailVehicle.name}</SheetTitle>
                <SheetDescription>
                  {detailVehicle.plate} · {vehicleTypeLabel[detailVehicle.type]}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <VehicleStatusBadge status={detailVehicle.status as any} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Fuel className="h-3.5 w-3.5" /> Fuel Level
                    </span>
                    <span className="font-medium tabular-nums" data-testid="text-detail-fuel">
                      {Math.round(detailVehicle.fuelPercent)}%
                    </span>
                  </div>
                  <Progress value={detailVehicle.fuelPercent} />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Mileage</p>
                    <p className="font-medium tabular-nums" data-testid="text-detail-mileage">
                      {formatDistance(detailVehicle.mileageKm)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Speed</p>
                    <p className="font-medium tabular-nums">{Math.round(detailVehicle.speedKmh)} km/h</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Assigned Driver</p>
                    <p className="font-medium">
                      {detailVehicle.driverId
                        ? driverById.get(detailVehicle.driverId)?.name ?? "—"
                        : "Unassigned"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Heading</p>
                    <p className="font-medium tabular-nums">{Math.round(detailVehicle.heading)}°</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Recent Trips</p>
                  <div className="space-y-2">
                    {tripsForVehicle(detailVehicle.id).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No trips recorded.</p>
                    ) : (
                      tripsForVehicle(detailVehicle.id)
                        .slice(0, 5)
                        .map((trip) => (
                          <div
                            key={trip.id}
                            className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5 text-sm"
                            data-testid={`row-detail-trip-${trip.id}`}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {trip.startLocation} → {trip.endLocation}
                              </p>
                              <p className="text-xs text-muted-foreground">{formatDistance(trip.distanceKm)}</p>
                            </div>
                            <TripStatusBadge status={trip.status as any} />
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
