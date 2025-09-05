const RoleTypeEnum = {
  ADMIN: "admin",
  MANAGER: "manager",
  EMPLOYEE: "employee",
} as const;

export type RoleType = typeof RoleTypeEnum[keyof typeof RoleTypeEnum];
export default RoleTypeEnum;