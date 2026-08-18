import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-6 py-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground" data-testid="text-page-title">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground" data-testid="text-page-description">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
