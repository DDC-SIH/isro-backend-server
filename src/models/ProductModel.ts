import mongoose, { Schema, Document, Types } from "mongoose";

export interface ProductType extends Document {
  productId: string;
  description?: string;
  satellite: Types.ObjectId;
  dataStatus: boolean;
  aquisition_datetime: number;
  processingLevel: string;
  version: string;
  revision: string;
  resolution?: string;
  cogs: [Types.ObjectId];
  satelliteId: string;
}

const ProductSchema: Schema<ProductType> = new Schema(
  {
    productId: { type: String, required: true },
    description: { type: String, required: false, defaault: "" },
    satellite: {
      type: Schema.Types.ObjectId,
      ref: "Satellite",
      required: true,
    },
    dataStatus: { type: Boolean, required: true, default: true },
    aquisition_datetime: { type: Number, required: true },
    processingLevel: { type: String, required: true },
    satelliteId: { type: String, required: true },
    version: { type: String, required: false },
    revision: { type: String, required: false },
    resolution: { type: String, required: false },
    cogs: {
      type: [Schema.Types.ObjectId],
      ref: "COG",
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model<ProductType>("Product", ProductSchema);
