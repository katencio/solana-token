"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
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

export function BuyTokenDialog({
  mintAddress,
  symbol,
  decimals,
  priceLamports,
  ownerAddress,
  onSuccess,
}: {
  mintAddress: string;
  symbol: string;
  decimals: number;
  priceLamports: number;
  ownerAddress: string;
  onSuccess?: () => void;
}) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = quantity.trim() ? Number(quantity) : 0;
  const totalLamports = Number.isFinite(q) && q > 0
    ? Math.floor(priceLamports * q)
    : 0;
  const totalSol = totalLamports / LAMPS_PER_SOL;

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.publicKey || !wallet.sendTransaction) {
      setError("Connect your wallet");
      return;
    }
    if (!Number.isFinite(q) || q <= 0) {
      setError("Enter a valid quantity");
      return;
    }
    if (totalLamports <= 0) {
      setError("Invalid total amount");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const ownerPubkey = new PublicKey(ownerAddress);
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: ownerPubkey,
          lamports: totalLamports,
        })
      );
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;

      const sig = await wallet.sendTransaction(tx, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 3,
      });
      await connection.confirmTransaction(sig, "confirmed");

      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mintAddress,
          buyerAddress: wallet.publicKey.toBase58(),
          quantity: q,
          amountLamports: totalLamports,
          signature: sig,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to record purchase");
      }
      setOpen(false);
      setQuantity("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" disabled={!wallet.publicKey}>
          Buy
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buy {symbol}</DialogTitle>
          <DialogDescription>
            Pay SOL to the token owner. They will receive a notification to send you the tokens.
            Price: {(priceLamports / LAMPS_PER_SOL).toFixed(9)} SOL per token.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleBuy} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="buy-quantity">Quantity</Label>
            <Input
              id="buy-quantity"
              type="text"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="100"
            />
          </div>
          {Number.isFinite(q) && q > 0 && (
            <p className="text-sm text-muted-foreground">
              Total: {totalSol.toFixed(9)} SOL ({totalLamports.toLocaleString()} lamports)
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading || totalLamports <= 0}>
            {loading ? "Paying…" : "Pay with SOL"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
