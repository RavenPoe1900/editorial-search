import mongoose, { Schema, model, Model, Types, Document } from "mongoose";
import baseSchema from "../../_shared/db/baseSchema";

export interface RefreshTokenAttrs {
  jti: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  userId: Types.ObjectId;
}

export interface RefreshTokenDoc extends Document<Types.ObjectId>, RefreshTokenAttrs {
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

const refreshTokensSchema = new Schema<RefreshTokenDoc>(
  {
    jti: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: false }
);

refreshTokensSchema.index({ userId: 1 });
refreshTokensSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokensSchema.add(baseSchema);

const RefreshToken: Model<RefreshTokenDoc> =
  (mongoose.models.RefreshToken as Model<RefreshTokenDoc>) ||
  model<RefreshTokenDoc>("RefreshToken", refreshTokensSchema);

export default RefreshToken;