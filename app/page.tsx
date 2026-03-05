"use client";

import { ConnectWallet } from "@/components/ConnectWallet";
import { CreateTokenForm } from "@/components/CreateTokenForm";
import { PendingDeliveries } from "@/components/PendingDeliveries";
import { TokenList } from "@/components/TokenList";
import { WalletTokenBalances } from "@/components/WalletTokenBalances";
import { PurchasedTokens } from "@/components/PurchasedTokens";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-semibold">Solana Token Manager</h1>
          <ConnectWallet />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Your tokens</h2>
          <CreateTokenForm onSuccess={() => window.dispatchEvent(new Event("token-list-refresh"))} />
        </div>
        <div className="mb-8">
          <WalletTokenBalances />
        </div>
        <div className="mb-8">
          <PurchasedTokens />
        </div>
        <div className="mb-8">
          <PendingDeliveries />
        </div>
        <TokenList />
      </main>
    </div>
  );
}
