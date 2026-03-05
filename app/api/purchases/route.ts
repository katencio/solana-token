import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Token from "@/models/Token";
import PendingPurchase from "@/models/PendingPurchase";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const buyer = searchParams.get("buyer");
    
    // Si se especifica buyer, devolver todas las compras del comprador (pending + completed)
    if (buyer) {
      const buyerPurchases = await PendingPurchase.find({
        buyerAddress: buyer,
        status: { $in: ["pending", "completed"] },
      })
        .sort({ createdAt: -1 })
        .lean();

      const mints = [...new Set(buyerPurchases.map((p) => p.mintAddress))];
      const tokens = await Token.find({ mintAddress: { $in: mints } }).lean();
      const tokenMap = new Map(tokens.map((t) => [t.mintAddress, t]));

      const purchasesWithToken = buyerPurchases.map((p) => {
        const t = tokenMap.get(p.mintAddress);
        return {
          ...p,
          decimals: t?.decimals ?? 0,
          symbol: t?.symbol ?? "",
          name: t?.name ?? "",
        };
      });

      return NextResponse.json(purchasesWithToken);
    }
    
    // Comportamiento original: compras pendientes para el owner
    if (!owner) {
      return NextResponse.json(
        { error: "Missing owner or buyer query" },
        { status: 400 }
      );
    }
    const tokens = await Token.find({ ownerAddress: owner }).lean();
    const mints = tokens.map((t) => t.mintAddress);
    const tokenMap = new Map(tokens.map((t) => [t.mintAddress, t]));
    const pending = await PendingPurchase.find({
      mintAddress: { $in: mints },
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .lean();
    const pendingWithToken = pending.map((p) => {
      const t = tokenMap.get(p.mintAddress);
      return {
        ...p,
        decimals: t?.decimals ?? 0,
        symbol: t?.symbol ?? "",
      };
    });
    return NextResponse.json(pendingWithToken);
  } catch (error) {
    console.error("GET /api/purchases:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchases" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { mintAddress, buyerAddress, quantity, amountLamports, signature } = body;
    if (!mintAddress || !buyerAddress || quantity == null || amountLamports == null || !signature) {
      return NextResponse.json(
        { error: "Missing required fields: mintAddress, buyerAddress, quantity, amountLamports, signature" },
        { status: 400 }
      );
    }
    const purchase = await PendingPurchase.create({
      mintAddress: String(mintAddress).trim(),
      buyerAddress: String(buyerAddress).trim(),
      quantity: Number(quantity),
      amountLamports: Number(amountLamports),
      signature: String(signature).trim(),
      status: "pending",
    });
    return NextResponse.json(purchase.toObject());
  } catch (error) {
    console.error("POST /api/purchases:", error);
    return NextResponse.json(
      { error: "Failed to create purchase" },
      { status: 500 }
    );
  }
}
