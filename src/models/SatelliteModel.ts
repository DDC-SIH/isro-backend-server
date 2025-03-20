import mongoose, { Schema, Document, Types } from "mongoose";

export interface SatelliteType extends Document {
  satelliteId: string;
  name: string;
  manufacturer?: string;
  orbit?: string;
}

const SatelliteSchema: Schema<SatelliteType> = new Schema(
  {
    satelliteId: { type: String, required: true },
    name: { type: String, required: true },
    manufacturer: { type: String, required: false },
    orbit: { type: String, required: false },
  },
  { timestamps: true }
);

export default mongoose.model<SatelliteType>("Satellite", SatelliteSchema);
