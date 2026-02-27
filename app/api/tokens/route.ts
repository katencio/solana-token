import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Token from "@/models/Token";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const filter = owner ? { ownerAddress: owner } : {};
    const tokens = await Token.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json(tokens);
  } catch (error) {
    console.error("GET /api/tokens:", error);
    return NextResponse.json(
      { error: "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { mintAddress, ownerAddress, name, symbol, decimals } = body;

    if (!mintAddress || !ownerAddress || name == null || symbol == null || decimals == null) {
      return NextResponse.json(
        { error: "Missing required fields: mintAddress, ownerAddress, name, symbol, decimals" },
        { status: 400 }
      );
    }

    const token = await Token.create({
      mintAddress: String(mintAddress).trim(),
      ownerAddress: String(ownerAddress).trim(),
      name: String(name).trim(),
      symbol: String(symbol).trim(),
      decimals: Number(decimals),
    });

    return NextResponse.json(token.toObject());
  } catch (error) {
    console.error("POST /api/tokens:", error);
    const err = error as { code?: number };
    if (err.code === 11000) {
      return NextResponse.json(
        { error: "Token with this mint address already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }
}
