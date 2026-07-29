import { Skeleton } from "@/components/ui/skeleton";

export function LoadingGrid({ rows = 4 }: { readonly rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ title, description }: { readonly title: string; readonly description: string }) {
  return (
    <div className="border-border rounded-lg border border-dashed p-10 text-center">
      <p className="text-foreground text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
    </div>
  );
}
