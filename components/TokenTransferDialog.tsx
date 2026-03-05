"use client";

import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createTransferInstruction,
  createAssociatedTokenAccountIdempotentInstructionWithDerivation,
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

export function TokenTransferDialog({
  mintAddress,
  decimals,
  initialDestination,
  initialAmount,
  triggerLabel,
  onSuccess,
}: {
  mintAddress: string;
  decimals: number;
  initialDestination?: string;
  initialAmount?: string;
  triggerLabel?: string;
  onSuccess?: () => void;
}) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(initialAmount ?? "");
  const [destination, setDestination] = useState(initialDestination ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDestination(initialDestination ?? "");
      setAmount(initialAmount ?? "");
    }
  }, [open, initialDestination, initialAmount]);

  async function handleTransfer(e: React.FormEvent) {
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
      destPubkey = new PublicKey(destination.trim());
    } catch {
      setError("Invalid destination address");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const mint = new PublicKey(mintAddress);
      const sourceAta = getAssociatedTokenAddressSync(
        mint,
        wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID
      );
      const destAta = getAssociatedTokenAddressSync(
        mint,
        destPubkey,
        false,
        TOKEN_PROGRAM_ID
      );
      const rawAmount = BigInt(Math.floor(num * Math.pow(10, decimals)));
      const tx = new Transaction();
      tx.add(
        createAssociatedTokenAccountIdempotentInstructionWithDerivation(
          wallet.publicKey,
          destPubkey,
          mint,
          false,
          TOKEN_PROGRAM_ID
        ),
        createTransferInstruction(
          sourceAta,
          destAta,
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
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!wallet.publicKey}>
          {triggerLabel ?? "Transfer"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer tokens</DialogTitle>
          <DialogDescription>
            Send tokens to another wallet. The destination ATA will be created if needed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleTransfer} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="transfer-amount">Amount</Label>
            <Input
              id="transfer-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="transfer-dest">Destination wallet address</Label>
            <Input
              id="transfer-dest"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Address..."
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Transferring…" : "Transfer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
