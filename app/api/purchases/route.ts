import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Token from "@/models/Token";
import PendingPurchase from "@/models/PendingPurchase";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    if (!owner) {
      return NextResponse.json(
        { error: "Missing owner query" },
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
