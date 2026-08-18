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
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground" data-testid="text-page-title">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground" data-testid="text-page-description">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
