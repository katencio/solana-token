"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
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

interface PurchasedToken {
  _id: string;
  mintAddress: string;
  buyerAddress: string;
  quantity: number;
  amountLamports: number;
  signature: string;
  status: string;
  createdAt: string;
  decimals: number;
  symbol: string;
  name: string;
}

interface TokenBalance {
  mint: string;
  balance: string;
  rawAmount: string;
}

const LAMPS_PER_SOL = 1e9;

export function PurchasedTokens() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [purchasedTokens, setPurchasedTokens] = useState<PurchasedToken[]>([]);
  const [tokenBalances, setTokenBalances] = useState<Map<string, TokenBalance>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectivePublicKey = mounted ? publicKey : null;

  const fetchPurchasedTokens = useCallback(async () => {
    if (!effectivePublicKey) {
      setPurchasedTokens([]);
      setTokenBalances(new Map());
      return;
    }

    setLoading(true);
    try {
      // Obtener compras del usuario (pendientes y completadas)
      const res = await fetch(`/api/purchases?buyer=${encodeURIComponent(effectivePublicKey.toBase58())}`);
      if (!res.ok) {
        throw new Error("Failed to fetch purchased tokens");
      }
      const purchases = (await res.json()) as PurchasedToken[];
      setPurchasedTokens(purchases);

      // Obtener balances actuales de los tokens comprados
      const balanceMap = new Map<string, TokenBalance>();
      
      for (const purchase of purchases) {
        try {
          const mintPubkey = new PublicKey(purchase.mintAddress);
          const ata = getAssociatedTokenAddressSync(
            mintPubkey,
            effectivePublicKey,
            false,
            TOKEN_PROGRAM_ID
          );
          
          const accountInfo = await connection.getTokenAccountBalance(ata);
          if (accountInfo.value) {
            balanceMap.set(purchase.mintAddress, {
              mint: purchase.mintAddress,
              balance: accountInfo.value.uiAmountString ?? "0",
              rawAmount: accountInfo.value.amount ?? "0",
            });
          } else {
            balanceMap.set(purchase.mintAddress, {
              mint: purchase.mintAddress,
              balance: "0",
              rawAmount: "0",
            });
          }
        } catch {
          // Si no existe la cuenta de token, el balance es 0
          balanceMap.set(purchase.mintAddress, {
            mint: purchase.mintAddress,
            balance: "0",
            rawAmount: "0",
          });
        }
      }

      setTokenBalances(balanceMap);
    } catch (error) {
      console.error("Error fetching purchased tokens:", error);
      setPurchasedTokens([]);
      setTokenBalances(new Map());
    } finally {
      setLoading(false);
    }
  }, [connection, effectivePublicKey]);

  useEffect(() => {
    fetchPurchasedTokens();
  }, [fetchPurchasedTokens]);

  useEffect(() => {
    const handler = () => fetchPurchasedTokens();
    window.addEventListener("token-list-refresh", handler);
    return () => window.removeEventListener("token-list-refresh", handler);
  }, [fetchPurchasedTokens]);

  if (!effectivePublicKey) {
    return null;
  }

  if (loading && purchasedTokens.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tokens Comprados</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          Cargando tokens comprados…
        </CardContent>
      </Card>
    );
  }

  if (purchasedTokens.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tokens Comprados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No has comprado tokens aún. Los tokens que compres pagando en SOL aparecerán aquí.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Agrupar compras por mintAddress para mostrar el total comprado y el balance actual
  const groupedPurchases = new Map<string, {
    token: PurchasedToken;
    totalQuantity: number;
    totalPaidSol: number;
    balance: TokenBalance | null;
    hasPending: boolean;
  }>();

  purchasedTokens.forEach((purchase) => {
    const existing = groupedPurchases.get(purchase.mintAddress);
    const paidSol = purchase.amountLamports / LAMPS_PER_SOL;
    const balance = tokenBalances.get(purchase.mintAddress) || null;

    if (existing) {
      existing.totalQuantity += purchase.quantity;
      existing.totalPaidSol += paidSol;
      if (purchase.status === "pending") existing.hasPending = true;
    } else {
      groupedPurchases.set(purchase.mintAddress, {
        token: purchase,
        totalQuantity: purchase.quantity,
        totalPaidSol: paidSol,
        balance,
        hasPending: purchase.status === "pending",
      });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tokens Comprados</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Mint Address</TableHead>
              <TableHead className="text-right">Cantidad Comprada</TableHead>
              <TableHead className="text-right">Balance Actual</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">SOL Pagado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from(groupedPurchases.values()).map((group) => {
              const { token, totalQuantity, totalPaidSol, balance, hasPending } = group;
              return (
                <TableRow key={token.mintAddress}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {token.symbol && (
                        <Badge variant="secondary">{token.symbol}</Badge>
                      )}
                      {token.name && (
                        <span className="text-sm text-muted-foreground">
                          {token.name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell
                    className="max-w-[160px] truncate font-mono text-xs text-muted-foreground"
                    title={token.mintAddress}
                  >
                    {token.mintAddress.slice(0, 4)}…{token.mintAddress.slice(-4)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {totalQuantity.toLocaleString(undefined, {
                      maximumFractionDigits: token.decimals,
                    })}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {balance ? balance.balance : "0"}
                  </TableCell>
                  <TableCell>
                    {hasPending ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-500">
                        Pendiente de envío
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Entregado</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {totalPaidSol.toFixed(9)} SOL
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground mt-3">
          Si el estado es &quot;Pendiente de envío&quot;, el creador del token debe enviarte los tokens desde su sección &quot;Pending deliveries&quot;. El balance se actualizará cuando recibas los tokens.
        </p>
      </CardContent>
    </Card>
  );
}

