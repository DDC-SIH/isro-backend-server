import mongoose, { Schema, Document, Types } from "mongoose";
import { CoverageType, CornerCoords, BandType } from "../types/sharedTypes";

export interface CogType extends Document {
  filename: string;
  aquisition_datetime: string;
  coverage?: CoverageType;
  filepath: string;
  coordinateSystem: any;
  size: { width: number; height: number };
  cornerCoords?: CornerCoords;
  bands: [BandType];
  product: Types.ObjectId;
}

const CogSchema: Schema<CogType> = new Schema({
  filename: { type: String, required: true },
  aquisition_datetime: { type: String, required: false },
  coverage: { type: Schema.Types.Mixed, required: false },
  filepath: { type: String, required: true },
  size: { type: Schema.Types.Mixed, required: false },
  cornerCoords: { type: Schema.Types.Mixed, required: false },
  bands: { type: Schema.Types.Mixed, required: true },
  product: { type: Schema.Types.ObjectId, ref: "Product" },
});

export default mongoose.model<CogType>("COG", CogSchema);
