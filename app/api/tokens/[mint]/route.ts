import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Token from "@/models/Token";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  try {
    await connectDB();
    const { mint } = await params;
    const body = await request.json();
    const { priceLamports, ownerAddress } = body;

    if (!mint?.trim()) {
      return NextResponse.json(
        { error: "Missing mint address" },
        { status: 400 }
      );
    }

    const token = await Token.findOne({ mintAddress: mint.trim() });
    if (!token) {
      return NextResponse.json(
        { error: "Token not found" },
        { status: 404 }
      );
    }

    if (ownerAddress && token.ownerAddress !== String(ownerAddress).trim()) {
      return NextResponse.json(
        { error: "Only the token owner can update the price" },
        { status: 403 }
      );
    }

    const update: { priceLamports?: number | null } = {};
    if (typeof priceLamports === "number" && priceLamports >= 0) {
      update.priceLamports = priceLamports;
    } else if (priceLamports === null || priceLamports === undefined) {
      update.priceLamports = null;
    }

    const updated = await Token.findOneAndUpdate(
      { mintAddress: mint.trim() },
      { $set: update },
      { new: true }
    ).lean();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/tokens/[mint]:", error);
    return NextResponse.json(
      { error: "Failed to update token" },
      { status: 500 }
    );
  }
}
