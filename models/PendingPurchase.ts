import mongoose from "mongoose";

export interface IPendingPurchase {
  _id?: mongoose.Types.ObjectId;
  mintAddress: string;
  buyerAddress: string;
  /** Quantity in human units (e.g. 10 tokens with decimals) */
  quantity: number;
  amountLamports: number;
  signature: string;
  status: "pending" | "completed";
  createdAt?: Date;
}

const PendingPurchaseSchema = new mongoose.Schema<IPendingPurchase>(
  {
    mintAddress: { type: String, required: true },
    buyerAddress: { type: String, required: true },
    quantity: { type: Number, required: true },
    amountLamports: { type: Number, required: true },
    signature: { type: String, required: true },
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PendingPurchaseSchema.index({ mintAddress: 1, status: 1 });
PendingPurchaseSchema.index({ buyerAddress: 1 });

export default mongoose.models.PendingPurchase ??
  mongoose.model<IPendingPurchase>("PendingPurchase", PendingPurchaseSchema);
