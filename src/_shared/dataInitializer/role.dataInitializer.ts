import RoleService from "../../roles/application/role.service";
import RoleTypeEnum from "../enum/roles.enum";

export async function ensureEmployeeRole() {
  try {
    const roles = await RoleService.findOneByCriteria({
      name: RoleTypeEnum.EMPLOYEE,
    } as any);
    if (roles.status !== 200) {
      await RoleService.create({ name: RoleTypeEnum.EMPLOYEE } as any);
    }
  } catch (error) {
    console.error('Error ensuring "EMPLOYEE" role:', error);
    throw error;
  }
}