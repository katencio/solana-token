import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PendingPurchase from "@/models/PendingPurchase";
import Token from "@/models/Token";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { status, ownerAddress } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing purchase id" },
        { status: 400 }
      );
    }

    const purchase = await PendingPurchase.findById(id);
    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    const token = await Token.findOne({ mintAddress: purchase.mintAddress });
    if (token && ownerAddress && token.ownerAddress !== String(ownerAddress).trim()) {
      return NextResponse.json(
        { error: "Only the token owner can complete this delivery" },
        { status: 403 }
      );
    }

    if (status === "completed") {
      await PendingPurchase.findByIdAndUpdate(id, { $set: { status: "completed" } });
    }

    const updated = await PendingPurchase.findById(id).lean();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/purchases/[id]:", error);
    return NextResponse.json(
      { error: "Failed to update purchase" },
      { status: 500 }
    );
  }
}
