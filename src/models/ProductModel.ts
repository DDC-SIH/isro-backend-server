import mongoose, { Schema, Document, Types } from "mongoose";

export interface ProductType extends Document {
  productId: string;
  cogs: [Types.ObjectId];
  satelliteId: string;
  processingLevel: string;
  isVisible?: boolean;
}

const ProductSchema: Schema<ProductType> = new Schema(
  {
    productId: { type: String, required: true },
    satelliteId: { type: String, required: true },
    processingLevel: { type: String, required: true },
    cogs: {
      type: [Schema.Types.ObjectId],
      ref: "COG",
      default: [],
    },
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ProductType>("Product", ProductSchema);
