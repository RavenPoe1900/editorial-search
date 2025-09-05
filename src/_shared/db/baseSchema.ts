import { Schema } from "mongoose";

const baseSchema = new Schema(
  {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

(baseSchema as any).methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

(baseSchema as any).methods.isDeleted = function () {
  return this.deletedAt !== null;
};

baseSchema.pre("save", function (next) {
  if ((this as any).isModified()) {
    (this as any).updatedAt = new Date();
  }
  next();
});

export default baseSchema;