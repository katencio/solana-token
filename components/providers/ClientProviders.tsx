"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const ProvidersWithChildren = dynamic(
  () =>
    import("./Providers").then((mod) => ({
      default: function ProvidersWithChildren({
        children,
      }: {
        children: ReactNode;
      }) {
        return <mod.Providers>{children}</mod.Providers>;
      },
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    ),
  }
);

export function ClientProviders({ children }: { children: ReactNode }) {
  return <ProvidersWithChildren>{children}</ProvidersWithChildren>;
}
