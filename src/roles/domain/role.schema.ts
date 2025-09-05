import { Schema, model, Document, Types } from "mongoose";
import RoleTypeEnum from "../../_shared/enum/roles.enum";
import baseSchema from "../../_shared/db/baseSchema";

export interface RoleAttrs {
  name: typeof RoleTypeEnum[keyof typeof RoleTypeEnum];
}

export interface RoleDoc extends Document<Types.ObjectId>, RoleAttrs {
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

const roleSchema = new Schema<RoleDoc>({
  name: {
    type: String,
    enum: [RoleTypeEnum.ADMIN, RoleTypeEnum.MANAGER, RoleTypeEnum.EMPLOYEE],
    required: true,
    unique: true,
  },
});

roleSchema.add(baseSchema);

export default model<RoleDoc>("Role", roleSchema);