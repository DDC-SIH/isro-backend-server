import bcrypt from "bcryptjs";
import mongoose, { Schema, Document, Types } from "mongoose";

export interface UserType extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const userSchema: Schema<UserType> = new Schema(
  {
    email: { type: String, required: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
  },
  { timestamps: true }
);

userSchema.pre<UserType>("save", async function (next) {
  if (this.isModified(this.password)) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

export default mongoose.model<UserType>("User", userSchema);
