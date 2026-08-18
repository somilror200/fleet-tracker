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
  plate: z.string().trim().min(1, "Plate is required"),
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(["truck", "van", "car"]),
  status: z.enum(["active", "idle", "maintenance"]),
  driverId: z.number().nullable(),
  mileageKm: z.number().min(0),
  fuelPercent: z.number().min(0).max(100),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(359.9),
  speedKmh: z.number().min(0),
});
type FormValues = z.infer<typeof formSchema>;

export function VehicleFormDialog({
  open,
  onOpenChange,
  vehicle,
  drivers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Vehicle;
  drivers: Driver[];
}) {
  const { toast } = useToast();
  const isEdit = !!vehicle;
  const selectableDrivers = drivers.filter(
    (driver) => driver.status === "available" || driver.id === vehicle?.driverId,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      plate: vehicle?.plate ?? "",
      name: vehicle?.name ?? "",
      type: vehicle?.type ?? "truck",
      status: vehicle?.status ?? "idle",
      driverId: vehicle?.driverId ?? null,
      mileageKm: vehicle?.mileageKm ?? 0,
      fuelPercent: vehicle?.fuelPercent ?? 100,
      lat: vehicle?.lat ?? -37.8136,
      lng: vehicle?.lng ?? 144.9631,
      heading: vehicle?.heading ?? 0,
      speedKmh: vehicle?.speedKmh ?? 0,
    },
  });

  useEffect(() => {
    form.reset({
      plate: vehicle?.plate ?? "",
      name: vehicle?.name ?? "",
      type: vehicle?.type ?? "truck",
      status: vehicle?.status ?? "idle",
      driverId: vehicle?.driverId ?? null,
      mileageKm: vehicle?.mileageKm ?? 0,
      fuelPercent: vehicle?.fuelPercent ?? 100,
      lat: vehicle?.lat ?? -37.8136,
      lng: vehicle?.lng ?? 144.9631,
      heading: vehicle?.heading ?? 0,
      speedKmh: vehicle?.speedKmh ?? 0,
    });
  }, [vehicle, open, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit) return apiRequest("PATCH", `/api/vehicles/${vehicle!.id}`, values);
      return apiRequest("POST", "/api/vehicles", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: isEdit ? "Vehicle updated" : "Vehicle added" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Something went wrong", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" data-testid="dialog-vehicle-form">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plate</FormLabel>
                    <FormControl><Input placeholder="VIC-4821" {...field} data-testid="input-vehicle-plate" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="Freightliner 04" {...field} data-testid="input-vehicle-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-vehicle-type"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="truck">Truck</SelectItem>
                        <SelectItem value="van">Van</SelectItem>
                        <SelectItem value="car">Car</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-vehicle-status"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {vehicle?.status === "active" && <SelectItem value="active">Active</SelectItem>}
                        <SelectItem value="idle">Idle</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Driver</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                    value={field.value ? String(field.value) : "none"}
                  >
                    <FormControl><SelectTrigger data-testid="select-vehicle-driver"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {selectableDrivers.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}{d.status !== "available" ? " (current)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="mileageKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mileage (km)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.1" {...field} onChange={(e) => field.onChange(Number(e.target.value))} data-testid="input-vehicle-mileage" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fuelPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuel (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} step="0.1" {...field} onChange={(e) => field.onChange(Number(e.target.value))} data-testid="input-vehicle-fuel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-vehicle">Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-vehicle">
                {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Vehicle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
