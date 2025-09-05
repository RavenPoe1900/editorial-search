import BaseService from "../../_shared/service/base.service";
import Role, { RoleDoc } from "../domain/role.schema";

class RoleService extends BaseService<RoleDoc> {
  constructor() {
    super(Role);
  }
}

export default new RoleService();