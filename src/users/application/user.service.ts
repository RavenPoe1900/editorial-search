import BaseServiceImport from "../../_shared/service/base.service";
import User from "../domain/user.schema";

// Asegura que sea la clase, ya sea default (TS) o module.exports (CJS)
const BaseService = (BaseServiceImport as any).default || (BaseServiceImport as any);

class UserService extends (BaseService as new (...args: any[]) => any) {
  constructor() {
    super(User);
  }

  async findByEmail(email: string, includePassword = false) {
    try {
      const query = (this as any).model.findOne({ email, deletedAt: null });
      if (includePassword) query.select("+password");
      const doc = await query.exec();
      if (!doc) return { status: 404, error: "User not found" };
      return { status: 200, data: doc };
    } catch (error) {
      return (this as any).handleError(error);
    }
  }
}

export default new UserService();