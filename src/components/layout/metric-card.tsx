import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly icon: ReactNode;
  readonly tone?: "default" | "positive" | "warning" | "danger";
}

const TONE_CLASS: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "bg-secondary text-secondary-foreground",
  positive: "bg-chart-2/15 text-chart-2",
  warning: "bg-chart-4/20 text-chart-4",
  danger: "bg-destructive/10 text-destructive",
};

export function MetricCard({ label, value, hint, icon, tone = "default" }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {label}
          </p>
          <p className="text-foreground mt-2 truncate text-2xl font-semibold">{value}</p>
          {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
        </div>
        <span className={cn("flex size-10 items-center justify-center rounded-lg", TONE_CLASS[tone])}>
          {icon}
        </span>
      </CardContent>
    </Card>
  );
}
