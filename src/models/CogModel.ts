import mongoose, { Schema, Document, Types } from "mongoose";
import { CoverageType, CornerCoords, BandType } from "../types/sharedTypes";

export interface CogType extends Document {
  // name: string;
  // description: string;
  filename: string;
  aquisition_datetime: number;
  coverage?: CoverageType;
  filepath: string;
  coordinateSystem: any;
  size: { width: number; height: number };
  cornerCoords?: CornerCoords;
  bands: [BandType];
  // product: Types.ObjectId;
  processingLevel: string;
  version: string;
  revision: string;
  resolution?: string;
  satellite: Types.ObjectId;
  satelliteId: string;
  type: string;
}

const CogSchema: Schema<CogType> = new Schema(
  {
    // name: { type: String, required: true },
    // description: { type: String, required: true },
    filename: { type: String, required: true },
    aquisition_datetime: { type: Number, required: true },
    coverage: { type: Schema.Types.Mixed, required: false },
    filepath: { type: String, required: true },
    size: { type: Schema.Types.Mixed, required: false },
    cornerCoords: { type: Schema.Types.Mixed, required: false },
    bands: { type: Schema.Types.Mixed, required: true },
    // product: { type: Schema.Types.ObjectId, ref: "Product" },
    processingLevel: { type: String, required: true },
    satelliteId: { type: String, required: true },
    version: { type: String, required: false },
    revision: { type: String, required: false },
    resolution: { type: String, required: false },
    satellite: {
      type: Schema.Types.ObjectId,
      ref: "Satellite",
      required: true,
    },
    coordinateSystem: { type: Schema.Types.Mixed, required: false },
    type: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<CogType>("COG", CogSchema);
