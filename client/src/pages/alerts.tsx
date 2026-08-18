import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2 } from "lucide-react";
import type { Alert, Vehicle } from "@shared/schema";
import { SeverityBadge } from "@/components/status-badge";
import { alertTypeLabel, timeAgo } from "@/lib/status";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Alerts() {
  const { toast } = useToast();
  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: 3000,
  });
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    refetchInterval: 3000,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/alerts/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Alert resolved" });
    },
    onError: (err: Error) => {
      toast({ title: "Could not resolve alert", description: err.message, variant: "destructive" });
    },
  });

  const vehicleById = new Map((vehicles ?? []).map((v) => [v.id, v]));

  const sorted = [...(alerts ?? [])].sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const openCount = alerts?.filter((a) => !a.resolved).length ?? 0;

  return (
    <div className="pb-10">
      <PageHeader
        title="Alerts"
        description="Maintenance, fuel, and speed alerts across the fleet"
        actions={
          <Badge variant="outline" data-testid="badge-open-alerts-total">
            {openCount} open
          </Badge>
        }
      />

      <div className="space-y-3 px-6 py-6">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alerts recorded.</p>
        ) : (
          sorted.map((alert) => (
            <Card key={alert.id} data-testid={`card-alert-${alert.id}`}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium leading-snug">{alert.message}</p>
                      {alert.resolved && (
                        <Badge variant="secondary" className="gap-1" data-testid={`badge-resolved-${alert.id}`}>
                          <CheckCircle2 className="h-3 w-3" /> Resolved
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {vehicleById.get(alert.vehicleId)?.name ?? "Unknown vehicle"} (
                      {vehicleById.get(alert.vehicleId)?.plate ?? "—"}) · {alertTypeLabel[alert.type]} ·{" "}
                      {timeAgo(alert.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={alert.severity as any} />
                  {!alert.resolved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveMutation.mutate(alert.id)}
                      disabled={resolveMutation.isPending}
                      data-testid={`button-resolve-alert-${alert.id}`}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
