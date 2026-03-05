import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "outline" | "destructive";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          default:
            "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
          secondary:
            "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
          outline: "text-foreground",
          destructive:
            "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        }[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
