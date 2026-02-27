"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface TokenBalanceRow {
  mint: string;
  symbol: string | null;
  name: string | null;
  decimals: number;
  balance: string;
  rawAmount: string;
}

export function WalletTokenBalances() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [solBalance, setSolBalance] = useState<string | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalanceRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectivePublicKey = mounted ? publicKey : null;

  const fetchBalances = useCallback(async () => {
    if (!effectivePublicKey) {
      setSolBalance(null);
      setTokenBalances([]);
      return;
    }
    setLoading(true);
    try {
      const [lamports, tokenAccounts] = await Promise.all([
        connection.getBalance(effectivePublicKey),
        connection.getParsedTokenAccountsByOwner(effectivePublicKey, {
          programId: TOKEN_PROGRAM_ID,
        }),
      ]);
      const sol = (lamports / 1e9).toFixed(9);
      setSolBalance(sol);

      const rows: TokenBalanceRow[] = tokenAccounts.value.map(({ account }) => {
        const data = account.data;
        if (data.parsed?.info == null) {
          return {
            mint: "unknown",
            symbol: null,
            name: null,
            decimals: 0,
            balance: "0",
            rawAmount: "0",
          };
        }
        const info = data.parsed.info as {
          mint: string;
          tokenAmount: { decimals: number; uiAmountString: string; amount: string };
        };
        return {
          mint: info.mint,
          symbol: null,
          name: null,
          decimals: info.tokenAmount.decimals,
          balance: info.tokenAmount.uiAmountString ?? "0",
          rawAmount: info.tokenAmount.amount ?? "0",
        };
      });

      // Enrich with name/symbol from API when available
      try {
        const res = await fetch("/api/tokens");
        if (res.ok) {
          const tokens = (await res.json()) as Array<{
            mintAddress: string;
            name: string;
            symbol: string;
          }>;
          const byMint = new Map(
            tokens.map((t) => [t.mintAddress, { name: t.name, symbol: t.symbol }])
          );
          rows.forEach((r) => {
            const meta = byMint.get(r.mint);
            if (meta) {
              r.name = meta.name;
              r.symbol = meta.symbol;
            }
          });
        }
      } catch {
        // ignore API failure for metadata
      }

      setTokenBalances(rows);
    } catch {
      setSolBalance(null);
      setTokenBalances([]);
    } finally {
      setLoading(false);
    }
  }, [connection, effectivePublicKey]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  useEffect(() => {
    const handler = () => fetchBalances();
    window.addEventListener("token-list-refresh", handler);
    return () => window.removeEventListener("token-list-refresh", handler);
  }, [fetchBalances]);

  if (!effectivePublicKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connect your wallet to see token balances.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading && tokenBalances.length === 0 && solBalance === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balances</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading balances…
        </CardContent>
      </Card>
    );
  }

  const hasTokens = tokenBalances.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Balances</CardTitle>
        <Badge variant="secondary" className="font-mono text-xs">
          {effectivePublicKey.toBase58().slice(0, 4)}…{effectivePublicKey.toBase58().slice(-4)}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">SOL</span>
            <span className="font-mono tabular-nums">
              {solBalance ?? "—"}
            </span>
          </div>
          {hasTokens && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Mint</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokenBalances.map((row) => (
                  <TableRow key={row.mint}>
                    <TableCell>
                      {row.symbol ? (
                        <Badge variant="secondary">{row.symbol}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {row.name && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          {row.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className="max-w-[160px] truncate font-mono text-xs text-muted-foreground"
                      title={row.mint}
                    >
                      {row.mint.slice(0, 4)}…{row.mint.slice(-4)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.balance}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!hasTokens && (
            <p className="text-sm text-muted-foreground">
              No SPL tokens in this wallet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
