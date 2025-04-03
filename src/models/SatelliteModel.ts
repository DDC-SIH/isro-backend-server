import mongoose, { Schema, Document, Types } from "mongoose";

export interface SatelliteType extends Document {
  satelliteId: string;
  name: string;
  manufacturer?: string;
  orbit?: string;
  cogs: [Types.ObjectId];
}

const SatelliteSchema: Schema<SatelliteType> = new Schema(
  {
    satelliteId: { type: String, required: true },
    name: { type: String, required: true },
    manufacturer: { type: String, default: "ISRO" },
    orbit: { type: String, required: false, default: "unknown" },
    cogs: {
      type: [Schema.Types.ObjectId],
      ref: "COG",
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model<SatelliteType>("Satellite", SatelliteSchema);
