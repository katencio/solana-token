"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createInitializeMint2Instruction,
  createAssociatedTokenAccountIdempotentInstructionWithDerivation,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
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

export function CreateTokenForm({ onSuccess }: { onSuccess?: () => void }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState(9);
  const [initialSupply, setInitialSupply] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.publicKey || !wallet.sendTransaction) {
      setError("Connect your wallet first");
      return;
    }
    const supply = initialSupply.trim() ? Number(initialSupply) : 0;
    if (initialSupply.trim() && (isNaN(supply) || supply < 0)) {
      setError("Invalid initial supply");
      return;
    }
    setError(null);
    setLoading(true);
    setStatus("Preparing transaction…");
    try {
      const mintKeypair = Keypair.generate();
      const mintPubkey = mintKeypair.publicKey;
      const ownerPubkey = wallet.publicKey;

      const lamports = await getMinimumBalanceForRentExemptMint(connection);
      const tx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: ownerPubkey,
          newAccountPubkey: mintPubkey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMint2Instruction(
          mintPubkey,
          decimals,
          ownerPubkey,
          null,
          TOKEN_PROGRAM_ID
        )
      );

      const ata = getAssociatedTokenAddressSync(
        mintPubkey,
        ownerPubkey,
        false,
        TOKEN_PROGRAM_ID
      );
      tx.add(
        createAssociatedTokenAccountIdempotentInstructionWithDerivation(
          ownerPubkey,
          ownerPubkey,
          mintPubkey,
          false,
          TOKEN_PROGRAM_ID
        )
      );

      const rawAmount = BigInt(
        Math.floor((supply || 0) * Math.pow(10, decimals))
      );
      if (rawAmount > BigInt(0)) {
        tx.add(
          createMintToInstruction(
            mintPubkey,
            ata,
            ownerPubkey,
            rawAmount,
            [],
            TOKEN_PROGRAM_ID
          )
        );
      }

      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = ownerPubkey;
      tx.partialSign(mintKeypair);

      setStatus("Open your wallet and approve the transaction (do not close the popup).");
      const sig = await wallet.sendTransaction(tx, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 3,
      });
      await connection.confirmTransaction(sig, "confirmed");

      setStatus("Saving token to database…");
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mintAddress: mintPubkey.toBase58(),
          ownerAddress: ownerPubkey.toBase58(),
          name: name.trim() || "Unnamed",
          symbol: symbol.trim() || "TKN",
          decimals,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save token");
      }
      setOpen(false);
      setName("");
      setSymbol("");
      setInitialSupply("");
      onSuccess?.();
    } catch (err) {
      let message = "Something went wrong";
      if (err instanceof Error) {
        message = err.message;
        const cause = err.cause;
        if (cause instanceof Error && cause.message) {
          message = cause.message;
        }
        const errAny = err as { logs?: string[] };
        if (Array.isArray(errAny.logs) && errAny.logs.length > 0) {
          const last = errAny.logs[errAny.logs.length - 1];
          if (last && typeof last === "string" && last.toLowerCase().includes("error")) {
            message = last;
          }
        }
      }
      const isPluginClosed = /plugin closed|user rejected|request rejected/i.test(message);
      setError(
        isPluginClosed
          ? "The wallet window was closed or the request was rejected. Please try again and approve the transaction in your wallet (do not close the popup)."
          : message
      );
    } finally {
      setLoading(false);
      setStatus(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!wallet.publicKey}>Create Token</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create SPL Token</DialogTitle>
          <DialogDescription>
            Create a new token on Solana. You will be the mint authority.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Token"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="MTK"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="decimals">Decimals</Label>
            <Input
              id="decimals"
              type="number"
              min={0}
              max={9}
              value={decimals}
              onChange={(e) => setDecimals(Number(e.target.value) || 0)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="supply">Initial supply (optional)</Label>
            <Input
              id="supply"
              type="text"
              inputMode="decimal"
              value={initialSupply}
              onChange={(e) => setInitialSupply(e.target.value)}
              placeholder="1000000"
            />
          </div>
          {status && (
            <p className="text-sm text-muted-foreground">{status}</p>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create token"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
