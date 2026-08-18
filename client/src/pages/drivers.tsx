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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Driver, Vehicle } from "@shared/schema";
import { DriverStatusBadge } from "@/components/status-badge";
import { DriverFormDialog } from "@/components/driver-form-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Drivers() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | undefined>();
  const [deletingDriver, setDeletingDriver] = useState<Driver | undefined>();

  const { data: drivers, isLoading } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
    refetchInterval: 3000,
  });
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    refetchInterval: 3000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/drivers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: "Driver deleted" });
      setDeletingDriver(undefined);
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const vehicleById = new Map((vehicles ?? []).map((v) => [v.id, v]));

  return (
    <div className="pb-10">
      <PageHeader
        title="Drivers"
        description="Roster, licensing, and vehicle assignment"
        actions={
          <Button
            onClick={() => {
              setEditingDriver(undefined);
              setFormOpen(true);
            }}
            data-testid="button-add-driver"
          >
            <Plus className="h-4 w-4" />
            Add Driver
          </Button>
        }
      />

      <div className="px-6 py-6">
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="table-drivers">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>License</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(drivers ?? []).map((driver) => (
                      <TableRow key={driver.id} data-testid={`row-driver-${driver.id}`}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {driver.licenseNumber}
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{driver.phone}</TableCell>
                        <TableCell>
                          <DriverStatusBadge status={driver.status as any} />
                        </TableCell>
                        <TableCell>
                          {driver.vehicleId ? vehicleById.get(driver.vehicleId)?.name ?? "—" : "Unassigned"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingDriver(driver);
                                setFormOpen(true);
                              }}
                              data-testid={`button-edit-driver-${driver.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingDriver(driver)}
                              data-testid={`button-delete-driver-${driver.id}`}
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

      <DriverFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        driver={editingDriver}
        vehicles={vehicles ?? []}
      />

      <AlertDialog open={!!deletingDriver} onOpenChange={(open) => !open && setDeletingDriver(undefined)}>
        <AlertDialogContent data-testid="dialog-delete-driver-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingDriver?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the driver from the roster.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-driver">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingDriver && deleteMutation.mutate(deletingDriver.id)}
              data-testid="button-confirm-delete-driver"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
