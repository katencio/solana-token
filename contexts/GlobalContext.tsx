"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";

const STORAGE_KEY = "solana-wallet-address";

export interface UserState {
  publicKey: string | null;
  connected: boolean;
}

const defaultUser: UserState = { publicKey: null, connected: false };

const GlobalContext = createContext<{
  user: UserState;
  setUser: (u: UserState) => void;
}>({ user: defaultUser, setUser: () => {} });

export function useGlobalContext() {
  const ctx = useContext(GlobalContext);
  if (!ctx) throw new Error("useGlobalContext must be used within GlobalProvider");
  return ctx;
}

export function GlobalProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected } = useWallet();
  const [user, setUser] = useState<UserState>(defaultUser);

  const publicKeyStr = publicKey?.toBase58() ?? null;

  useEffect(() => {
    setUser({ publicKey: publicKeyStr, connected });
  }, [publicKeyStr, connected]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (connected && publicKeyStr) {
      try {
        window.localStorage.setItem(STORAGE_KEY, publicKeyStr);
      } catch {}
    } else if (!connected) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }, [connected, publicKeyStr]);

  const setUserOverride = useCallback((u: UserState) => setUser(u), []);

  const value = useMemo(
    () => ({ user, setUser: setUserOverride }),
    [user, setUserOverride]
  );

  return (
    <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
  );
}

export function getStoredWalletAddress(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
