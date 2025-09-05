import { Schema, model, Document, Types } from "mongoose";
import baseSchema from "../../_shared/db/baseSchema";

export interface UserAttrs {
  name?: string;
  email: string;
  phone?: string | null;
  password: string;
  role: Types.ObjectId;
  lastUsedRole?: Types.ObjectId | null;
  refreshTokens?: Types.ObjectId[];
}

export interface UserDoc extends Document<Types.ObjectId>, UserAttrs {
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

const userSchema = new Schema<UserDoc>({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true, select: true },
  role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
  lastUsedRole: { type: Schema.Types.ObjectId, ref: "Role", default: null },
  refreshTokens: [
    {
      type: Schema.Types.ObjectId,
      ref: "RefreshToken",
    },
  ],
});

userSchema.add(baseSchema);

export default model<UserDoc>("User", userSchema);