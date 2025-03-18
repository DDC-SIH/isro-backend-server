import mongoose, { Schema, Document } from "mongoose";

export interface ProductType extends Document {
  productId: string;
  name: string;
  description?: string;
  satellite?: string;
  dataStatus: boolean;
  aquisition_datetime: string;
  processingLevel: string;
  version: string;
  revision: string;
}

const ProductSchema: Schema<ProductType> = new Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: false },
  satellite: { type: String, required: false },
  dataStatus: { type: Boolean, required: true, default: true },
  aquisition_datetime: { type: String, required: false },
  processingLevel: { type: String, required: true },
  version: { type: String, required: false },
  revision: { type: String, required: false },
});

export default mongoose.model<ProductType>("Product", ProductSchema);
