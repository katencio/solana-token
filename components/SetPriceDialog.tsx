"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LAMPS_PER_SOL = 1e9;

export function SetPriceDialog({
  mintAddress,
  currentPriceLamports,
  onSuccess,
}: {
  mintAddress: string;
  currentPriceLamports?: number | null;
  onSuccess?: () => void;
}) {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [solInput, setSolInput] = useState(
    currentPriceLamports != null ? String(currentPriceLamports / LAMPS_PER_SOL) : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSolInput(
        currentPriceLamports != null && currentPriceLamports > 0
          ? String(currentPriceLamports / LAMPS_PER_SOL)
          : ""
      );
    }
  }, [open, currentPriceLamports]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.publicKey) {
      setError("Connect your wallet");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const sol = solInput.trim() ? Number(solInput.trim()) : null;
      let priceLamports: number | null = null;
      if (sol != null && (!Number.isFinite(sol) || sol < 0)) {
        setError("Enter a valid SOL amount (e.g. 0.1)");
        setLoading(false);
        return;
      }
      if (sol != null && sol > 0) {
        priceLamports = Math.floor(sol * LAMPS_PER_SOL);
      }

      const res = await fetch(`/api/tokens/${encodeURIComponent(mintAddress)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceLamports,
          ownerAddress: wallet.publicKey.toBase58(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update price");
      }
      setOpen(false);
      setSolInput(priceLamports != null ? String(priceLamports / LAMPS_PER_SOL) : "");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update price");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!wallet.publicKey}>
          {currentPriceLamports != null && currentPriceLamports > 0
            ? "Change price"
            : "Set price"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Price in SOL</DialogTitle>
          <DialogDescription>
            Set the price in SOL (lamports) per token unit. Buyers will pay this amount per token.
            Leave empty or 0 to remove the price and disable buying.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="price-sol">Price per token (SOL)</Label>
            <Input
              id="price-sol"
              type="text"
              inputMode="decimal"
              value={solInput}
              onChange={(e) => setSolInput(e.target.value)}
              placeholder="0.01"
            />
            {currentPriceLamports != null && currentPriceLamports > 0 && (
              <p className="text-xs text-muted-foreground">
                Current: {currentPriceLamports / LAMPS_PER_SOL} SOL
              </p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save price"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
