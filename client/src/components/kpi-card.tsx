import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent = "text-primary",
  testId,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: string;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent", accent)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p
            className="text-lg font-bold tabular-nums leading-tight text-foreground"
            data-testid={`${testId}-value`}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
