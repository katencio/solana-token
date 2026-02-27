"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TokenTransferDialog } from "./TokenTransferDialog";

interface PendingPurchaseRecord {
  _id: string;
  mintAddress: string;
  buyerAddress: string;
  quantity: number;
  amountLamports: number;
  signature: string;
  status: string;
  decimals: number;
  symbol: string;
  createdAt?: string;
}

export function PendingDeliveries() {
  const { publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState<PendingPurchaseRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchPending = useCallback(async () => {
    if (!mounted || !publicKey) {
      setPending([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/purchases?owner=${encodeURIComponent(publicKey.toBase58())}`
      );
      if (res.ok) {
        const data = await res.json();
        setPending(Array.isArray(data) ? data : []);
      }
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [mounted, publicKey]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  useEffect(() => {
    const handler = () => fetchPending();
    window.addEventListener("token-list-refresh", handler);
    return () => window.removeEventListener("token-list-refresh", handler);
  }, [fetchPending]);

  async function markCompleted(id: string) {
    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          ownerAddress: publicKey?.toBase58(),
        }),
      });
      if (res.ok) {
        fetchPending();
        window.dispatchEvent(new Event("token-list-refresh"));
      }
    } catch {
      // ignore
    }
  }

  if (!mounted || !publicKey || pending.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending deliveries</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((p) => (
              <li
                key={p._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <span>
                  Send <strong>{p.quantity}</strong> {p.symbol || "tokens"} to{" "}
                  <span className="font-mono text-xs">
                    {p.buyerAddress.slice(0, 4)}…{p.buyerAddress.slice(-4)}
                  </span>
                  {" "}({(p.amountLamports / 1e9).toFixed(9)} SOL received)
                </span>
                <span className="flex gap-2">
                  <TokenTransferDialog
                    mintAddress={p.mintAddress}
                    decimals={p.decimals}
                    initialDestination={p.buyerAddress}
                    initialAmount={String(p.quantity)}
                    triggerLabel="Send tokens"
                    onSuccess={() => markCompleted(p._id)}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
