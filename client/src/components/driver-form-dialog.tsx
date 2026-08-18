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
import type { Driver, Vehicle } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  licenseNumber: z.string().trim().min(1, "License number is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  status: z.enum(["available", "on_trip", "off_duty"]),
  vehicleId: z.number().nullable(),
});
type FormValues = z.infer<typeof formSchema>;

export function DriverFormDialog({
  open,
  onOpenChange,
  driver,
  vehicles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: Driver;
  vehicles: Vehicle[];
}) {
  const { toast } = useToast();
  const isEdit = !!driver;
  const selectableVehicles = vehicles.filter(
    (vehicle) => vehicle.status === "idle" || vehicle.id === driver?.vehicleId,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: driver?.name ?? "",
      licenseNumber: driver?.licenseNumber ?? "",
      phone: driver?.phone ?? "",
      status: driver?.status ?? "available",
      vehicleId: driver?.vehicleId ?? null,
    },
  });

  useEffect(() => {
    form.reset({
      name: driver?.name ?? "",
      licenseNumber: driver?.licenseNumber ?? "",
      phone: driver?.phone ?? "",
      status: driver?.status ?? "available",
      vehicleId: driver?.vehicleId ?? null,
    });
  }, [driver, open, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit) return apiRequest("PATCH", `/api/drivers/${driver!.id}`, values);
      return apiRequest("POST", "/api/drivers", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: isEdit ? "Driver updated" : "Driver added" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Something went wrong", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" data-testid="dialog-driver-form">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Driver" : "Add Driver"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="Liam Carter" {...field} data-testid="input-driver-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License No.</FormLabel>
                    <FormControl><Input placeholder="VIC-HR-88231" {...field} data-testid="input-driver-license" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="0412 334 221" {...field} data-testid="input-driver-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-driver-status"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      {driver?.status === "on_trip" && <SelectItem value="on_trip">On Trip</SelectItem>}
                      <SelectItem value="off_duty">Off Duty</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Vehicle</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                    value={field.value ? String(field.value) : "none"}
                  >
                    <FormControl><SelectTrigger data-testid="select-driver-vehicle"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {selectableVehicles.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.name} ({v.plate}){v.status !== "idle" ? " · current" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-driver">Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-driver">
                {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Driver"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
