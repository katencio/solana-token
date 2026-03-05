"use client";

import { WalletProvider } from "./WalletProvider";
import { GlobalProvider } from "@/contexts/GlobalContext";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <GlobalProvider>{children}</GlobalProvider>
    </WalletProvider>
  );
}
