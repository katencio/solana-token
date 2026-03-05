"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createMintToInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
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

export function TokenMintDialog({
  mintAddress,
  decimals,
  onSuccess,
}: {
  mintAddress: string;
  decimals: number;
  onSuccess?: () => void;
}) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMint(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.publicKey || !wallet.sendTransaction) {
      setError("Connect your wallet");
      return;
    }
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      setError("Enter a valid amount");
      return;
    }
    let destPubkey: PublicKey;
    try {
      destPubkey = new PublicKey(destination.trim() || wallet.publicKey.toBase58());
    } catch {
      setError("Invalid destination address");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const mint = new PublicKey(mintAddress);
      const ata = getAssociatedTokenAddressSync(
        mint,
        destPubkey,
        false,
        TOKEN_PROGRAM_ID
      );
      const rawAmount = BigInt(Math.floor(num * Math.pow(10, decimals)));
      const { Transaction } = await import("@solana/web3.js");
      const tx = new Transaction().add(
        createMintToInstruction(
          mint,
          ata,
          wallet.publicKey,
          rawAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );
      const sig = await wallet.sendTransaction(tx, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
      await connection.confirmTransaction(sig, "confirmed");
      setOpen(false);
      setAmount("");
      setDestination("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mint failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!wallet.publicKey}>
          Mint
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mint tokens</DialogTitle>
          <DialogDescription>
            Mint new tokens to a token account. You must be the mint authority.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleMint} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="mint-amount">Amount</Label>
            <Input
              id="mint-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mint-dest">Destination address (default: your wallet)</Label>
            <Input
              id="mint-dest"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={wallet.publicKey?.toBase58() ?? ""}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Minting…" : "Mint"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
