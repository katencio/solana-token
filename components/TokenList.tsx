"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenMintDialog } from "./TokenMintDialog";
import { TokenTransferDialog } from "./TokenTransferDialog";
import { SetPriceDialog } from "./SetPriceDialog";
import { BuyTokenDialog } from "./BuyTokenDialog";

export interface TokenRecord {
  _id: string;
  mintAddress: string;
  ownerAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  priceLamports?: number | null;
  createdAt: string;
}

export function TokenList() {
  const { publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const currentPublicKey = mounted ? (publicKey?.toBase58() ?? null) : null;
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTokens = useCallback(async () => {
    try {
      const url = currentPublicKey
        ? `/api/tokens?owner=${encodeURIComponent(currentPublicKey)}`
        : "/api/tokens";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTokens(Array.isArray(data) ? data : []);
      }
    } catch {
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [currentPublicKey]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  useEffect(() => {
    const handler = () => fetchTokens();
    window.addEventListener("token-list-refresh", handler);
    return () => window.removeEventListener("token-list-refresh", handler);
  }, [fetchTokens]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading tokens…
        </CardContent>
      </Card>
    );
  }

  if (tokens.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No tokens yet. Create one to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tokens</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Mint address</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Price (SOL)</TableHead>
              {currentPublicKey && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((t) => (
              <TableRow key={t._id}>
                <TableCell>{t.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{t.symbol}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs max-w-[180px] truncate" title={t.mintAddress}>
                  {t.mintAddress}
                </TableCell>
                <TableCell className="font-mono text-xs max-w-[140px] truncate" title={t.ownerAddress}>
                  {t.ownerAddress}
                </TableCell>
                <TableCell>
                  {t.priceLamports != null && t.priceLamports > 0
                    ? (t.priceLamports / 1e9).toFixed(9)
                    : "—"}
                </TableCell>
                {currentPublicKey && (
                  <TableCell className="text-right">
                    {t.ownerAddress === currentPublicKey ? (
                      <span className="flex flex-wrap gap-2 justify-end">
                        <SetPriceDialog
                          mintAddress={t.mintAddress}
                          currentPriceLamports={t.priceLamports ?? null}
                          onSuccess={fetchTokens}
                        />
                        <TokenMintDialog
                          mintAddress={t.mintAddress}
                          decimals={t.decimals}
                          onSuccess={fetchTokens}
                        />
                        <TokenTransferDialog
                          mintAddress={t.mintAddress}
                          decimals={t.decimals}
                          onSuccess={fetchTokens}
                        />
                      </span>
                    ) : (
                      <>
                        {t.priceLamports != null && t.priceLamports > 0 ? (
                          <BuyTokenDialog
                            mintAddress={t.mintAddress}
                            symbol={t.symbol}
                            decimals={t.decimals}
                            priceLamports={t.priceLamports}
                            ownerAddress={t.ownerAddress}
                            onSuccess={fetchTokens}
                          />
                        ) : (
                          "—"
                        )}
                      </>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
