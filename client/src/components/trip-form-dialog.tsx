import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Vehicle, Driver } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  vehicleId: z.number({ message: "Vehicle is required" }),
  driverId: z.number({ message: "Driver is required" }),
  startLocation: z.string().min(1, "Start location is required"),
  endLocation: z.string().min(1, "End location is required"),
  startTime: z.string(),
  endTime: z.string().nullable(),
  distanceKm: z.number().min(0),
  status: z.enum(["in_progress", "completed"]),
});
type FormValues = z.infer<typeof formSchema>;

const freshDefaults = (): FormValues => ({
  vehicleId: undefined as unknown as number,
  driverId: undefined as unknown as number,
  startLocation: "",
  endLocation: "",
  startTime: new Date().toISOString(),
  endTime: null,
  distanceKm: 0,
  status: "in_progress",
});

export function TripFormDialog({
  open,
  onOpenChange,
  vehicles,
  drivers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  drivers: Driver[];
}) {
  const { toast } = useToast();
  const availableVehicles = vehicles.filter((v) => v.status === "idle");
  const availableDrivers = drivers.filter((d) => d.status === "available");
  const canCreateTrip = availableVehicles.length > 0 && availableDrivers.length > 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: freshDefaults(),
  });

  useEffect(() => {
    if (open) form.reset(freshDefaults());
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => apiRequest("POST", "/api/trips", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: "Trip created", description: "Vehicle marked active and driver on trip." });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Could not create trip", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-trip-form">
        <DialogHeader>
          <DialogTitle>New Trip</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
            {!canCreateTrip && (
              <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                A new trip needs at least one idle vehicle and one available driver.
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      value={field.value ? String(field.value) : ""}
                      disabled={availableVehicles.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-trip-vehicle">
                          <SelectValue placeholder={availableVehicles.length ? "Select vehicle" : "No idle vehicles"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableVehicles.map((v) => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.name} ({v.plate})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      value={field.value ? String(field.value) : ""}
                      disabled={availableDrivers.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-trip-driver">
                          <SelectValue placeholder={availableDrivers.length ? "Select driver" : "No available drivers"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableDrivers.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="startLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Melbourne Freight Terminal" {...field} data-testid="input-trip-start" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Ballarat Distribution Centre" {...field} data-testid="input-trip-end" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="distanceKm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Planned Distance (km)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.1"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      data-testid="input-trip-distance"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-trip">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || !canCreateTrip}
                data-testid="button-submit-trip"
              >
                {mutation.isPending ? "Creating..." : "Create Trip"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
