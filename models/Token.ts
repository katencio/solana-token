import mongoose from "mongoose";

export interface IToken {
  _id?: mongoose.Types.ObjectId;
  mintAddress: string;
  ownerAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  /** Price in lamports (1 SOL = 1e9 lamports). Optional; when set, buyers can purchase. */
  priceLamports?: number;
  createdAt?: Date;
}

const TokenSchema = new mongoose.Schema<IToken>(
  {
    mintAddress: { type: String, required: true, unique: true },
    ownerAddress: { type: String, required: true },
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    decimals: { type: Number, required: true },
    priceLamports: { type: Number, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

TokenSchema.index({ ownerAddress: 1 });

export default mongoose.models.Token ?? mongoose.model<IToken>("Token", TokenSchema);
